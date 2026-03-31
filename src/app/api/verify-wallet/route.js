export const dynamic = "force-dynamic";
export const runtime = "edge";

import { verifyBscWalletViaOkxExplorerOnly } from "../../../lib/bsc-wallet-verifier";

const VERIFY_CHAIN_ID = String(process.env.VERIFY_CHAIN_ID || "56").trim();
const VERIFY_METHOD_ID = String(process.env.VERIFY_METHOD_ID || "0xc8aa65c1").trim();
const VERIFY_MIN_BNB = String(process.env.VERIFY_MIN_BNB || "1").trim();

function badRequest(message) {
  return Response.json({ success: false, message }, { status: 400 });
}

function statusFromVerifyError(error) {
  const msg = String(error?.message || "").toUpperCase();
  if (msg.includes("MISSING ADDRESS") || msg.includes("INVALID ADDRESS")) {
    return 400;
  }
  if (
    msg.includes("MISSING OKX_API_KEY") ||
    msg.includes("MISSING OKX_SECRET_KEY") ||
    msg.includes("MISSING OKX_PASSPHRASE")
  ) {
    return 500;
  }
  return 502;
}

function buildRawError(error) {
  const cause = error?.cause;
  return {
    name: String(error?.name || ""),
    message: String(error?.message || ""),
    stack: String(error?.stack || ""),
    cause: cause == null ? "" : String(cause?.stack || cause?.message || cause),
  };
}

function randomHex(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signValidationToken(address) {
  const timestamp = Date.now();
  const random = randomHex(16);
  const addressHash = address.substring(0, 8) + address.substring(address.length - 8);
  const uniqueToken = `${timestamp}-${random}-${addressHash}`;
  const secret = process.env.TOKEN_SECRET || "9UIVUI9MVJNFJIEEQ43CC44PCJ4NG26CTF";

  const encoder = new TextEncoder();
  const data = encoder.encode(uniqueToken + secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signatureHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return {
    token: `${uniqueToken}-${signatureHex.substring(0, 16)}`,
    expiresAt: timestamp + 3000,
  };
}

async function verifyAndIssue(address) {
  const result = await verifyBscWalletViaOkxExplorerOnly(address, {
    chainId: VERIFY_CHAIN_ID,
    methodId: VERIFY_METHOD_ID,
    minBnb: VERIFY_MIN_BNB,
  });

  if (!result?.matched) {
    return Response.json(
      {
        success: false,
        message: "YOUR ADDRESS IS NOT ELIGIBLE",
      },
      { status: 200 }
    );
  }

  const { token, expiresAt } = await signValidationToken(address);
  return Response.json(
    {
      success: true,
      token,
      expiresAt,
    },
    { status: 200 }
  );
}

export async function GET(request) {
  const url = new URL(request.url);
  const address = (url.searchParams.get("address") || "").trim();

  if (!address) {
    return badRequest("MISSING ADDRESS");
  }

  try {
    return await verifyAndIssue(address);
  } catch (error) {
    const rawError = buildRawError(error);
    const status = statusFromVerifyError(error);
    return Response.json(
      {
        success: false,
        message: rawError.message,
        detail: rawError.stack,
        rawError,
      },
      { status }
    );
  }
}

export async function POST(request) {
  let address = "";
  try {
    const body = await request.json();
    address = String(body?.address || "").trim();

    if (!address) {
      return badRequest("MISSING ADDRESS");
    }

    return await verifyAndIssue(address);
  } catch (error) {
    const rawError = buildRawError(error);
    const status = statusFromVerifyError(error);
    return Response.json(
      {
        success: false,
        message: rawError.message,
        detail: rawError.stack,
        rawError,
      },
      { status }
    );
  }
}
