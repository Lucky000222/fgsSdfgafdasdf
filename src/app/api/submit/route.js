import { getVerifyTokenSecret, verifyVerifyToken } from '@/lib/verify-token';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

async function ensureSubmissionsSchema(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL UNIQUE,
      x_handle TEXT NOT NULL,
      tweet_link TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      verify_jti TEXT,
      verify_token_expire_at INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();

  const infoResult = await db.prepare('PRAGMA table_info(submissions)').all();
  const columns = new Set((infoResult?.results || []).map((row) => String(row?.name || '').toLowerCase()));

  if (!columns.has('verify_jti')) {
    await db.prepare('ALTER TABLE submissions ADD COLUMN verify_jti TEXT').run();
  }

  if (!columns.has('verify_token_expire_at')) {
    await db.prepare('ALTER TABLE submissions ADD COLUMN verify_token_expire_at INTEGER').run();
  }

  await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_verify_jti ON submissions(verify_jti)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_wallet_address ON submissions(wallet_address)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_submitted_at ON submissions(submitted_at)').run();
}

async function consumeTokenWithKV(kv, { tokenId, expiresAt }) {
  const key = `verify-token-consumed:${tokenId}`;
  const existing = await kv.get(key);
  if (existing) {
    return { ok: false, reason: 'TOKEN_ALREADY_USED' };
  }

  const ttlSeconds = Math.max(60, Math.ceil((expiresAt - Date.now()) / 1000));
  await kv.put(key, '1', { expirationTtl: ttlSeconds });
  return { ok: true };
}

export async function POST(request, context) {
  try {
    const body = await request.json();
    const { xHandle, tweetLink, walletAddress, verifyToken } = body;
    const normalizedAddress = String(walletAddress || '').trim();

    if (!xHandle || !tweetLink || !normalizedAddress) {
      return Response.json({
        error: 'Missing required fields',
        message: 'null'
      }, { status: 400 });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(normalizedAddress)) {
      return Response.json({
        error: 'Invalid wallet address',
        message: 'INVALID WALLET ADDRESS'
      }, { status: 400 });
    }

    const secret = getVerifyTokenSecret(context?.env?.VERIFY_TOKEN_SECRET);
    const tokenCheck = await verifyVerifyToken({
      token: verifyToken,
      address: normalizedAddress,
      secret
    });

    if (!tokenCheck.valid) {
      console.warn('Invalid verify token:', tokenCheck.reason);
      return Response.json({
        error: 'Invalid verify token',
        message: 'VERIFICATION EXPIRED, PLEASE RE-VERIFY WALLET'
      }, { status: 401 });
    }

    const db = context?.env?.DB || process.env.DB;

    if (db) {
      try {
        await ensureSubmissionsSchema(db);

        await db.prepare(
          `INSERT INTO submissions (
            wallet_address, x_handle, tweet_link, submitted_at, verify_jti, verify_token_expire_at
          ) VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
          normalizedAddress,
          xHandle.trim(),
          tweetLink.trim(),
          new Date().toISOString(),
          tokenCheck.tokenId,
          Math.floor(tokenCheck.expiresAt)
        ).run();

        console.log('Data stored to D1:', {
          walletAddress: normalizedAddress,
          xHandle: xHandle.trim(),
          tweetLink: tweetLink.trim(),
          verifyJti: tokenCheck.tokenId
        });
      } catch (dbError) {
        const message = String(dbError?.message || dbError || '');
        if (message.includes('UNIQUE constraint failed: submissions.verify_jti') || message.includes('idx_submissions_verify_jti')) {
          return Response.json({
            error: 'Token already used',
            message: 'VERIFICATION TOKEN ALREADY USED, PLEASE RE-VERIFY WALLET'
          }, { status: 401 });
        }

        if (message.includes('UNIQUE constraint failed: submissions.wallet_address')) {
          return Response.json({
            error: 'Address already submitted',
            message: 'THIS WALLET ADDRESS HAS ALREADY BEEN SUBMITTED'
          }, { status: 400 });
        }

        console.error('D1 database error:', dbError);
        return Response.json({
          error: 'Internal server error',
          message: 'SUBMIT FAILED, PLEASE TRY AGAIN LATER'
        }, { status: 500 });
      }
    } else {
      const kv = context?.env?.SUBMISSIONS_KV || process.env.SUBMISSIONS_KV;

      if (kv) {
        const existing = await kv.get(normalizedAddress);
        if (existing) {
          return Response.json({
            error: 'Address already submitted',
            message: 'THIS WALLET ADDRESS HAS ALREADY BEEN SUBMITTED'
          }, { status: 400 });
        }

        const consumeResult = await consumeTokenWithKV(kv, {
          tokenId: tokenCheck.tokenId,
          expiresAt: tokenCheck.expiresAt
        });

        if (!consumeResult.ok) {
          return Response.json({
            error: 'Token already used',
            message: 'VERIFICATION TOKEN ALREADY USED, PLEASE RE-VERIFY WALLET'
          }, { status: 401 });
        }

        const submissionData = JSON.stringify({
          walletAddress: normalizedAddress,
          xHandle: xHandle.trim(),
          tweetLink: tweetLink.trim(),
          submittedAt: new Date().toISOString(),
          verifyJti: tokenCheck.tokenId,
          verifyTokenExpireAt: tokenCheck.expiresAt
        });

        await kv.put(normalizedAddress, submissionData);
        console.log('Data stored to KV:', normalizedAddress);
      } else {
        console.error('Token/submission storage unavailable');
        return Response.json({
          error: 'Token storage unavailable',
          message: 'SERVER CONFIG ERROR, PLEASE TRY AGAIN LATER'
        }, { status: 500 });
      }
    }

    console.log('Submit successful:', {
      xHandle: xHandle.trim(),
      tweetLink: tweetLink.trim(),
      walletAddress: normalizedAddress
    });

    return Response.json({
      success: true,
      message: 'SUBMIT SUCCESS'
    }, { status: 200 });
  } catch (error) {
    console.error('Submit error:', error);
    return Response.json({
      error: 'Internal server error',
      message: 'SUBMIT FAILED, PLEASE TRY AGAIN LATER'
    }, { status: 500 });
  }
}
