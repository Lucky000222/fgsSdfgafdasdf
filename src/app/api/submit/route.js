export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function POST(request, context) {
  try {
    const body = await request.json();
    const { xHandle, tweetLink, walletAddress } = body;
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

    const db = context?.env?.DB || process.env.DB;

    if (db) {
      try {
        const existing = await db.prepare(
          'SELECT id FROM submissions WHERE wallet_address = ?'
        ).bind(normalizedAddress).first();

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
          normalizedAddress,
          xHandle.trim(),
          tweetLink.trim(),
          new Date().toISOString()
        ).run();

        console.log('Data stored to D1:', {
          walletAddress: normalizedAddress,
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
          const existing = await kv.get(normalizedAddress);
          if (existing) {
            return Response.json({
              error: 'Address already submitted',
              message: 'THIS WALLET ADDRESS HAS ALREADY BEEN SUBMITTED'
            }, { status: 400 });
          }

          const submissionData = JSON.stringify({
            walletAddress: normalizedAddress,
            xHandle: xHandle.trim(),
            tweetLink: tweetLink.trim(),
            submittedAt: new Date().toISOString()
          });

          await kv.put(normalizedAddress, submissionData);
          console.log('Data stored to KV:', normalizedAddress);
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

