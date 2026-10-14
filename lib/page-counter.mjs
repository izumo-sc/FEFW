import {pageIds} from './counter-pages.mjs';

function errorResponse(error, status, extraHeaders = {}) {
  return Response.json({error}, {status, headers: {'Cache-Control':'no-store', ...extraHeaders}});
}

export async function recordPageView(context, page) {
  const request = context.request;
  if (request.method !== 'POST') return errorResponse('Method not allowed.', 405, {Allow:'POST'});
  const origin = request.headers.get('Origin');
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  if ((origin && origin !== new URL(request.url).origin) ||
      (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite))) {
    return errorResponse('Cross-origin requests are not allowed.', 403);
  }
  if (!pageIds.has(page)) return errorResponse('Unknown page.', 400);
  if (!context.env.COUNTER_DB) return errorResponse('Counter is unavailable.', 503);
  try {
    const row = await context.env.COUNTER_DB.prepare(
      `INSERT INTO page_views (page, count, updated_at)
       VALUES (?, 1, CURRENT_TIMESTAMP)
       ON CONFLICT(page) DO UPDATE SET
         count = count + 1,
         updated_at = CURRENT_TIMESTAMP
       RETURNING count`,
    ).bind(page).first();
    const count = Number(row?.count);
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid counter value');
    return new Response(null, {status:204, headers:{'Cache-Control':'no-store'}});
  } catch {
    console.error('Failed to update page view count');
    return errorResponse('Unable to update the view count.', 500);
  }
}
