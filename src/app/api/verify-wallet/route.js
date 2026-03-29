export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { verifyBscWalletByMethod } from "../../../lib/bsc-wallet-verifier";

function badRequest(message) {
  return Response.json(
    {
      success: false,
      message,
    },
    { status: 400 }
  );
}

export async function GET(request) {
  const url = new URL(request.url);
  const address = (url.searchParams.get("address") || "").trim();

  if (!address) {
    return badRequest("MISSING ADDRESS");
  }

  try {
    const result = await verifyBscWalletByMethod(address);
    return Response.json(
      {
        success: Boolean(result?.matched),
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error?.message || "VERIFY FAILED",
      },
      { status: 502 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const address = String(body?.address || "").trim();
    if (!address) {
      return badRequest("MISSING ADDRESS");
    }

    const result = await verifyBscWalletByMethod(address);
    return Response.json(
      {
        success: Boolean(result?.matched),
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error?.message || "VERIFY FAILED",
      },
      { status: 502 }
    );
  }
}
