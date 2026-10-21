import {boardPages} from './board-pages.mjs';
import {containsBlockedWord} from './board-blocked-words.mjs';

const pageIds = new Set(boardPages.map(page => page.id));
const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};
export const json = (value, status = 200, extra = {}) =>
  new Response(JSON.stringify(value), {status, headers: {...headers, ...extra}});
export const fail = (message, status) => json({error: message}, status);
const encoder = new TextEncoder();

export async function digest(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))]
    .map(byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function clientHash(secret, address) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
    {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(address)))]
    .map(byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function readJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('body');
  const chunks = [];
  let length = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 16384) {
      await reader.cancel();
      throw new Error('size');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function handleBoard({request, env}, {admin = false} = {}) {
  const method = request.method;
  const allowedMethods = admin ? ['GET', 'POST', 'PATCH'] : ['GET', 'POST'];
  if (!allowedMethods.includes(method)) {
    return json({error: '対応していない操作です。'}, 405, {Allow: allowedMethods.join(', ')});
  }
  const url = new URL(request.url);
  if (method !== 'GET') {
    if (request.headers.get('Origin') !== url.origin ||
        !['same-origin', 'none', null].includes(request.headers.get('Sec-Fetch-Site'))) {
      return fail('このページから操作してください。', 403);
    }
    if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') {
      return fail('送信形式を確認してください。', 415);
    }
  }
  if (!env.BOARD_DB || typeof env.BOARD_SECRET !== 'string' || env.BOARD_SECRET.length < 32) {
    return fail('掲示板は準備中です。', 503);
  }
  try {
    const db = env.BOARD_DB;
    if (method === 'GET') {
      const cursor = url.searchParams.get('before');
      const page = url.searchParams.get('page');
      const limitText = url.searchParams.get('limit') ?? '30';
      if ((page !== null && !pageIds.has(page)) || !/^(?:[1-9]|[12]\d|30)$/.test(limitText)) {
        return fail('投稿先または表示件数が正しくありません。', 400);
      }
      const limit = Number(limitText);
      if (cursor !== null && (!/^[1-9]\d{0,14}$/.test(cursor) || !Number.isSafeInteger(Number(cursor)))) {
        return fail('ページ指定が正しくありません。', 400);
      }
      const statement = db.prepare(
        'SELECT id, name, body, created_at, page, is_admin' + (admin ? ', is_hidden, is_approved' : '') +
        ' FROM board_posts WHERE id < ?' + (admin ? '' : ' AND is_hidden = 0 AND is_approved = 1') +
        (page === null ? '' : ' AND page = ?') + ' ORDER BY id DESC LIMIT ?'
      );
      const bindings = [cursor ? Number(cursor) : Number.MAX_SAFE_INTEGER];
      if (page !== null) bindings.push(page);
      bindings.push(limit + 1);
      const result = await statement.bind(...bindings).all();
      const posts = result.results.slice(0, limit);
      return json({posts, next: result.results.length > limit ? posts.at(-1).id : null});
    }
    let data;
    try { data = await readJson(request); } catch { return fail('投稿内容を確認してください。', 400); }
    if (!data || Array.isArray(data) || typeof data !== 'object') return fail('投稿内容を確認してください。', 400);
    if (!admin && (typeof data.token !== 'string' || !/^[a-f0-9]{64}$/.test(data.token))) {
      return fail('投稿用情報を確認してください。', 400);
    }
    const ownerHash = await digest(admin ? crypto.randomUUID() : data.token);
    if (method === 'PATCH') {
      if (!Number.isSafeInteger(data.id) || data.id < 1 || (typeof data.hidden !== 'boolean' && data.approved !== true)) {
        return fail('投稿指定が正しくありません。', 400);
      }
      const post = data.approved === true
        ? await db.prepare('UPDATE board_posts SET is_approved = 1 WHERE id = ? RETURNING id, is_hidden, is_approved').bind(data.id).first()
        : await db.prepare('UPDATE board_posts SET is_hidden = ? WHERE id = ? RETURNING id, is_hidden, is_approved')
          .bind(data.hidden ? 1 : 0, data.id).first();
      return post ? json({post}) : fail('対象の投稿がありません。', 404);
    }
    if (typeof data.body !== 'string' || (data.name !== undefined && typeof data.name !== 'string')) {
      return fail('名前と本文を確認してください。', 400);
    }
    const name = (data.name || '').trim() || (admin ? '管理者' : '名無し');
    const normalizedName = name.normalize('NFKC').replace(/[\s\p{Cf}\u034f\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/gu, '');
    if (!admin && normalizedName.includes('管理者')) {
      return fail('「管理者」を含む名前は使用できません。別の名前を入力してください。', 400);
    }
    const body = data.body.trim();
    const page = data.page === undefined ? 'general' : data.page;
    if (!pageIds.has(page)) return fail('投稿先を選択してください。', 400);
    if (name.length > 30 || !body || body.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(name + body)) {
      return fail('名前は30文字以内、本文は1～2000文字で入力してください。', 400);
    }
    if (containsBlockedWord(name) || containsBlockedWord(body)) {
      return fail('名前または本文に使用できない言葉が含まれています。内容を変更してください。', 400);
    }
    // Cloudflare sets this header; the local development server supplies loopback.
    // HMAC avoids storing the address itself or an easily enumerable plain hash.
    const address = request.headers.get('CF-Connecting-IP');
    if (!address) return fail('接続情報を確認できません。', 503);
    const client = await clientHash(env.BOARD_SECRET, address);
    const now = Date.now();
    // One SQL statement makes concurrent submissions observe the cooldown.
    const post = await db.prepare(`INSERT INTO board_posts (name, body, created_at, owner_hash, client_hash, page, is_admin, is_approved)
      SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (
        SELECT 1 FROM board_rate_limits WHERE client_hash = ? AND last_post > ?
      ) RETURNING id, name, body, created_at, page, is_admin`)
      .bind(name, body, now, ownerHash, client, page, admin ? 1 : 0, admin ? 1 : 0, client, now - 30000).first();
    return post ? json({post}, 201) : json({error: '続けて投稿する場合は30秒ほどお待ちください。'}, 429, {'Retry-After': '30'});
  } catch {
    // Never return SQL, bindings, tokens or exception details.
    return fail('掲示板を読み書きできませんでした。時間をおいて再度お試しください。', 500);
  }
}
