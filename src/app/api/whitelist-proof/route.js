export const dynamic = "force-dynamic";
export const runtime = "edge";

import { getWhitelistProof, getWhitelistStats } from "../../../lib/whitelist-proof";

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
  const targetAddress = (url.searchParams.get("address") || "").trim();

  if (!targetAddress) {
    return badRequest("MISSING ADDRESS");
  }

  try {
    const result = getWhitelistProof(targetAddress);
    return Response.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    return badRequest(error?.message || "INVALID ADDRESS");
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const targetAddress = (body?.targetAddress || "").trim();

    if (!targetAddress) {
      return badRequest("MISSING targetAddress");
    }

    const result = getWhitelistProof(targetAddress);
    return Response.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    return badRequest(error?.message || "INVALID REQUEST");
  }
}

export async function HEAD() {
  const stats = getWhitelistStats();
  return new Response(null, {
    status: 200,
    headers: {
      "x-whitelist-count": String(stats.count),
      "x-merkle-root": stats.merkleRoot,
    },
  });
}

