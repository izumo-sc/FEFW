import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {boardPages} from '../lib/board-pages.mjs';
import {handleBoard} from '../lib/board.mjs';
import {openLocalD1} from '../scripts/local-d1.mjs';

const secret = 'local-test-only-'.repeat(4), token = 'a'.repeat(64);
function request(db, method = 'GET', body, options = {}) {
  return handleBoard({
    env: {BOARD_DB: db, BOARD_SECRET: secret, ...options.env},
    request: new Request('http://127.0.0.1:4173/api/board' + (options.query || ''), {
      method, headers: {Origin: 'http://127.0.0.1:4173', 'Content-Type': 'application/json',
        'CF-Connecting-IP': '192.0.2.1', ...options.headers},
      ...(body === undefined ? {} : {body: typeof body === 'string' ? body : JSON.stringify(body)}),
    }),
  });
}
function setup(t) { const db = openLocalD1(); t.after(() => db.close()); return db; }

test('投稿・一覧は利用でき、所有者でも通常APIからは削除できない', async t => {
  const db = setup(t);
  const response = await request(db, 'POST', {name: '', body: '<img src=x onerror=alert(1)>\nテスト', token});
  assert.equal(response.status, 201);
  const {post} = await response.json();
  assert.equal(post.name, '名無し');
  assert.deepEqual(Object.keys(post).sort(), ['body', 'created_at', 'id', 'is_admin', 'name', 'page']);
  assert.equal(post.page, 'general');
  const listing = await request(db);
  assert.equal(listing.headers.get('cache-control'), 'no-store');
  const data = await listing.json();
  assert.equal(data.posts[0].body, '<img src=x onerror=alert(1)>\nテスト');
  assert.equal((await request(db, 'DELETE', {id: post.id, token: 'b'.repeat(64)})).status, 405);
  const deletion = await request(db, 'DELETE', {id: post.id, token, admin: true});
  assert.equal(deletion.status, 405);
  assert.equal(deletion.headers.get('Allow'), 'GET, POST');
  assert.equal((await (await request(db)).json()).posts.length, 1);
  assert.equal((await request(db, 'POST', {body: '連投', token})).status, 429);
});
test('禁止語は名前・本文とも保存せず、拒否後の修正投稿を妨げない', async t => {
  const db = setup(t);
  for (const fields of [{name: 'ｷﾁｶﾞｲ', body: '質問です'}, {body: 'き\u200bちがい'},
    {body: 'ＦＵＣＫ'}, {body: '殺してやる', admin: true}]) {
    const response = await request(db, 'POST', {...fields, token});
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /使用できない言葉/);
  }
  assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM board_posts').get().n, 0);
  assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM board_rate_limits').get().n, 0);
  assert.equal((await request(db, 'POST', {body: '馬殺しの弓の入手先は？', token})).status, 201);
});
test('通常投稿では管理者を含む名前を表記揺れも含めて拒否する', async t => {
  const db = setup(t);
  for (const name of ['管理者', '管理者です', '【管理者】', '管 理 者', '管\u200b理\ufe0f者']) {
    const response = await request(db, 'POST', {name, body: '投稿', token, admin: true, is_admin: 1});
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /別の名前/);
  }
  assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM board_posts').get().n, 0);
  assert.equal((await request(db, 'POST', {name: '一般ユーザー', body: '管理者への質問です', token})).status, 201);
});
test('不正形式・過大入力・別Originを拒否', async t => {
  const db = setup(t);
  for (const body of [{body: '', token}, {body: 'x'.repeat(2001), token},
    {body: 'ok', name: 'x'.repeat(31), token}, {body: 'ok', token: 'bad'}, null,
    {body: {}, token}, {body: '\0', token}, '{', ' '.repeat(17000)]) {
    assert.equal((await request(db, 'POST', body)).status, 400);
  }
  for (const headers of [{Origin: 'https://evil.invalid'}, {Origin: 'null'}, {'Sec-Fetch-Site': 'cross-site'}]) {
    assert.equal((await request(db, 'POST', {body: 'ok', token}, {headers})).status, 403);
  }
  assert.equal((await request(db, 'POST', {}, {headers: {'Content-Type': 'text/plain'}})).status, 415);
  assert.equal((await request(db, 'PUT', {})).status, 405);
  assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM board_posts').get().n, 0);
});
test('SQL文字列はデータとして保存、IP・削除トークンは平文保存しない', async t => {
  const db = setup(t);
  const body = "'); DROP TABLE page_views;--";
  assert.equal((await request(db, 'POST', {body, token})).status, 201);
  const row = db.sqlite.prepare('SELECT * FROM board_posts').get();
  assert.equal(row.body, body);
  assert.notEqual(row.owner_hash, token);
  assert(!JSON.stringify(row).includes('192.0.2.1'));
  assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM page_views').get().n, 1);
});
test('連続・並行投稿は制限し、30秒後は許可', async t => {
  const db = setup(t);
  const responses = await Promise.all(Array.from({length: 4}, () => request(db, 'POST', {body: '投稿', token})));
  assert.deepEqual(responses.map(r => r.status).sort(), [201, 429, 429, 429]);
  db.sqlite.exec('UPDATE board_rate_limits SET last_post = last_post - 31000');
  assert.equal((await request(db, 'POST', {body: '次の投稿', token})).status, 201);
});
test('ページングで重複せず全件を取得', async t => {
  const db = setup(t);
  const insert = db.sqlite.prepare('INSERT INTO board_posts(name,body,created_at,owner_hash,client_hash) VALUES(?,?,?,?,?)');
  for (let n = 1; n <= 35; n++) insert.run('名無し', String(n), n, 'hash', 'test');
  const first = await (await request(db)).json();
  assert.equal(first.posts.length, 30); assert.equal(first.next, 6);
  const second = await (await request(db, 'GET', undefined, {query: '?before=' + first.next})).json();
  assert.equal(second.posts.length, 5); assert.equal(second.next, null);
  assert.equal(new Set([...first.posts, ...second.posts].map(p => p.id)).size, 35);
  assert.equal((await request(db, 'GET', undefined, {query: '?before=-1'})).status, 400);
});
test('指定ページの最新10件だけを返し、全体一覧・絞り込みのページングも保つ', async t => {
  const db = setup(t);
  const insert = db.sqlite.prepare('INSERT INTO board_posts(name,body,created_at,owner_hash,client_hash,page) VALUES(?,?,?,?,?,?)');
  for (let n = 1; n <= 35; n++) insert.run('名無し', String(n), n, 'hash', 'test', n % 2 ? 'weapons' : 'materials');
  const first = await (await request(db, 'GET', undefined, {query: '?page=weapons&limit=10'})).json();
  assert.equal(first.posts.length, 10);
  assert(first.posts.every(post => post.page === 'weapons'));
  assert.deepEqual(first.posts.map(post => post.id), [35, 33, 31, 29, 27, 25, 23, 21, 19, 17]);
  const second = await (await request(db, 'GET', undefined, {query: '?page=weapons&limit=10&before=' + first.next})).json();
  assert.equal(second.posts.length, 8);
  assert.equal(second.next, null);
  const all = await (await request(db)).json();
  assert.equal(all.posts.length, 30);
  assert.deepEqual(new Set(all.posts.map(post => post.page)), new Set(['weapons', 'materials']));
});
test('投稿先を保存し、ページを変えても連投制限を回避できない', async t => {
  const db = setup(t);
  const result = await request(db, 'POST', {body: 'キャラ一覧宛て', page: 'other/characters', token});
  assert.equal(result.status, 201);
  assert.equal((await result.json()).post.page, 'other/characters');
  assert.equal((await request(db, 'POST', {body: '別ページ', page: 'weapons', token})).status, 429);
  for (const page of ['other/characters/kai', 'other/board', 'unknown', '../weapons', "x' OR 1=1--", null, {}]) {
    assert.equal((await request(db, 'POST', {body: '不正な投稿先', page, token})).status, 400);
  }
  for (const query of ['?page=other%2Fcharacters%2Fkai', '?page=unknown', '?limit=31', '?limit=-1', '?limit=0', '?limit=1.5']) {
    assert.equal((await request(db, 'GET', undefined, {query})).status, 400);
  }
});
test('既存DBの移行で投稿本文・日時・削除情報・連投記録を保持する', t => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec(`CREATE TABLE board_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, body TEXT NOT NULL,
    created_at INTEGER NOT NULL, owner_hash TEXT NOT NULL, client_hash TEXT NOT NULL
  ); CREATE TABLE board_rate_limits(client_hash TEXT PRIMARY KEY, last_post INTEGER NOT NULL);`);
  db.prepare('INSERT INTO board_posts VALUES(?,?,?,?,?,?)').run(42, '既存投稿', '本文', 1000, 'owner', 'client');
  db.prepare('INSERT INTO board_rate_limits VALUES(?,?)').run('client', 1000);
  const before = db.prepare('SELECT * FROM board_posts').get();
  db.exec(fs.readFileSync(new URL('../sql/board-pages.sql', import.meta.url), 'utf8'));
  const after = db.prepare('SELECT * FROM board_posts').get();
  assert.equal(after.page, 'general');
  delete after.page;
  assert.deepEqual(after, before);
  assert.equal(db.prepare('SELECT last_post FROM board_rate_limits').get().last_post, 1000);
});
test('非表示への移行で既存投稿を公開状態のまま保持する', t => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec('CREATE TABLE board_posts(id INTEGER PRIMARY KEY, body TEXT); INSERT INTO board_posts VALUES(1, \'既存本文\');');
  db.exec(fs.readFileSync(new URL('../sql/board-hidden.sql', import.meta.url), 'utf8'));
  assert.deepEqual({...db.prepare('SELECT * FROM board_posts').get()}, {id: 1, body: '既存本文', is_hidden: 0});
});

