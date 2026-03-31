const BNB_WEI = 1000000000000000000n;
const METHOD_ID_DEFAULT = "0xc8aa65c1";
const BSC_CHAIN_ID = String(process.env.VERIFY_CHAIN_ID || "56").trim();

const OKX_API_BASE_URL = String(
  process.env.OKX_API_BASE_URL || process.env.OKLINK_API_BASE_URL || "https://web3.okx.com"
)
  .trim()
  .replace(/\/+$/, "");

const OKX_TXS_PATH = "/api/v6/dex/post-transaction/transactions-by-address";
const OKX_TX_DETAIL_PATH = "/api/v6/dex/post-transaction/transaction-detail-by-txhash";

const OKX_API_KEY = String(
  process.env.OKX_API_KEY || process.env.OKLINK_API_KEY || process.env.VERIFY_API_KEY || ""
).trim();
const OKX_SECRET_KEY = String(
  process.env.OKX_SECRET_KEY || process.env.OKLINK_SECRET_KEY || process.env.VERIFY_API_SECRET || ""
).trim();
const OKX_PASSPHRASE = String(
  process.env.OKX_PASSPHRASE || process.env.OKLINK_PASSPHRASE || process.env.VERIFY_API_PASSPHRASE || ""
).trim();
const OKX_PROJECT_ID = String(process.env.OKX_PROJECT_ID || process.env.OK_ACCESS_PROJECT || "").trim();

const MAX_PAGES = toPositiveInt(process.env.MAX_PAGES, 200);
const PAGE_SIZE = Math.min(100, toPositiveInt(process.env.OKX_PAGE_SIZE, 20));
const FETCH_RETRIES = toPositiveInt(process.env.FETCH_RETRIES, 3);
const RETRY_BACKOFF_MS = toPositiveInt(process.env.RETRY_BACKOFF_MS, 350);
const HTTP_TIMEOUT_MS = toPositiveInt(process.env.HTTP_TIMEOUT_MS, 15000);

function toPositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function mergeFetchOptions(base, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return {
    merged: {
      ...base,
      signal: controller.signal,
      headers: {
        ...(base?.headers || {}),
      },
    },
    clear() {
      clearTimeout(timeout);
    },
  };
}

function shouldRetryStatus(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, init = {}) {
  let lastError = null;
  let lastResponse = null;

  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt += 1) {
    let response;
    const wrapped = mergeFetchOptions(init, HTTP_TIMEOUT_MS);
    try {
      response = await fetch(url, wrapped.merged);
    } catch (error) {
      lastError = error;
    } finally {
      wrapped.clear();
    }

    if (!response) {
      if (attempt < FETCH_RETRIES) await sleep(RETRY_BACKOFF_MS * attempt);
      continue;
    }

    lastResponse = response;
    if (!shouldRetryStatus(response.status) || attempt >= FETCH_RETRIES) {
      return response;
    }

    if (attempt < FETCH_RETRIES) await sleep(RETRY_BACKOFF_MS * attempt);
  }

  if (lastResponse) return lastResponse;
  if (lastError) throw lastError;
  throw new Error("fetch failed");
}

function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function normalizeMethodId(methodId) {
  const value = String(methodId || "").toLowerCase();
  if (!/^0x[a-f0-9]{8}$/.test(value)) {
    throw new Error(`Invalid methodId: ${methodId}`);
  }
  return value;
}

function parseBnbToWei(value, strict = false) {
  const text = String(value || "").replace(/,/g, "").trim();
  if (!text || text.startsWith("<")) return 0n;
  if (!/^\d+(\.\d+)?$/.test(text)) {
    if (strict) throw new Error(`Invalid BNB amount: ${value}`);
    return 0n;
  }

  const [intPart, fracPartRaw = ""] = text.split(".");
  const fracPart = (fracPartRaw + "0".repeat(18)).slice(0, 18);
  return BigInt(intPart) * BNB_WEI + BigInt(fracPart || "0");
}

