import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleBoardAdmin} from '../lib/board-admin.mjs';
import {handleBoard} from '../lib/board.mjs';
import {openLocalD1} from '../scripts/local-d1.mjs';
import {boardPages} from '../lib/board-pages.mjs';

const password = 'test-only-admin-password-'.repeat(3);
const secret = 'test-only-board-secret-'.repeat(3);
function setup(t) {
  const db = openLocalD1(':memory:', 'board');
  t.after(() => db.close());
  const env = {BOARD_DB: db, BOARD_SECRET: secret, BOARD_ADMIN_PASSWORD: password};
  async function call(method = 'GET', data, options = {}) {
    const origin = options.origin || 'https://example.test';
    const request = new Request(origin + (options.public ? '/api/board' : '/api/board-admin') + (options.query || ''), {
      method, headers: {Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1',
        ...(options.cookie ? {Cookie: options.cookie} : {}), ...options.headers},
      ...(data === undefined ? {} : {body: typeof data === 'string' ? data : JSON.stringify(data)}),
    });
    return (options.public ? handleBoard : handleBoardAdmin)({request, env: {...env, ...options.env}});
  }
  async function login() {
    const response = await call('POST', {password}, {query: '?action=login'});
    assert.equal(response.status, 200);
    return response.headers.get('set-cookie').split(';')[0];
  }
  return {db, env, call, login};
}

test('未認証・偽Cookieは一覧・投稿・削除の管理者APIを利用できない', async t => {
  const {call, db} = setup(t);
  for (const cookie of [undefined, '__Host-fefw-board-admin=' + 'a'.repeat(64)]) {
    for (const method of ['GET', 'POST', 'DELETE']) {
      const response = await call(method, method === 'GET' ? undefined : {body: '偽装', id: 1, admin: true, is_admin: 1}, {cookie});
      assert.equal(response.status, 401);
    }
  }
  assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM board_posts').get().n, 0);
});

test('管理者投稿のバッジ・全投稿削除と通常ユーザーの権限分離', async t => {
  const {call, login, db} = setup(t);
  const token = 'a'.repeat(64);
  const spoof = await call('POST', {body: '通常投稿', name: '管理者', page: 'weapons', token, is_admin: 1, admin: true}, {public: true});
  assert.equal(spoof.status, 201);
  const ordinary = (await spoof.json()).post;
  assert.equal(ordinary.is_admin, 0);
  const cookie = await login();
  db.sqlite.exec('UPDATE board_rate_limits SET last_post = 0');
  const response = await call('POST', {body: 'お知らせ', page: 'weapons', token}, {cookie});
  assert.equal(response.status, 201);
  const post = (await response.json()).post;
  assert.equal(post.name, '管理者');
  assert.equal(post.is_admin, 1);
  const listing = await (await call('GET', undefined, {public: true, query: '?page=weapons&limit=10'})).json();
  assert.deepEqual(listing.posts.map(post => post.is_admin), [1, 0]);
  assert(!JSON.stringify(listing).includes('password'));
  assert(!JSON.stringify(listing).includes('owner_hash'));
  assert.equal((await call('DELETE', {id: post.id, token}, {public: true, cookie})).status, 405);
  assert.equal((await call('DELETE', {id: ordinary.id}, {cookie})).status, 200);
  assert.equal((await call('DELETE', {id: post.id}, {cookie})).status, 200);
  assert.equal((await call('DELETE', {id: post.id}, {cookie})).status, 404);
});

test('Cookie属性・ハッシュ保存・失効・ログアウト・秘密値変更', async t => {
  const {call, login, db} = setup(t);
  const response = await call('POST', {password}, {query: '?action=login'});
  const header = response.headers.get('set-cookie');
  for (const attribute of ['__Host-fefw-board-admin=', 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Secure', 'Max-Age=28800']) assert(header.includes(attribute));
  const cookie = header.split(';')[0];
  const rows = JSON.stringify(db.sqlite.prepare('SELECT * FROM board_admin_sessions').all());
  assert(!rows.includes(cookie.split('=')[1]));
  assert(!rows.includes(password));
  assert.equal((await call('GET', undefined, {cookie, query: '?action=session'})).status, 200);
  assert.equal((await call('GET', undefined, {cookie, env: {BOARD_ADMIN_PASSWORD: password + 'changed'}})).status, 401);
  db.sqlite.exec('UPDATE board_admin_sessions SET expires_at = 0');
  assert.equal((await call('GET', undefined, {cookie})).status, 401);
  const next = await login();
  const logout = await call('POST', {}, {cookie: next, query: '?action=logout'});
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await call('GET', undefined, {cookie: next})).status, 401);
  assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM board_admin_sessions').get().n, 0);
});