test('非表示投稿を飛ばして公開投稿だけをページングする', async t => {
  const db = setup(t);
  const insert = db.sqlite.prepare('INSERT INTO board_posts(name,body,created_at,owner_hash,client_hash,is_hidden) VALUES(?,?,?,?,?,?)');
  for (let n = 1; n <= 35; n++) insert.run('名無し', String(n), n, 'hash', 'test', n % 2);
  const first = await (await request(db, 'GET', undefined, {query: '?limit=10'})).json();
  assert.deepEqual(first.posts.map(p => p.id), [34, 32, 30, 28, 26, 24, 22, 20, 18, 16]);
  const next = await (await request(db, 'GET', undefined, {query: '?limit=10&before=' + first.next})).json();
  assert.deepEqual(next.posts.map(p => p.id), [14, 12, 10, 8, 6, 4, 2]);
  assert.equal(next.next, null);
});

test('18ページに表示欄を設置し、個別キャラは一覧ページに統一する', () => {
  assert.equal(boardPages.length, 19);
  assert(boardPages.some(page => page.id === 'other/characters'));
  assert(!boardPages.some(page => page.id.startsWith('other/characters/')));
  const root = new URL('../dist/', import.meta.url);
  for (const page of boardPages.filter(page => page.id !== 'general')) {
    const file = new URL((page.id === 'home' ? '' : page.id + '/') + 'index.html', root);
    const html = fs.readFileSync(file, 'utf8');
    assert.equal((html.match(/id="page-board-posts"/g) || []).length, 1, page.id);
    assert(html.includes(`data-board-page="${page.id}"`), page.id);
    assert(html.split('</header>')[0].includes(`/other/board/?page=${encodeURIComponent(page.id)}`), page.id);
  }
  for (const dir of fs.readdirSync(new URL('other/characters/', root), {withFileTypes: true}).filter(entry => entry.isDirectory())) {
    assert(!fs.readFileSync(new URL(`other/characters/${dir.name}/index.html`, root), 'utf8').includes('page-board'));
  }
});
test('未設定・DB障害で内部情報を漏らさない', async () => {
  assert.equal((await request(undefined)).status, 503);
  assert.equal((await request({}, 'GET', undefined, {env: {BOARD_SECRET: ''}})).status, 503);
  const response = await request({prepare() { throw new Error('PRIVATE_SECRET_SQL'); }});
  assert.equal(response.status, 500);
  assert(!(await response.text()).includes('PRIVATE_SECRET_SQL'));
});
test('掲示板は専用DBだけを使い、未設定でも閲覧数DBへ代替接続しない', async t => {
  const db = openLocalD1(':memory:', 'board');
  t.after(() => db.close());
  const counter = {prepare() { assert.fail('閲覧数DBにアクセスしてはいけない'); }};
  assert.equal((await request(db, 'POST', {body: '専用DBへ保存', token}, {env: {COUNTER_DB: counter}})).status, 201);
  assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM board_posts').get().n, 1);
  assert.equal(db.sqlite.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='page_views'").get().n, 0);
  assert.equal((await request(undefined, 'GET', undefined, {env: {COUNTER_DB: counter}})).status, 503);
});
test('掲示板には検索除外がありPV集計に出ない', () => {
  const html = fs.readFileSync(new URL('../dist/other/board/index.html', import.meta.url), 'utf8');
  assert.match(html, /name="robots" content="noindex, nofollow, noarchive"/);
  assert(!html.includes('page-counter.js'));
  const js = fs.readFileSync(new URL('../dist/other/board/board.js', import.meta.url), 'utf8');
  assert(!js.includes('innerHTML'));
});

for (const admin of [false, true]) test(`${admin ? '管理者' : '通常'}画面の非表示権限・絞り込み・投稿先指定`, async () => {
  class Element {
    constructor() { this.children = []; this.dataset = {}; this.attributes = {}; this.handlers = {}; }
    append(...children) { for (const child of children) { this.children.push(child); child.parent = this; } }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.handlers[name] = handler; }
    replaceChildren() { this.children = []; }
    remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
    reportValidity() { return true; }
  }
  const elements = new Map();
  const storage = new Map([['fefw-board-owner-v1', token], ['fefw-board-posts-v1', '[1]']]);
  const calls = [];
  const document = {
    currentScript: {dataset: {boardAdmin: String(admin)}},
    getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); },
    createElement() { return new Element(); },
  };
  const window = {BOARD_PAGES: boardPages, location: {search: ''}};
  vm.runInNewContext(fs.readFileSync(new URL('../dist/other/board/board.js', import.meta.url), 'utf8'), {
    document, crypto, URLSearchParams, window,
    localStorage: {getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value)},
    async fetch(url, options) {
      calls.push({url, ...options});
      return {ok: true, async json() {
        return options.method === 'PATCH' ? {post: {id: 1, is_hidden: 1}} : options.method === 'POST' ? {post: {id: 2}} :
          {posts: [{id: 1, name: 'テスト', body: '<script>literal</script>', created_at: 1}], next: null};
      }};
    },
  });
  if (admin) window.startAdminBoard();
  await new Promise(resolve => setImmediate(resolve));
  const article = elements.get('posts').children[0];
  const button = article.children[2], cancel = article.children[3];
  assert.equal(article.children[1].textContent, '<script>literal</script>');
  if (admin) {
    await button.onclick();
    assert.equal(button.textContent, '非表示を確定');
    assert.equal(cancel.hidden, false);
    assert.equal(calls.length, 1);
    cancel.onclick();
    assert.equal(button.textContent, '非表示');
    await button.onclick();
    await button.onclick();
    assert.equal(calls.length, 3);
    assert.equal(calls[1].method, 'PATCH');
    assert.equal(calls[1].url, '/api/board-admin');
    assert.equal(calls[1].credentials, 'same-origin');
    assert.deepEqual(JSON.parse(calls[1].body), {id: 1, hidden: true});
    assert.equal(elements.get('posts').children.length, 1);
    assert.equal(elements.get('board-status').textContent, '非表示にしました。');
  } else {
    // Old ownership records must not make a delete button reappear.
    assert.equal(article.children.length, 2);
    assert.equal(calls.some(call => call.method === 'DELETE'), false);
  }
  elements.get('filter-page').value = 'weapons';
  await elements.get('filter-page').handlers.change();
  assert.equal(calls.at(-1).url, `${admin ? '/api/board-admin' : '/api/board'}?page=weapons`);
  elements.get('post-page').value = 'other/characters';
  elements.get('post-body').value = 'キャラへの投稿';
  document.getElementById('post-name').value = '名前';
  await elements.get('post-form').handlers.submit({preventDefault() {}});
  const posted = JSON.parse(calls.find(call => call.method === 'POST').body);
  assert.equal(posted.page, 'other/characters');
  assert.equal(posted.body, 'キャラへの投稿');
  assert.equal(elements.get('filter-page').value, 'other/characters');
  assert.equal(elements.get('post-body').value, '');
});

