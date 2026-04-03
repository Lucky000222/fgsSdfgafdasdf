const encoder = new TextEncoder();
const decoder = new TextDecoder();
const DEFAULT_TOKEN_TTL_SECONDS = 5 * 60;
const FALLBACK_SECRET = 'dev-only-verify-token-secret-change-me';

function toBase64Url(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice((base64.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function sign(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return new Uint8Array(signature);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function normalizeAddress(address) {
  return String(address || '').trim().toLowerCase();
}

function createTokenId() {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

export function getVerifyTokenSecret(contextSecret) {
  const secret = String(contextSecret || process.env.VERIFY_TOKEN_SECRET || process.env.TOKEN_SECRET || '').trim();
  return secret || FALLBACK_SECRET;
}

export async function createVerifyToken({ address, secret, ttlSeconds = DEFAULT_TOKEN_TTL_SECONDS }) {
  const normalizedAddress = normalizeAddress(address);
  const ttl = Number.isFinite(ttlSeconds) ? Math.max(30, Math.floor(ttlSeconds)) : DEFAULT_TOKEN_TTL_SECONDS;
  const now = Date.now();
  const payload = {
    address: normalizedAddress,
    jti: createTokenId(),
    iat: now,
    exp: now + ttl * 1000
  };

  const payloadPart = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signaturePart = toBase64Url(await sign(secret, payloadPart));
  return `${payloadPart}.${signaturePart}`;
}

export async function verifyVerifyToken({ token, address, secret }) {
  const normalizedAddress = normalizeAddress(address);
  const rawToken = String(token || '').trim();
  if (!rawToken) {
    return { valid: false, reason: 'MISSING_TOKEN' };
  }

  const parts = rawToken.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: 'INVALID_TOKEN_FORMAT' };
  }

  const [payloadPart, signaturePart] = parts;

  let expectedSignature;
  let actualSignature;
  try {
    expectedSignature = await sign(secret, payloadPart);
    actualSignature = fromBase64Url(signaturePart);
  } catch {
    return { valid: false, reason: 'INVALID_TOKEN_SIGNATURE' };
  }

  if (!timingSafeEqual(expectedSignature, actualSignature)) {
    return { valid: false, reason: 'TOKEN_SIGNATURE_MISMATCH' };
  }

  let payload;
  try {
    payload = JSON.parse(decoder.decode(fromBase64Url(payloadPart)));
  } catch {
    return { valid: false, reason: 'INVALID_TOKEN_PAYLOAD' };
  }

  if (!payload || typeof payload !== 'object') {
    return { valid: false, reason: 'INVALID_TOKEN_PAYLOAD' };
  }

  if (typeof payload.jti !== 'string' || payload.jti.trim().length < 16) {
    return { valid: false, reason: 'INVALID_TOKEN_ID' };
  }

  if (String(payload.address || '').toLowerCase() !== normalizedAddress) {
    return { valid: false, reason: 'TOKEN_ADDRESS_MISMATCH' };
  }

  if (!Number.isFinite(payload.exp) || payload.exp <= Date.now()) {
    return { valid: false, reason: 'TOKEN_EXPIRED' };
  }

  return {
    valid: true,
    tokenId: payload.jti.trim(),
    expiresAt: payload.exp
  };
}
