const responseHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: responseHeaders });
}

function emptyResponse(status = 204) {
  return new Response(null, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isSameOriginRequest(request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("Origin");
  const fetchSite = request.headers.get("Sec-Fetch-Site");

  if (origin && origin !== requestUrl.origin) return false;
  return !fetchSite || fetchSite === "same-origin" || fetchSite === "same-site" || fetchSite === "none";
}

export async function onRequestPost(context) {
  if (!isSameOriginRequest(context.request)) {
    return json({ error: "Cross-origin requests are not allowed." }, 403);
  }

  if (!context.env.COUNTER_DB) {
    return json({ error: "COUNTER_DB is not configured." }, 503);
  }

  try {
    const row = await context.env.COUNTER_DB.prepare(
      `INSERT INTO page_views (page, count, updated_at)
       VALUES ('home', 1, CURRENT_TIMESTAMP)
       ON CONFLICT(page) DO UPDATE SET
         count = count + 1,
         updated_at = CURRENT_TIMESTAMP
       RETURNING count`,
    ).first();

    const count = Number(row?.count);
    if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid counter value");
    return emptyResponse();
  } catch (error) {
    console.error("Failed to update HOME view count", error);
    return json({ error: "Unable to update the view count." }, 500);
  }
}
