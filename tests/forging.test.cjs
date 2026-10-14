const {test} = require('node:test');
const assert = require('node:assert/strict');
const {weapons, materialNames, quantity, requirements, balance} = require('../dist/other/forging/forging-data.js');

test('武器を複数選び、共通素材を合算する。雷石は訂正後の5個を使用', () => {
  const result = requirements({'thunder-sword':2, gracida:1, 'wood-sword':2, javelin:1});
  assert.equal(result.materials.雷石, 13);
  assert.equal(result.materials.錬成石, 79);
  assert.equal(result.materials.ブルースノール, 3);
  assert.equal(result.materials.アガルチウム, 2);
  assert.equal(result.total, 97);
  assert.equal(result.gold, 10360);
  assert.ok(!Object.hasOwn(result.materials, '戦魂石'));
});

test('指定の7武器は末尾に並び、保存済みの2個以上も1個分で計算する', () => {
  const ids = ['aurora', 'solel', 'shinza', 'mahamadou', 'gracida', 'assal', 'cerberus'];
  assert.deepEqual(weapons.slice(-7).map(w => w.id), ids);
  for (const id of ids) {
    assert.equal(weapons.find(w => w.id === id).maxCount, 1);
    assert.deepEqual(requirements({[id]:9}), requirements({[id]:1}));
    assert.deepEqual(requirements({[id]:'2'}), requirements({[id]:1}));
    assert.equal(requirements({[id]:0}).total, 0);
  }
  assert.equal(requirements({'thunder-sword':3}).materials.雷石, 15);
  assert.equal(balance(0, {leda:3}).held, 3);
});

test('全57武器を1個ずつ選んだ合計を2本の動画資料と照合', () => {
  assert.equal(weapons.length, 57);
  assert.equal(new Set(weapons.map(w => w.id)).size, 57);
  assert.equal(materialNames.length, 15);
  const result = requirements(Object.fromEntries(weapons.map(w => [w.id, 1])));
  assert.deepEqual(result.materials, {
    錬成石:480, ブルースノール:25, カレット:55, 雷石:13, ウーツ鋼:10, 月光石:3,
    玉鋼:41, 海星石:8, アダマント:3, 太陽石:19, オリハルコン:2, アガルチウム:5, マジックアレイ:2,
    風石:15, 毒石:30,
  });
  assert.equal(result.total, 711);
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
