import { createVerifyToken, getVerifyTokenSecret } from '@/lib/verify-token';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const NETWORK_ERROR_MESSAGE = 'Network Error, please try again.';
const PROXY_BLOCK_MARKERS = [
  '开发环境使用 ESM 版本',
  '远程访问技术',
  '贝锐花生壳',
  '如需去除此页',
  '寮€鍙戠幆澧冧娇鐢?ESM 鐗堟湰',
  '杩滅▼璁块棶鎶€鏈?',
  '璐濋攼鑺辩敓澹?',
  '濡傞渶鍘婚櫎姝ら〉'
];

function parseVerificationResult(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return null;

  const lower = text.toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'ok' || lower === 'pass') return true;
  if (lower === 'false' || lower === '0' || lower === 'fail') return false;

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'boolean') return parsed;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.data === 'boolean') return parsed.data;
    if (typeof parsed.result === 'boolean') return parsed.result;
    if (typeof parsed.eligible === 'boolean') return parsed.eligible;
    if (typeof parsed.valid === 'boolean') return parsed.valid;
    if (typeof parsed.success === 'boolean') return parsed.success;
  } catch {
    return null;
  }

  return null;
}

export async function GET(request, context) {
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

  try {
    const upstreamResponse = await fetch(verifyUrl, {
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

    const text = await upstreamResponse.text();

    if (PROXY_BLOCK_MARKERS.some((marker) => text.includes(marker))) {
      return Response.json({
        success: false,
        message: NETWORK_ERROR_MESSAGE
      }, { status: 500 });
    }

    if (!upstreamResponse.ok) {
      return Response.json({
        success: false,
        message: NETWORK_ERROR_MESSAGE
      }, { status: 502 });
    }

    const verified = parseVerificationResult(text);
    if (verified === null) {
      return Response.json({
        success: false,
        message: NETWORK_ERROR_MESSAGE
      }, { status: 500 });
    }

    if (!verified) {
      return Response.json({
        success: true,
        data: false
      }, { status: 200 });
    }

    const secret = getVerifyTokenSecret(context?.env?.VERIFY_TOKEN_SECRET);
    const token = await createVerifyToken({
      address,
      secret
    });

    return Response.json({
      success: true,
      data: true,
      token
    }, { status: 200 });
  } catch (error) {
    return Response.json({
      success: false,
      message: NETWORK_ERROR_MESSAGE
    }, { status: 502 });
  }
}
