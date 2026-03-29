import {
  BSC_CHAIN_ID as DEFAULT_BSC_CHAIN_ID,
  BSCSCAN_TX_LIST_URL as DEFAULT_BSCSCAN_TX_LIST_URL,
  BSC_RPC_URLS as DEFAULT_BSC_RPC_URLS,
} from "../config/bsc-network";

const BNB_WEI = 1000000000000000000n;
const METHOD_ID_DEFAULT = "0xc8aa65c1";

const ETHERSCAN_V2_API = process.env.ETHERSCAN_V2_API || "https://api.etherscan.io/v2/api";
const BSC_CHAIN_ID = String(DEFAULT_BSC_CHAIN_ID);
const PAGE_SIZE = 1000;
const MAX_PAGES = toPositiveInt(process.env.MAX_PAGES, 200);
const MAX_BSCSCAN_PAGES = toPositiveInt(process.env.MAX_BSCSCAN_PAGES, 50);
const BSCSCAN_TX_LIST_URL = DEFAULT_BSCSCAN_TX_LIST_URL;
const BSCSCAN_TX_FILTER = String(process.env.BSCSCAN_TX_FILTER || "2").trim();
const USE_ETHERSCAN_FIRST = process.env.USE_ETHERSCAN_FIRST === "1";
const FETCH_RETRIES = toPositiveInt(process.env.FETCH_RETRIES, 3);
const RETRY_BACKOFF_MS = toPositiveInt(process.env.RETRY_BACKOFF_MS, 350);
const RPC_BATCH_SIZE = toPositiveInt(process.env.RPC_BATCH_SIZE, 25);
const BSC_RPC_URLS = DEFAULT_BSC_RPC_URLS;
const HTTP_TIMEOUT_MS = toPositiveInt(process.env.HTTP_TIMEOUT_MS, 15000);

function toPositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function normalizeProxyUrl(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  return /^https?:\/\//i.test(text) ? text : `http://${text}`;
}

function getProxyUrl() {
  return normalizeProxyUrl(
    process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.PROXY_URL || ""
  );
}

const proxyUrl = getProxyUrl();

function createProxyAgent(url) {
  try {
    const req = eval("require");
    const HttpsProxyAgent = req("https-proxy-agent");
    return new HttpsProxyAgent(url);
  } catch {
    return null;
  }
}

const proxyAgent = proxyUrl ? createProxyAgent(proxyUrl) : null;
const transportCandidates = [
  { name: "direct", options: {} },
  ...(proxyAgent
    ? [
        {
          name: `proxy:${proxyUrl}`,
          options: { agent: proxyAgent },
        },
      ]
    : []),
];

let preferredTransportIndex = 0;

