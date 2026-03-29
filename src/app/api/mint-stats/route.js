export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import {
  ALPHA_CONTRACT_ADDRESS,
  ALPHA_FUNCTION_SELECTORS,
  BSC_RPC_URLS,
} from "../../../config/bsc-network";

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || "").trim());
}

function padHex32(hex) {
  const clean = String(hex || "").replace(/^0x/i, "");
  return `0x${clean.padStart(64, "0")}`;
}

function encodeAddressArg(address) {
  const clean = String(address || "").trim().replace(/^0x/i, "").toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(clean)) {
    throw new Error("INVALID ADDRESS ARG");
  }
  return clean.padStart(64, "0");
}

async function rpcCall(rpcUrl, method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`RPC HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || "RPC error");
  }

  return data.result;
}

async function readUint256(contractAddress, selector) {
  let lastError = null;

  for (const rpcUrl of BSC_RPC_URLS) {
    try {
      const result = await rpcCall(rpcUrl, "eth_call", [{ to: contractAddress, data: selector }, "latest"]);
      if (typeof result !== "string" || !/^0x[0-9a-fA-F]*$/.test(result)) {
        throw new Error("Invalid eth_call result");
      }
      return BigInt(padHex32(result));
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(lastError?.message || "All RPC endpoints failed");
}

async function readUint256ByAddress(contractAddress, selector, address) {
  const data = `${selector}${encodeAddressArg(address)}`;
  return readUint256(contractAddress, data);
}

export async function GET(request) {
  try {
    const contractAddress = ALPHA_CONTRACT_ADDRESS;
    const address = request?.nextUrl?.searchParams?.get("address") || "";
    const normalizedAddress = String(address).trim();

    if (!isAddress(contractAddress)) {
      return Response.json(
        {
          success: false,
          message: "CONTRACT ADDRESS NOT CONFIGURED",
        },
        { status: 500 }
      );
    }

    const [freeMintCap, totalMintedFree, paidMintCap, totalMintedPaid, totalMinted, maxSupply] = await Promise.all([
      readUint256(contractAddress, ALPHA_FUNCTION_SELECTORS.freeMintCap),
      readUint256(contractAddress, ALPHA_FUNCTION_SELECTORS.totalMintedFree),
      readUint256(contractAddress, ALPHA_FUNCTION_SELECTORS.paidMintCap),
      readUint256(contractAddress, ALPHA_FUNCTION_SELECTORS.totalMintedPaid),
      readUint256(contractAddress, ALPHA_FUNCTION_SELECTORS.totalMinted),
      readUint256(contractAddress, ALPHA_FUNCTION_SELECTORS.maxSupply),
    ]);

    let accountData = null;
    if (isAddress(normalizedAddress)) {
      const [claimable, mintedBy, mintedFreeBy, balanceOf] = await Promise.all([
        readUint256ByAddress(
          contractAddress,
          ALPHA_FUNCTION_SELECTORS.claimable,
          normalizedAddress
        ),
        readUint256ByAddress(
          contractAddress,
          ALPHA_FUNCTION_SELECTORS.mintedBy,
          normalizedAddress
        ),
        readUint256ByAddress(
          contractAddress,
          ALPHA_FUNCTION_SELECTORS.mintedFreeBy,
          normalizedAddress
        ),
        readUint256ByAddress(
          contractAddress,
          ALPHA_FUNCTION_SELECTORS.balanceOf,
          normalizedAddress
        ),
      ]);
      accountData = {
        address: normalizedAddress,
        claimable: claimable.toString(),
        mintedBy: mintedBy.toString(),
        mintedFreeBy: mintedFreeBy.toString(),
        balanceOf: balanceOf.toString(),
      };
    }

    return Response.json(
      {
        success: true,
        data: {
          freeMintCap: freeMintCap.toString(),
          totalMintedFree: totalMintedFree.toString(),
          paidMintCap: paidMintCap.toString(),
          totalMintedPaid: totalMintedPaid.toString(),
          totalMinted: totalMinted.toString(),
          maxSupply: maxSupply.toString(),
          account: accountData,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error?.message || "FETCH MINT STATS FAILED",
      },
      { status: 502 }
    );
  }
}
