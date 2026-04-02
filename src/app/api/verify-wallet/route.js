export const dynamic = 'force-dynamic';
export const runtime = 'edge';

function isAddressVerified(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return false;

  const lower = text.toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'ok' || lower === 'pass') return true;
  if (lower === 'false' || lower === '0' || lower === 'fail') return false;

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'boolean') return parsed;
    if (!parsed || typeof parsed !== 'object') return false;
    if (typeof parsed.data === 'boolean') return parsed.data;
    if (typeof parsed.result === 'boolean') return parsed.result;
    if (typeof parsed.eligible === 'boolean') return parsed.eligible;
    if (typeof parsed.valid === 'boolean') return parsed.valid;
    if (typeof parsed.success === 'boolean') return parsed.success;
  } catch {
    return false;
  }

  return false;
}

export async function GET(request) {
  // try {
  const url = new URL(request.url);
  const address = String(url.searchParams.get('address') || '').trim();

  if (!address) {
    return Response.json({
      success: false,
      error: 'MISSING_ADDRESS',
      message: 'WALLET ADDRESS IS REQUIRED'
    }, { status: 400 });
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return Response.json({
      success: false,
      error: 'INVALID_ADDRESS',
      message: 'INVALID WALLET ADDRESS'
    }, { status: 400 });
  }

  const verifyUrl = `https://test-pro.top/check?address=${encodeURIComponent(address)}`;
  let upstreamResponse;
  try {
    upstreamResponse = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        accept: '*/*',
        'accept-language': 'zh-CN,zh;q=0.9',
        'sec-ch-ua': '"Not?A_Brand";v="99", "Chromium";v="130"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'upgrade-insecure-requests': '1'
      },
      cache: 'no-store'
    });

    // try {
      const text = await upstreamResponse.text();


      if (text.includes('开发环境使用 ESM 版本') || text.includes('远程访问技术') || text.includes('贝锐花生壳') || text.includes('如需去除此页')) {
        return Response.json({
          success: false,
          message: "Time Out, please try again."
        }, { status: 500 });
      }
      return Response.json({
        success: true,
        message: text
      }, { status: 200 });
      
    } catch (error) {
      return Response.json({
        success: false,
        message: String(error)
      }, { status: 502 });
    }

    // let raw = '';
    // try {
    //   raw = await upstreamResponse.text();
    // } catch (error) {
    //   return Response.json({
    //     success: false,
    //     error: 'UPSTREAM_READ_FAILED',
    //     message: String(error)
    //   }, { status: 502 });
    // }

    // if (!upstreamResponse.ok) {
    //   return Response.json({
    //     success: false,
    //     error: 'UPSTREAM_BAD_STATUS',
    //     message: raw || `Upstream status ${upstreamResponse.status}`,
    //     status: upstreamResponse.status
    //   }, { status: 502 });
    // }

    // if (!isAddressVerified(raw)) {
    //   return Response.json({
    //     success: false,
    //     message: raw || 'false'
    //   }, { status: 400 });
    // }

    //   return Response.json({
    //     success: true,
    //     message: raw
    //   }, { status: 200 });
    // } catch (error) {
    //   return Response.json({
    //     success: false,
    //     error: 'INTERNAL_SERVER_ERROR',
    //     message: String(error)
    //   }, { status: 500 });
  }