test('各ページの表示は本文をHTMLにせず、そのページの10件までに制限する', async () => {
  const element = () => ({children: [], append(...children) {this.children.push(...children);}, replaceChildren() {this.children = [];}});
  const status = element(), list = element(), calls = [];
  const posts = [
    {name: '別ページ', page: 'materials', body: '非表示', created_at: 1},
    ...Array.from({length: 12}, (_, i) => ({name: '投稿' + i, is_admin: i === 0 ? 1 : 0, page: 'weapons', body: '<script>文字列</script>', created_at: i + 1})),
  ];
  vm.runInNewContext(fs.readFileSync(new URL('../dist/other/board/page-board.js', import.meta.url), 'utf8'), {
    document: {currentScript: {dataset: {boardPage: 'weapons'}},
      getElementById: id => id === 'page-board-status' ? status : list, createElement: element},
    async fetch(url) { calls.push(url); return {ok: true, async json() { return {posts}; }}; },
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ['/api/board?page=weapons&limit=10']);
  assert.equal(list.children.length, 10);
  assert.equal(list.children[0].children[1].textContent, '<script>文字列</script>');
  assert.equal(list.children[0].children[0].children[0].textContent, '投稿0');
  assert.equal(list.children[0].children[0].children[2].textContent, '管理者');
  assert.equal(list.children[1].children[0].children.length, 2);
});
