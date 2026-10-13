const {test} = require('node:test');
const assert = require('node:assert/strict');
const {weapons, materialNames, quantity, requirements, balance} = require('../dist/other/forging/forging-data.js');

test('武器を複数選び、共通素材を合算する。雷石は訂正後の5個を使用', () => {
  const result = requirements({'thunder-sword':2, gracida:3, 'wood-sword':2, javelin:1});
  assert.equal(result.materials.雷石, 19);
  assert.equal(result.materials.錬成石, 79);
  assert.equal(result.materials.ブルースノール, 3);
  assert.equal(result.materials.アガルチウム, 6);
  assert.equal(result.total, 107);
  assert.equal(result.gold, 14560);
  assert.ok(!Object.hasOwn(result.materials, '戦魂石'));
});

test('全26武器を1個ずつ選んだ合計を資料と照合', () => {
  assert.equal(weapons.length, 26);
  assert.equal(new Set(weapons.map(w => w.id)).size, 26);
  assert.equal(materialNames.length, 13);
  const result = requirements(Object.fromEntries(weapons.map(w => [w.id, 1])));
  assert.deepEqual(result.materials, {
    錬成石:193, ブルースノール:6, カレット:35, 雷石:8, ウーツ鋼:5, 月光石:3,
    玉鋼:36, 海星石:3, アダマント:2, 太陽石:18, オリハルコン:2, アガルチウム:5, マジックアレイ:2,
  });
  assert.equal(result.total, 318);
});

test('4ルートの採集数を合算し、余剰でも不足数を負にしない', () => {
  assert.deepEqual(balance(19, {leda:2, dietrich:3, theodora:4, kai:5}), {held:14, shortage:5});
  assert.deepEqual(balance(19, {leda:20}), {held:20, shortage:0});
  assert.deepEqual(balance(0, {leda:20}), {held:20, shortage:0});
});

test('未入力・不正値を0にし、小数・過大な入力を制限', () => {
  for (const value of ['', undefined, null, 'abc', -4, Infinity]) assert.equal(quantity(value), 0);
  assert.equal(quantity('2.9'), 2);
  assert.equal(quantity('100000000000000000000'), 9999);
  assert.equal(requirements().total, 0);
  assert.equal(requirements({'wood-sword':-1}).gold, 0);
});
