import { ALPHA_CONTRACT_ABI as FULL_ALPHA_CONTRACT_ABI } from "./alpha-contract-abi";

export const BSC_NETWORK_MODE_TESTNET = "1";
export const BSC_NETWORK_MODE_MAINNET = "2";
// Manual switch in code:
// "1" => TESTNET
// "2" => MAINNET
export const BSC_NETWORK_SWITCH = "1";

const TESTNET_DEFAULTS = Object.freeze({
  key: "testnet",
  mode: BSC_NETWORK_MODE_TESTNET,
  label: "TESTNET",
  chainId: 97,
  chainName: "BSC Testnet",
  nativeSymbol: "tBNB",
  explorerUrl: "https://testnet.bscscan.com",
  rpcUrls: [
    "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
    "https://bsc-testnet.publicnode.com",
  ],
  alphaContractAddress: "0x705B1b0D541054a396e4B57961da9527C5A0491C",
});

const MAINNET_DEFAULTS = Object.freeze({
  key: "mainnet",
  mode: BSC_NETWORK_MODE_MAINNET,
  label: "MAINNET",
  chainId: 56,
  chainName: "BNB Smart Chain",
  nativeSymbol: "BNB",
  explorerUrl: "https://bscscan.com",
  rpcUrls: [
    "https://bsc-dataseed.binance.org",
    "https://bsc.publicnode.com",
    "https://1rpc.io/bnb",
  ],
  alphaContractAddress: "",
});

function splitList(value) {
  const text = String(value || "").trim();
  if (!text) return [];
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function parseChainId(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function getFirstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function getActiveMode() {
  const raw = String(BSC_NETWORK_SWITCH || "").trim();
  if (raw === BSC_NETWORK_MODE_MAINNET) return BSC_NETWORK_MODE_MAINNET;
  return BSC_NETWORK_MODE_TESTNET;
}

function buildNetworkConfig(defaults) {
  const scope = defaults.key === "mainnet" ? "MAINNET" : "TESTNET";

  const chainId = parseChainId(
    getFirstDefined(
      process.env[`NEXT_PUBLIC_BSC_${scope}_CHAIN_ID`],
      process.env[`BSC_${scope}_CHAIN_ID`]
    ),
    defaults.chainId
  );

  const chainName =
    getFirstDefined(
      process.env[`NEXT_PUBLIC_BSC_${scope}_CHAIN_NAME`],
      process.env[`BSC_${scope}_CHAIN_NAME`]
    ) || defaults.chainName;

  const nativeSymbol =
    getFirstDefined(
      process.env[`NEXT_PUBLIC_BSC_${scope}_NATIVE_SYMBOL`],
      process.env[`BSC_${scope}_NATIVE_SYMBOL`]
    ) || defaults.nativeSymbol;

  const explorerUrl =
    normalizeUrl(
      getFirstDefined(
        process.env[`NEXT_PUBLIC_BSC_${scope}_EXPLORER_URL`],
        process.env[`BSC_${scope}_EXPLORER_URL`]
      )
    ) || defaults.explorerUrl;

  const rpcUrls = splitList(
    getFirstDefined(
      process.env[`NEXT_PUBLIC_BSC_${scope}_RPC_URLS`],
      process.env[`BSC_${scope}_RPC_URLS`]
    )
  );

  const alphaContractAddress =
    getFirstDefined(
      process.env[`NEXT_PUBLIC_ALPHA_${scope}_CONTRACT_ADDRESS`],
      process.env[`ALPHA_${scope}_CONTRACT_ADDRESS`]
    ) || defaults.alphaContractAddress;

  return Object.freeze({
    mode: defaults.mode,
    key: defaults.key,
    label: defaults.label,
    chainId: String(chainId),
    chainIdHex: `0x${chainId.toString(16)}`,
    chainName,
    nativeSymbol,
    explorerUrl,
    txListUrl: `${explorerUrl}/txs`,
    rpcUrls: rpcUrls.length > 0 ? rpcUrls : defaults.rpcUrls,
    alphaContractAddress,
  });
}

const TESTNET_CONFIG = buildNetworkConfig(TESTNET_DEFAULTS);
const MAINNET_CONFIG = buildNetworkConfig(MAINNET_DEFAULTS);

export const BSC_NETWORK_MODE = getActiveMode();

const activeNetworkByMode = {
  [BSC_NETWORK_MODE_TESTNET]: TESTNET_CONFIG,
  [BSC_NETWORK_MODE_MAINNET]: MAINNET_CONFIG,
};

const activeNetwork = activeNetworkByMode[BSC_NETWORK_MODE] || TESTNET_CONFIG;

const genericContractFallback = getFirstDefined(
  process.env.NEXT_PUBLIC_ALPHA_CONTRACT_ADDRESS,
  process.env.NEXT_PUBLIC_ALPHA_CONTRACT,
  process.env.ALPHA_CONTRACT_ADDRESS
);

export const BSC_NETWORKS = Object.freeze({
  [BSC_NETWORK_MODE_TESTNET]: TESTNET_CONFIG,
  [BSC_NETWORK_MODE_MAINNET]: MAINNET_CONFIG,
});

export const BSC_ACTIVE_NETWORK = activeNetwork;
export const BSC_ACTIVE_NETWORK_LABEL = activeNetwork.label;

export const ALPHA_CONTRACT_ADDRESS = activeNetwork.alphaContractAddress || genericContractFallback || "";
export const BSC_CHAIN_ID = activeNetwork.chainId;
export const BSC_CHAIN_ID_HEX = activeNetwork.chainIdHex;
export const BSC_CHAIN_NAME = activeNetwork.chainName;
export const BSC_EXPLORER_URL = activeNetwork.explorerUrl;
export const BSCSCAN_TX_LIST_URL = activeNetwork.txListUrl;
export const BSC_RPC_URLS = activeNetwork.rpcUrls;

export const ALPHA_CONTRACT_ABI = FULL_ALPHA_CONTRACT_ABI;

export const ALPHA_FUNCTION_SELECTORS = Object.freeze({
  buyWithBNB: "0x20f1fc61",
  mintWhitelist: "0x44d84381",
  swapToAL: "0x41751bb7",
  refundBNB: "0xf37050da",
  swapEnabled: "0x6ddd1713",
  refundEnabled: "0x4c4a386f",
  claimable: "0x402914f5",
  mintedBy: "0x3cef28d2",
  mintedFreeBy: "0x9fcac009",
  balanceOf: "0x70a08231",
  freeMintCap: "0xb6a0b783",
  paidMintCap: "0xfdcb8172",
  totalMintedFree: "0x65c48837",
  totalMintedPaid: "0x25bb8222",
  totalMinted: "0xa2309ff8",
  maxSupply: "0x32cb6b0c",
});

export const BSC_WALLET_NETWORK = Object.freeze({
  chainId: BSC_CHAIN_ID_HEX,
  chainName: BSC_CHAIN_NAME,
  nativeCurrency: {
    name: BSC_CHAIN_NAME,
    symbol: BSC_ACTIVE_NETWORK.nativeSymbol,
    decimals: 18,
  },
  rpcUrls: BSC_RPC_URLS,
  blockExplorerUrls: [BSC_EXPLORER_URL],
});