function isSuccessStatus(value) {
  const text = String(value || "").trim().toLowerCase();
  return text === "success" || text === "2" || text === "1";
}

function toLower(value) {
  return String(value || "").trim().toLowerCase();
}

function bytesToBase64(bytes) {
  if (typeof btoa === "function") {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  throw new Error("BASE64 ENCODER NOT AVAILABLE");
}

async function makeSignedHeaders(method, requestPathWithQuery, body, auth) {
  const timestamp = new Date().toISOString();
  const methodUpper = String(method || "GET").toUpperCase();
  const bodyText = body ? String(body) : "";
  const prehash = `${timestamp}${methodUpper}${requestPathWithQuery}${bodyText}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(auth.secretKey);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(prehash));
  const sign = bytesToBase64(new Uint8Array(signature));

  const headers = {
    "Content-Type": "application/json",
    "OK-ACCESS-KEY": auth.apiKey,
    "OK-ACCESS-SIGN": sign,
    "OK-ACCESS-PASSPHRASE": auth.passphrase,
    "OK-ACCESS-TIMESTAMP": timestamp,
  };

  if (auth.projectId) {
    headers["OK-ACCESS-PROJECT"] = auth.projectId;
  }

  return headers;
}

async function fetchTransactionsByAddress(address, chainId, cursor, auth) {
  const params = new URLSearchParams();
  params.set("address", address);
  params.set("addresses", address);
  params.set("chains", String(chainId));
  params.set("limit", String(PAGE_SIZE));
  if (cursor) params.set("cursor", cursor);

  const requestPathWithQuery = `${OKX_TXS_PATH}?${params.toString()}`;
  const url = `${OKX_API_BASE_URL}${requestPathWithQuery}`;

  const headers = await makeSignedHeaders("GET", requestPathWithQuery, "", auth);
  const response = await fetchWithRetry(url, { headers });

  if (!response.ok) {
    throw new Error(`OKX HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (String(payload?.code || "") !== "0") {
    throw new Error(`OKX API error: ${payload?.msg || payload?.message || "unknown error"}`);
  }

  const root = Array.isArray(payload?.data) ? payload.data[0] : null;
  const txs =
    (Array.isArray(root?.transactionList) && root.transactionList) ||
    (Array.isArray(root?.transactions) && root.transactions) ||
    [];
  const nextCursor = String(root?.cursor || "").trim();

  return {
    txs,
    nextCursor,
  };
}

async function fetchTransactionDetail(txHash, chainIndex, itype, auth) {
  const params = new URLSearchParams();
  params.set("txHash", txHash);
  params.set("chainIndex", String(chainIndex));
  if (itype !== undefined && itype !== null && String(itype).trim() !== "") {
    params.set("itype", String(itype).trim());
  }

  const requestPathWithQuery = `${OKX_TX_DETAIL_PATH}?${params.toString()}`;
  const url = `${OKX_API_BASE_URL}${requestPathWithQuery}`;

  const headers = await makeSignedHeaders("GET", requestPathWithQuery, "", auth);
  const response = await fetchWithRetry(url, { headers });

  if (!response.ok) {
    throw new Error(`OKX HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (String(payload?.code || "") !== "0") {
    throw new Error(`OKX API error: ${payload?.msg || payload?.message || "unknown error"}`);
  }

  const detail = Array.isArray(payload?.data) ? payload.data[0] : null;
  return detail || null;
}

function summaryFromMatchesTarget(tx, target) {
  const fromList = Array.isArray(tx?.from) ? tx.from : [];
  if (fromList.length === 0) return true;
  return fromList.some((item) => toLower(item?.address) === target);
}

function detailFromMatchesTarget(detail, target) {
  const fromDetails = Array.isArray(detail?.fromDetails) ? detail.fromDetails : [];
  if (fromDetails.length === 0) return true;
  return fromDetails.some((item) => toLower(item?.address) === target);
}

function maxAmountWeiFromDetail(detail, summaryTx, target) {
  let maxWei = 0n;

  const pushAmount = (value) => {
    const wei = parseBnbToWei(value, false);
    if (wei > maxWei) maxWei = wei;
  };

  pushAmount(detail?.amount);
  pushAmount(summaryTx?.amount);

  const fromDetails = Array.isArray(detail?.fromDetails) ? detail.fromDetails : [];
  for (const item of fromDetails) {
    if (toLower(item?.address) === target) {
      pushAmount(item?.amount);
    }
  }

  const fromSummary = Array.isArray(summaryTx?.from) ? summaryTx.from : [];
  for (const item of fromSummary) {
    if (toLower(item?.address) === target) {
      pushAmount(item?.amount);
    }
  }

  return maxWei;
}

async function hasCalledMethodViaOkxTxHistory(address, chainId, methodId, minBnbWei, auth) {
  const target = toLower(address);
  let cursor = "";
  let previousCursor = "";

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const pageData = await fetchTransactionsByAddress(address, chainId, cursor, auth);
    const txs = pageData.txs;

    if (!Array.isArray(txs) || txs.length === 0) {
      return false;
    }

    for (const tx of txs) {
      const txHash = String(tx?.txHash || tx?.txhash || "").trim();
      if (!txHash) continue;

      if (!isSuccessStatus(tx?.txStatus)) continue;
      if (!summaryFromMatchesTarget(tx, target)) continue;

      const summaryMethodId = String(tx?.methodId || "").trim().toLowerCase();
      if (summaryMethodId && /^0x[a-f0-9]{8}$/.test(summaryMethodId) && summaryMethodId !== methodId) {
        continue;
      }

      const detailChainIndex = String(tx?.chainIndex || chainId).trim();
      const detail = await fetchTransactionDetail(txHash, detailChainIndex, tx?.itype, auth);
      if (!detail) continue;

      if (!isSuccessStatus(detail?.txStatus)) continue;
      if (!detailFromMatchesTarget(detail, target)) continue;

      const detailMethodId = String(detail?.methodId || "").trim().toLowerCase();
      if (detailMethodId !== methodId) continue;

      const maxWei = maxAmountWeiFromDetail(detail, tx, target);
      if (maxWei < minBnbWei) continue;

      return true;
    }

    previousCursor = cursor;
    cursor = String(pageData.nextCursor || "").trim();
    if (!cursor || cursor === previousCursor) {
      return false;
    }
  }

  return false;
}

export async function verifyBscWalletViaOkxExplorerOnly(inputAddress, options = {}) {
  const address = String(inputAddress || "").trim();
  const methodId = normalizeMethodId(options.methodId || METHOD_ID_DEFAULT);
  const minBnbInput = options.minBnb || process.env.MIN_BNB || "1";
  const minBnbWei = parseBnbToWei(minBnbInput, true);
  const chainId = String(options.chainId || BSC_CHAIN_ID).trim();

  const apiKey = String(options.apiKey || OKX_API_KEY || "").trim();
  const secretKey = String(options.secretKey || OKX_SECRET_KEY || "").trim();
  const passphrase = String(options.passphrase || OKX_PASSPHRASE || "").trim();
  const projectId = String(options.projectId || OKX_PROJECT_ID || "").trim();

  if (!address) {
    throw new Error("MISSING ADDRESS");
  }
  if (!isValidAddress(address)) {
    throw new Error("INVALID ADDRESS");
  }
  if (!apiKey) {
    throw new Error("MISSING OKX_API_KEY");
  }
  if (!secretKey) {
    throw new Error("MISSING OKX_SECRET_KEY");
  }
  if (!passphrase) {
    throw new Error("MISSING OKX_PASSPHRASE");
  }

  const matched = await hasCalledMethodViaOkxTxHistory(address, chainId, methodId, minBnbWei, {
    apiKey,
    secretKey,
    passphrase,
    projectId,
  });

  return {
    address,
    chainId,
    methodId,
    minBnb: String(minBnbInput),
    matched,
  };
}
