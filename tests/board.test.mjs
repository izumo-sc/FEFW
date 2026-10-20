import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
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

test('投稿・一覧・所有者による削除。非公開フィールドは返さない', async t => {
  const db = setup(t);
  const response = await request(db, 'POST', {name: '', body: '<img src=x onerror=alert(1)>\nテスト', token});
  assert.equal(response.status, 201);
  const {post} = await response.json();
  assert.equal(post.name, '名無し');
  assert.deepEqual(Object.keys(post).sort(), ['body', 'created_at', 'id', 'name']);
  const listing = await request(db);
  assert.equal(listing.headers.get('cache-control'), 'no-store');
  const data = await listing.json();
  assert.equal(data.posts[0].body, '<img src=x onerror=alert(1)>\nテスト');
  assert.equal((await request(db, 'DELETE', {id: post.id, token: 'b'.repeat(64)})).status, 404);
  assert.equal((await request(db, 'DELETE', {id: post.id, token})).status, 200);
  assert.equal((await (await request(db)).json()).posts.length, 0);
  // Deletion must not bypass the rate limit.
  assert.equal((await request(db, 'POST', {body: '連投', token})).status, 429);
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
test('隠し画面には検索除外があり通常メニューとPV集計に出ない', () => {
  const html = fs.readFileSync(new URL('../dist/other/board/index.html', import.meta.url), 'utf8');
  assert.match(html, /name="robots" content="noindex, nofollow, noarchive"/);
  assert(!html.includes('page-counter.js'));
  for (const file of ['dist/index.html', 'dist/other/index.html']) {
    assert(!fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8').includes('/board/'));
  }
  const js = fs.readFileSync(new URL('../dist/other/board/board.js', import.meta.url), 'utf8');
  assert(!js.includes('innerHTML'));
});

test('削除はページ内確認後だけ送信し、キャンセル時には送信しない', async () => {
  class Element {
    constructor() { this.children = []; this.dataset = {}; this.attributes = {}; this.handlers = {}; }
    append(...children) { for (const child of children) { this.children.push(child); child.parent = this; } }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.handlers[name] = handler; }
    replaceChildren() { this.children = []; }
    remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
  }
  const elements = new Map();
  const storage = new Map([['fefw-board-owner-v1', token], ['fefw-board-posts-v1', '[1]']]);
  const calls = [];
  const document = {
    getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); },
    createElement() { return new Element(); },
  };
  vm.runInNewContext(fs.readFileSync(new URL('../dist/other/board/board.js', import.meta.url), 'utf8'), {
    document, crypto,
    localStorage: {getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value)},
    async fetch(url, options) {
      calls.push({url, ...options});
      return {ok: true, async json() {
        return options.method === 'DELETE' ? {deleted: 1} :
          {posts: [{id: 1, name: 'テスト', body: '<script>literal</script>', created_at: 1}], next: null};
      }};
    },
  });
  await new Promise(resolve => setImmediate(resolve));
  const article = elements.get('posts').children[0];
  const button = article.children[2], cancel = article.children[3];
  assert.equal(article.children[1].textContent, '<script>literal</script>');
  await button.onclick();
  assert.equal(button.textContent, '削除を確定');
  assert.equal(cancel.hidden, false);
  assert.equal(calls.length, 1);
  cancel.onclick();
  assert.equal(button.textContent, '削除');
  await button.onclick();
  await button.onclick();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].method, 'DELETE');
  assert.deepEqual(JSON.parse(calls[1].body), {id: 1, token});
  assert.equal(elements.get('posts').children.length, 0);
  assert.equal(elements.get('board-status').textContent, '削除しました。');
});
