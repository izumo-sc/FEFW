import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

test('日本語集計は17ページ・未訪問0件を表示し、既存IDと累計を変更しない', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
    db.exec("UPDATE page_views SET count=100 WHERE page='home'");
    db.prepare('INSERT INTO page_views(page,count) VALUES (?,?)').run('materials',200);
    db.prepare('INSERT INTO page_views(page,count) VALUES (?,?)').run('other/characters/kai',999);
    const before = db.prepare('SELECT * FROM page_views ORDER BY page').all();
    const sql = fs.readFileSync(new URL('../sql/page-views-ja.sql', import.meta.url), 'utf8');
    const rows = db.prepare(sql).all();
    assert.equal(rows.length,17);
    assert.equal(rows[0]['ページ名'],'復興素材管理');
    assert.equal(rows[0]['閲覧数'],200);
    assert.equal(rows[1]['ページ名'],'ホーム');
    assert.equal(rows[1]['閲覧数'],100);
    assert(rows.some(row => row['ページ名']==='個別キャラの詳細'));
    assert(!rows.some(row => row['閲覧数']===999));
    const weapons = rows.find(row => row['ページ名']==='キャラ所持武器管理');
    assert.equal(weapons['閲覧数'],0);
    assert.equal(weapons['最終更新日時（UTC）'],null);
    assert.deepEqual(db.prepare('SELECT * FROM page_views ORDER BY page').all(), before);
    assert.deepEqual(db.prepare(sql).all(), rows);
  } finally {db.close();}
});
