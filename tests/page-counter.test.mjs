import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {onRequest as pageRequest} from '../functions/api/page-view.js';
import {onRequest as homeRequest} from '../functions/api/home-view.js';
import {pageIds} from '../lib/counter-pages.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
function database(initial = []) {
  const rows = new Map(initial), calls = [];
  return {rows, calls, prepare(sql) {
    assert.match(sql, /VALUES \(\?, 1, CURRENT_TIMESTAMP\)/);
    return {bind(page) {
      calls.push(page);
      return {async first() {const count = (rows.get(page) || 0) + 1; rows.set(page, count); return {count};}};
    }};
  }};
}
function context(db, page, options = {}) {
  return {env:db ? {COUNTER_DB:db} : {}, request:new Request(
    'http://127.0.0.1:8788/api/page-view' + (page === null ? '' : '?page=' + encodeURIComponent(page)),
    {method:'POST', ...options},
  )};
}

test('全ページがカウンターを1回だけ読み込み、階層によらず固定IDのみ送る', async () => {
  const source = fs.readFileSync(path.join(root, 'dist/page-counter.js'), 'utf8');
  const files = fs.readdirSync(path.join(root, 'dist'), {recursive:true}).filter(file => /(^|[\\/])index\.html$/.test(file));
  const installed = [];
  for (const file of files) {
    const html = fs.readFileSync(path.join(root, 'dist', file), 'utf8');
    assert(!html.includes('home-counter.js'));
    const tags = [...html.matchAll(/<script src="([^"]*page-counter\.js[^\"]*)" data-page="([^"]+)"><\/script>/g)];
    assert.equal(tags.length,1,file);
    const [, src, id] = tags[0];
    const expected = path.dirname(file).split(path.sep).join('/');
    assert.equal(id, expected === '.' ? 'home' : expected);
    installed.push(id);
    const scriptUrl = new URL(src, 'http://127.0.0.1:8788/' + file.split(path.sep).join('/'));
    assert.equal(scriptUrl.pathname, '/page-counter.js');
    const calls=[];
    vm.runInNewContext(source, {
      document:{currentScript:{src:scriptUrl.href,dataset:{page:id}}}, URL,
      location:{href:'http://127.0.0.1:8788/?private=DO_NOT_SEND#secret'},
      localStorage:{getItem(){throw new Error('Must not read user storage');}},
      fetch(url, options){calls.push({url,options}); return Promise.resolve();},
    });
    assert.equal(calls.length,1);
    const endpoint = new URL(calls[0].url);
    assert.equal(endpoint.pathname,'/api/page-view');
    assert.deepEqual([...endpoint.searchParams],[['page',id]]);
    assert.equal(calls[0].options.credentials,'omit');
    assert.equal(calls[0].options.referrerPolicy,'no-referrer');
    assert.equal(calls[0].options.body,undefined);
  }
  assert.deepEqual(installed.sort(), [...pageIds].sort());
});

test('HOME累計を維持し、旧APIと新APIで同じ行に加算する', async () => {
  const db=database([['home',100]]);
  for (const handler of [pageRequest,homeRequest]) {
    const response=await handler(context(db,'home'));
    assert.equal(response.status,204);
    assert.equal(await response.text(),'');
    assert.equal(response.headers.get('Cache-Control'),'no-store');
  }
  await pageRequest(context(db,'materials'));
  await pageRequest(context(db,'other/character-weapons'));
  assert.equal(db.rows.get('home'),102);
  assert.equal(db.rows.get('materials'),1);
  assert.equal(db.rows.get('other/character-weapons'),1);
});

test('不明ID・URL・SQL文字列を拒否してDBに書かない', async () => {
  const db=database();
  for (const page of [null,'','unknown','home?email=private','https://example.invalid/',"home'); DROP TABLE page_views;--"]) {
    assert.equal((await pageRequest(context(db,page))).status,400);
  }
  assert.equal(db.calls.length,0);
});

test('別OriginとPOST以外を拒否する', async () => {
  const db=database();
  for (const headers of [{Origin:'https://example.invalid'}, {'Sec-Fetch-Site':'cross-site'}, {Origin:'null'}]) {
    assert.equal((await pageRequest(context(db,'home',{headers}))).status,403);
  }
  for (const method of ['GET','HEAD','PUT','OPTIONS']) {
    const response=await pageRequest(context(db,'home',{method}));
    assert.equal(response.status,405);
    assert.equal(response.headers.get('Allow'),'POST');
  }
  assert.equal(db.calls.length,0);
  assert.equal((await pageRequest(context(db,'home',{headers:{Origin:'http://127.0.0.1:8788','Sec-Fetch-Site':'same-origin'}}))).status,204);
});

test('DB未設定や障害でも内部情報を応答・ログに出さない', async t => {
  assert.equal((await pageRequest(context(null,'home'))).status,503);
  const errors=[];
  t.mock.method(console,'error',(...args)=>errors.push(args.join(' ')));
  const db={prepare(){throw new Error('PRIVATE_DB_SECRET');}};
  const response=await pageRequest(context(db,'home'));
  assert.equal(response.status,500);
  assert(!(await response.text()).includes('PRIVATE_DB_SECRET'));
  assert(!errors.join('').includes('PRIVATE_DB_SECRET'));
});

test('計測通信に失敗しても画面側へ未処理例外を出さない', async () => {
  const source=fs.readFileSync(path.join(root,'dist/page-counter.js'),'utf8');
  vm.runInNewContext(source, {document:{currentScript:{src:'http://127.0.0.1:8788/page-counter.js',dataset:{page:'home'}}},URL,
    fetch(){return Promise.reject(new Error('Offline'));}});
  await new Promise(resolve=>setImmediate(resolve));
});