function mergeFetchOptions(base, extra, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const merged = {
    ...base,
    ...extra,
    signal: controller.signal,
    headers: {
      ...(base?.headers || {}),
      ...(extra?.headers || {}),
    },
  };

  return {
    merged,
    clear() {
      clearTimeout(timeout);
    },
  };
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

function isMethodSelector(text) {
  return /^0x[a-f0-9]{8}$/i.test(String(text || "").trim());
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

function toBigIntSafe(value) {
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

function isSuccessReceipt(receipt) {
  const status = String(receipt?.status || "").toLowerCase();
  return status === "0x1" || status === "1";
}

function shouldRetryStatus(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function isNoTxResponse(data) {
  const message = String(data?.message || "");
  const result = String(data?.result || "");
  return (
    message.toLowerCase().includes("no transactions found") ||
    result.toLowerCase().includes("no transactions found")
  );
}

async function fetchWithFallback(url, init = {}) {
  const order = [preferredTransportIndex, ...transportCandidates.map((_, i) => i)].filter(
    (index, pos, arr) => arr.indexOf(index) === pos
  );

  let lastError = null;
  let lastTransport = "unknown";
  let lastResponse = null;

  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt += 1) {
    for (const index of order) {
      const transport = transportCandidates[index];
      if (!transport) continue;

      let response;
      const wrapped = mergeFetchOptions(init, transport.options, HTTP_TIMEOUT_MS);
      try {
        response = await fetch(url, wrapped.merged);
      } catch (error) {
        lastError = error;
        lastTransport = transport.name;
      } finally {
        wrapped.clear();
      }

      if (!response) continue;

      preferredTransportIndex = index;
      lastResponse = response;

      if (shouldRetryStatus(response.status) && attempt < FETCH_RETRIES) {
        continue;
      }
      return response;
    }

    if (attempt < FETCH_RETRIES) {
      await sleep(RETRY_BACKOFF_MS * attempt);
    }
  }

  if (lastResponse) return lastResponse;

  const detail = lastError?.message || "fetch failed";
  throw new Error(`Network error via ${lastTransport}: ${detail}`);
}

async function fetchTxPageFromEtherscan(address, page, apiKey) {
  const params = new URLSearchParams({
    chainid: BSC_CHAIN_ID,
    module: "account",
    action: "txlist",
    address,
    page: String(page),
    offset: String(PAGE_SIZE),
    sort: "asc",
  });

  if (apiKey) params.set("apikey", apiKey);

  const response = await fetchWithFallback(`${ETHERSCAN_V2_API}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Etherscan HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.status === "1" && Array.isArray(data.result)) {
    return data.result;
  }
  if (data.status === "0") {
    if (isNoTxResponse(data)) return [];
    throw new Error(`Etherscan API error: ${data.result || data.message || "unknown error"}`);
  }

  throw new Error(`Unexpected API response: ${JSON.stringify(data)}`);
}

async function hasCalledMethodViaEtherscan(address, methodId, minBnbWei, apiKey) {
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const txs = await fetchTxPageFromEtherscan(address, page, apiKey);
    if (txs.length === 0) return false;

    for (const tx of txs) {
      const input = String(tx.input || "").toLowerCase();
      const valueWei = toBigIntSafe(tx.value);
      const isOk =
        tx.isError === "0" &&
        (tx.txreceipt_status === undefined || tx.txreceipt_status === "" || tx.txreceipt_status === "1");
      if (isOk && input.startsWith(methodId) && valueWei >= minBnbWei) {
        return true;
      }
    }
    if (txs.length < PAGE_SIZE) return false;
  }
  return false;
}

function extractBscScanRows(html) {
  const tbody = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] || "";
  const source = tbody || html;
  const rawRows = [...source.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
  const rows = [];

  for (const rowHtml of rawRows) {
    const hash = rowHtml.match(/\/tx\/(0x[a-fA-F0-9]{64})/)?.[1];
    if (!hash) continue;

    const methodHint =
      rowHtml.match(/class="td_functionNameOri"[^>]*>[\s\S]*?data-title="([^"]+)"/i)?.[1] ||
      rowHtml.match(/class="td_functionNameOri"[^>]*>[\s\S]*?title="([^"]+)"/i)?.[1] ||
      "";

    const valueHint =
      rowHtml.match(/class="td_showAmount"[^>]*data-bs-title="([0-9.,<]+)\s+BNB\b/i)?.[1] || "0";

    const direction = (rowHtml.match(/>\s*(OUT|IN)\s*</i)?.[1] || "").toUpperCase();
    const hasError = /data-bs-title="Error in Main Txn/i.test(rowHtml);

    rows.push({
      hash,
      methodHint: methodHint.trim(),
      valueWei: parseBnbToWei(valueHint, false),
      direction,
      hasError,
    });
  }

  return rows;
}

async function fetchBscScanRows(address, page) {
  const url = new URL(BSCSCAN_TX_LIST_URL);
  url.searchParams.set("a", address);
  url.searchParams.set("p", String(page));
  if (BSCSCAN_TX_FILTER) url.searchParams.set("f", BSCSCAN_TX_FILTER);

  const response = await fetchWithFallback(url.toString(), {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`BscScan HTTP ${response.status}`);
  }

  const html = await response.text();
  if (/attention required|just a moment|cf-browser-verification|captcha/i.test(html)) {
    throw new Error("BscScan anti-bot page returned");
  }
  return extractBscScanRows(html);
}

async function rpcBatchCallSingle(method, paramsList) {
  if (!Array.isArray(paramsList) || paramsList.length === 0) return [];

  let lastError = null;

  for (const rpcUrl of BSC_RPC_URLS) {
    try {
      const payload = paramsList.map((params, index) => ({
        jsonrpc: "2.0",
        id: index + 1,
        method,
        params,
      }));

      const response = await fetchWithFallback(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`RPC HTTP ${response.status} at ${rpcUrl}`);

      const data = await response.json();
      if (!Array.isArray(data)) throw new Error(`RPC ${rpcUrl}: invalid batch response`);

      const byId = new Map(data.map((item) => [item.id, item]));
      const results = [];

      for (let i = 0; i < paramsList.length; i += 1) {
        const entry = byId.get(i + 1);
        if (!entry) {
          results.push(null);
          continue;
        }
        if (entry.error) {
          throw new Error(`RPC ${rpcUrl}: ${entry.error.message || JSON.stringify(entry.error)}`);
        }
        results.push(entry.result ?? null);
      }

      return results;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`RPC request failed: ${lastError?.message || "unknown error"}`);
}

async function rpcBatchCall(method, paramsList) {
  if (!Array.isArray(paramsList) || paramsList.length === 0) return [];

  const chunks = chunkArray(paramsList, RPC_BATCH_SIZE);
  const out = [];
  for (const chunk of chunks) {
    const part = await rpcBatchCallSingle(method, chunk);
    out.push(...part);
  }
  return out;
}

async function hasCalledMethodViaBscScanRpc(address, methodId, minBnbWei) {
  const target = address.toLowerCase();

  for (let page = 1; page <= MAX_BSCSCAN_PAGES; page += 1) {
    const rows = await fetchBscScanRows(address, page);
    if (rows.length === 0) return false;

    const candidateHashes = [];

    for (const row of rows) {
      if (row.hasError) continue;
      if (row.direction && row.direction !== "OUT") continue;
      if (row.valueWei < minBnbWei) continue;

      const hint = row.methodHint.toLowerCase();
      if (isMethodSelector(hint)) {
        if (hint === methodId) candidateHashes.push(row.hash);
        continue;
      }
      candidateHashes.push(row.hash);
    }

    if (candidateHashes.length > 0) {
      const txs = await rpcBatchCall(
        "eth_getTransactionByHash",
        candidateHashes.map((hash) => [hash])
      );
      const matchedHashes = [];

      for (let i = 0; i < candidateHashes.length; i += 1) {
        const tx = txs[i];
        if (!tx) continue;
        if (String(tx.from || "").toLowerCase() !== target) continue;

        const input = String(tx.input || "").toLowerCase();
        if (!input.startsWith(methodId)) continue;

        const valueWei = toBigIntSafe(tx.value || "0x0");
        if (valueWei < minBnbWei) continue;

        matchedHashes.push(candidateHashes[i]);
      }

      if (matchedHashes.length > 0) {
        const receipts = await rpcBatchCall(
          "eth_getTransactionReceipt",
          matchedHashes.map((hash) => [hash])
        );
        if (receipts.some((receipt) => isSuccessReceipt(receipt))) {
          return true;
        }
      }
    }

    if (rows.length < 50) return false;
  }

  return false;
}

function shouldFallbackFromEtherscan(errorMessage) {
  const msg = String(errorMessage || "").toLowerCase();
  return (
    msg.includes("network error") ||
    msg.includes("free api access is not supported for this chain") ||
    msg.includes("max rate limit") ||
    msg.includes("invalid api key")
  );
}

export async function verifyBscWalletByMethod(inputAddress, options = {}) {
  const address = String(inputAddress || "").trim();
  const methodId = normalizeMethodId(options.methodId || METHOD_ID_DEFAULT);
  const minBnbInput = options.minBnb || process.env.MIN_BNB || "1";
  const minBnbWei = parseBnbToWei(minBnbInput, true);
  const apiKey = process.env.ETHERSCAN_API_KEY || process.env.BSCSCAN_API_KEY || "";

  if (!address) {
    throw new Error("MISSING ADDRESS");
  }
  if (!isValidAddress(address)) {
    throw new Error("INVALID ADDRESS");
  }

  let matched = false;

  if (apiKey && USE_ETHERSCAN_FIRST) {
    try {
      matched = await hasCalledMethodViaEtherscan(address, methodId, minBnbWei, apiKey);
    } catch (error) {
      const message = error?.message || String(error);
      if (!shouldFallbackFromEtherscan(message)) throw error;
      matched = await hasCalledMethodViaBscScanRpc(address, methodId, minBnbWei);
    }
  } else {
    matched = await hasCalledMethodViaBscScanRpc(address, methodId, minBnbWei);
  }

  return {
    address,
    methodId,
    minBnb: String(minBnbInput),
    matched,
  };
}
