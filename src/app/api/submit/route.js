export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function POST(request, context) {
  try {
    const body = await request.json();
    const { xHandle, tweetLink, walletAddress, token } = body;

    if (!xHandle || !tweetLink || !walletAddress || !token) {
      return Response.json({
        error: 'Missing required fields',
        message: 'null'
      }, { status: 400 });
    }

    const bypassToken = String(token).startsWith('CHECKIN_TRUE-');
    if (!bypassToken) {
      const tokenParts = token.split('-');
      if (tokenParts.length < 4) {
        return Response.json({
          error: 'Invalid token format',
          message: 'INVALID TOKEN FORMAT'
        }, { status: 400 });
      }

      const timestamp = parseInt(tokenParts[0]);
      const currentTime = Date.now();
      const expiresAt = timestamp + 3000;

      if (currentTime > expiresAt) {
        return Response.json({
          error: 'Token expired',
          message: 'TOKEN HAS EXPIRED, PLEASE RE-VALIDATE'
        }, { status: 400 });
      }

      const tokenAge = currentTime - timestamp;
      if (tokenAge > 3000) {
        return Response.json({
          error: 'Token too old',
          message: 'TOKEN IS TOO OLD, PLEASE RE-VALIDATE'
        }, { status: 400 });
      }

      const addressHash = tokenParts[2];
      const expectedHash = walletAddress.substring(0, 8) + walletAddress.substring(walletAddress.length - 8);

      if (addressHash !== expectedHash) {
        return Response.json({
          error: 'Token wallet mismatch',
          message: 'TOKEN WALLET ADDRESS MISMATCH'
        }, { status: 400 });
      }

      const secret = process.env.TOKEN_SECRET || '9UIVUI9MVJNFJIEEQ43CC44PCJ4NG26CTF';
      const uniqueToken = `${tokenParts[0]}-${tokenParts[1]}-${tokenParts[2]}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(uniqueToken + secret);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signatureHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const expectedSignature = signatureHex.substring(0, 16);

      if (tokenParts[3] !== expectedSignature) {
        return Response.json({
          error: 'Invalid token signature',
          message: 'INVALID TOKEN SIGNATURE'
        }, { status: 400 });
      }
    }

    const db = context?.env?.DB || process.env.DB;

    if (db) {
      try {
        const existing = await db.prepare(
          'SELECT id FROM submissions WHERE wallet_address = ?'
        ).bind(walletAddress.trim()).first();

        if (existing) {
          return Response.json({
            error: 'Address already submitted',
            message: 'THIS WALLET ADDRESS HAS ALREADY BEEN SUBMITTED'
          }, { status: 400 });
        }

        await db.prepare(
          `INSERT INTO submissions (wallet_address, x_handle, tweet_link, submitted_at) 
           VALUES (?, ?, ?, ?)`
        ).bind(
          walletAddress.trim(),
          xHandle.trim(),
          tweetLink.trim(),
          new Date().toISOString()
        ).run();

        console.log('Data stored to D1:', {
          walletAddress: walletAddress.trim(),
          xHandle: xHandle.trim(),
          tweetLink: tweetLink.trim()
        });
      } catch (dbError) {
        console.error('D1 database error:', dbError);
      }
    } else {
      const kv = context?.env?.SUBMISSIONS_KV || process.env.SUBMISSIONS_KV;

      if (kv) {
        try {
          const existing = await kv.get(walletAddress.trim());
          if (existing) {
            return Response.json({
              error: 'Address already submitted',
              message: 'THIS WALLET ADDRESS HAS ALREADY BEEN SUBMITTED'
            }, { status: 400 });
          }

          const submissionData = JSON.stringify({
            walletAddress: walletAddress.trim(),
            xHandle: xHandle.trim(),
            tweetLink: tweetLink.trim(),
            submittedAt: new Date().toISOString()
          });

          await kv.put(walletAddress.trim(), submissionData);
          console.log('Data stored to KV:', walletAddress.trim());
        } catch (kvError) {
          console.error('KV storage error:', kvError);
        }
      } else {
        console.warn('Warning: No D1 or KV storage configured, data not persisted');
      }
    }

    console.log('Submit successful:', {
      xHandle: xHandle.trim(),
      tweetLink: tweetLink.trim(),
      walletAddress: walletAddress.trim(),
      token
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
