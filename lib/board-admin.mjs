import {handleBoard, json, fail, clientHash, digest, readJson} from './board.mjs';

const lifetime = 8 * 60 * 60 * 1000;
const windowMs = 15 * 60 * 1000;
const randomToken = () => [...crypto.getRandomValues(new Uint8Array(32))]
  .map(byte => byte.toString(16).padStart(2, '0')).join('');
function equalHash(a, b) {
  let difference = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

export async function handleBoardAdmin(context) {
  const {request, env} = context;
  const url = new URL(request.url), method = request.method;
  const local = url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname);
  if (url.protocol !== 'https:' && !local) return fail('HTTPSでアクセスしてください。', 403);
  const cookieName = local ? 'fefw-board-admin' : '__Host-fefw-board-admin';
  const cookie = (value, seconds) => `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${local ? '' : '; Secure'}`;
  if (!['GET', 'POST', 'PATCH'].includes(method)) {
    return json({error: '対応していない操作です。'}, 405, {Allow: 'GET, POST, PATCH'});
  }
  if (method !== 'GET') {
    if (request.headers.get('Origin') !== url.origin ||
        !['same-origin', 'none', null].includes(request.headers.get('Sec-Fetch-Site'))) {
      return fail('このページから操作してください。', 403);
    }
    if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') {
      return fail('送信形式を確認してください。', 415);
    }
  }
  if (!env.BOARD_DB || typeof env.BOARD_SECRET !== 'string' || env.BOARD_SECRET.length < 32 ||
      typeof env.BOARD_ADMIN_PASSWORD !== 'string' || env.BOARD_ADMIN_PASSWORD.length < 32) {
    return fail('管理者ログインは未設定です。', 503);
  }
  const action = url.searchParams.get('action');
  if (action && !['login', 'logout', 'session'].includes(action)) return fail('操作が正しくありません。', 400);
  if ((action === 'session' && method !== 'GET') ||
      (['login', 'logout'].includes(action) && method !== 'POST')) return fail('操作が正しくありません。', 405);
  try {
    const db = env.BOARD_DB, now = Date.now();
    const passwordTag = await clientHash(env.BOARD_SECRET, 'admin-password:' + env.BOARD_ADMIN_PASSWORD);
    if (action === 'login') {
      const address = request.headers.get('CF-Connecting-IP');
      if (!address) return fail('接続情報を確認できません。', 503);
      const client = await clientHash(env.BOARD_SECRET, 'admin-login:' + address);
      const attempt = await db.prepare(`INSERT INTO board_admin_attempts (client_hash, attempts, expires_at)
        VALUES (?, 1, ?) ON CONFLICT(client_hash) DO UPDATE SET
        attempts = CASE WHEN expires_at <= ? THEN 1 ELSE attempts + 1 END,
        expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END
        RETURNING attempts, expires_at`).bind(client, now + windowMs, now, now).first();
      await db.prepare('DELETE FROM board_admin_attempts WHERE expires_at <= ? RETURNING client_hash').bind(now).all();
      if (attempt.attempts > 5) return json({error: 'ログイン試行が多すぎます。15分ほどお待ちください。'},
        429, {'Retry-After': String(Math.ceil((attempt.expires_at - now) / 1000))});
      let data;
      try { data = await readJson(request); } catch { return fail('ログイン情報を確認してください。', 400); }
      if (!data || typeof data.password !== 'string' || data.password.length > 1024 ||
          !equalHash(await clientHash(env.BOARD_SECRET, 'admin-password:' + data.password), passwordTag)) {
        return fail('パスワードが正しくありません。', 401);
      }
      const token = randomToken();
      await db.prepare('DELETE FROM board_admin_sessions WHERE expires_at <= ? OR password_tag <> ? RETURNING token_hash')
        .bind(now, passwordTag).all();
      // Replace an existing session on this browser on successful reauthentication.
      const old = request.headers.get('Cookie')?.split(';').map(part => part.trim())
        .find(part => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
      if (old && /^[a-f0-9]{64}$/.test(old)) {
        await db.prepare('DELETE FROM board_admin_sessions WHERE token_hash = ? RETURNING token_hash')
          .bind(await digest(old)).first();
      }
      await db.prepare('INSERT INTO board_admin_sessions (token_hash, expires_at, password_tag) VALUES (?, ?, ?) RETURNING token_hash')
        .bind(await digest(token), now + lifetime, passwordTag).first();
      await db.prepare('DELETE FROM board_admin_attempts WHERE client_hash = ? RETURNING client_hash').bind(client).first();
      return json({authenticated: true}, 200, {'Set-Cookie': cookie(token, lifetime / 1000)});
    }
    const token = request.headers.get('Cookie')?.split(';').map(part => part.trim())
      .find(part => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
    const tokenHash = token && /^[a-f0-9]{64}$/.test(token) ? await digest(token) : null;
    if (action === 'logout') {
      if (tokenHash) await db.prepare('DELETE FROM board_admin_sessions WHERE token_hash = ? RETURNING token_hash')
        .bind(tokenHash).first();
      return json({authenticated: false}, 200, {'Set-Cookie': cookie('', 0)});
    }
    const session = tokenHash ? await db.prepare(
      'SELECT expires_at, password_tag FROM board_admin_sessions WHERE token_hash = ?'
    ).bind(tokenHash).first() : null;
    if (!session || session.expires_at <= now || !equalHash(session.password_tag, passwordTag)) {
      return json({error: '管理者ログインが必要です。'}, 401, {'Set-Cookie': cookie('', 0)});
    }
    if (action === 'session') return json({authenticated: true});
    return handleBoard(context, {admin: true});
  } catch {
    return fail('管理者機能を利用できません。設定を確認してください。', 500);
  }
}