test('同時ログイン試行の制限はDBに保持し15分後に再開する', async t => {
  const {call, db} = setup(t);
  const options = {query: '?action=login'};
  const responses = await Promise.all(Array.from({length: 8}, () => call('POST', {password: 'wrong'}, options)));
  assert.deepEqual(responses.map(response => response.status).sort(), [401, 401, 401, 401, 401, 429, 429, 429]);
  assert.equal((await call('POST', {password}, options)).status, 429);
  assert(!JSON.stringify(db.sqlite.prepare('SELECT * FROM board_admin_attempts').all()).includes('192.0.2.1'));
  db.sqlite.exec('UPDATE board_admin_attempts SET expires_at = 0');
  assert.equal((await call('POST', {password}, options)).status, 200);
  assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM board_admin_attempts').get().n, 0);
});

test('CSRF・非HTTPS・不正形式・設定不足で拒否する', async t => {
  const {call, login} = setup(t);
  const cookie = await login();
  for (const headers of [{Origin: 'https://evil.test'}, {Origin: 'null'}, {'Sec-Fetch-Site': 'cross-site'}]) {
    assert.equal((await call('POST', {password}, {headers, query: '?action=login'})).status, 403);
    assert.equal((await call('POST', {}, {headers, cookie, query: '?action=logout'})).status, 403);
    assert.equal((await call('DELETE', {id: 1}, {headers, cookie})).status, 403);
  }
  assert.equal((await call('GET', undefined, {origin: 'http://example.test'})).status, 403);
  assert.equal((await call('POST', {}, {headers: {'Content-Type': 'text/plain'}, query: '?action=login'})).status, 415);
  assert.equal((await call('POST', ' '.repeat(17000), {query: '?action=login'})).status, 400);
  assert.equal((await call('GET', undefined, {env: {BOARD_ADMIN_PASSWORD: ''}})).status, 503);
  assert.equal((await call('GET', undefined, {env: {BOARD_DB: undefined}})).status, 503);
  assert.equal((await call('GET', undefined, {query: '?action=login'})).status, 405);
  assert.equal((await call('GET', undefined, {query: '?action=unknown'})).status, 400);
  const error = await call('POST', {password}, {query: '?action=login', env: {BOARD_DB: {prepare() {throw new Error(password);}}}});
  assert.equal(error.status, 500);
  assert(!(await error.text()).includes(password));
});

test('既存投稿は一般投稿のまま移行し、管理画面は投稿先・PV・通常リンクに含まない', t => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec(`CREATE TABLE board_posts(id INTEGER PRIMARY KEY, name TEXT, body TEXT, created_at INTEGER, owner_hash TEXT, client_hash TEXT, page TEXT);
    INSERT INTO board_posts VALUES(7,'既存','保持',100,'owner','client','weapons');`);
  db.exec(fs.readFileSync(new URL('../sql/board-admin.sql', import.meta.url), 'utf8'));
  assert.deepEqual({...db.prepare('SELECT * FROM board_posts').get()}, {
    id: 7, name: '既存', body: '保持', created_at: 100, owner_hash: 'owner', client_hash: 'client', page: 'weapons', is_admin: 0,
  });
  assert(!boardPages.some(page => page.id.startsWith('other/board')));
  const html = fs.readFileSync(new URL('../dist/other/board/admin/index.html', import.meta.url), 'utf8');
  assert.match(html, /noindex, nofollow, noarchive/);
  assert.match(html, /id="admin-panel" hidden/);
  assert(!html.includes('page-counter.js'));
  assert(!html.includes('data-board-page'));
  for (const file of ['index.html', 'other/index.html', 'other/board/index.html']) {
    assert(!fs.readFileSync(new URL('../dist/' + file, import.meta.url), 'utf8').includes('/board/admin'));
  }
});
