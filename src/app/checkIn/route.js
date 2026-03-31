export const dynamic = "force-dynamic";
export const runtime = "edge";

const BLOCKED_MARKERS = [
  "\u63d0\u4f9b\u8fdc\u7a0b\u8bbf\u95ee\u6280\u672f",
  "\u8d1d\u9510\u82b1\u751f\u58f3",
  "\u5f00\u53d1\u73af\u5883\u4f7f\u7528",
];

function isBlockedPortalContent(text) {
  const source = String(text || "");
  if (!source) return false;
  return BLOCKED_MARKERS.some((marker) => source.includes(marker));
}

export async function GET(request) {
  const url = new URL(request.url);
  const address = String(url.searchParams.get("address") || "").trim();

  const upstream = new URL("https://36f012q246.goho.co/check");
  upstream.searchParams.set("address", address);

  const response = await fetch(upstream.toString(), {
    method: "GET",
    cache: "no-store",
  });

  const text = await response.text();

  if (isBlockedPortalContent(text)) {
    return new Response("Network error, please try again.", {
      status: 502,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }

  return new Response(text, {
    status: response.status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
