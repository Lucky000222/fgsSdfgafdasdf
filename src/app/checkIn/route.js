export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function GET(request) {
  const url = new URL(request.url);
  const address = String(url.searchParams.get("address") || "").trim();

  const upstream = new URL("http://82.157.96.45:47900/check");
  upstream.searchParams.set("address", address);

  try {
    const response = await fetch(upstream.toString(), {
      method: "GET",
      cache: "no-store",
    });

    const text = await response.text();
    const upstreamContentType =
      response.headers.get("content-type") || "text/plain; charset=utf-8";

    return new Response(text, {
      status: response.status,
      headers: {
        "content-type": upstreamContentType,
      },
    });
  } catch (error) {
    const message = String(error?.message || "UNKNOWN UPSTREAM ERROR");
    const detail = String(error?.stack || "");
    const payload = JSON.stringify(
      {
        success: false,
        error: "UPSTREAM_FETCH_FAILED",
        message,
        detail,
      },
      null,
      2
    );
    return new Response(payload, {
      status: 502,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    });
  }
}
