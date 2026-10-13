const {test} = require('node:test');
const assert = require('node:assert/strict');
const {cleanState, weaponCounts, applyItem, characters, weapons} = require('../dist/other/character-weapons/loadout-model.js');
const forging = require('../dist/other/forging/forging-data.js');

test('保存データを40キャラ×5武器枠に正規化し、不明なIDと範囲外を捨てる', () => {
  const state = cleanState([{character:characters[0].id, weapons:['wood-sword', 'unknown', null, 'cerberus', 'thunder-sword', 'hammer']}, null]);
  assert.equal(state.length, 40);
  assert.ok(state.every(slot => slot.weapons.length === 5));
  assert.deepEqual(state[0].weapons, ['wood-sword', null, null, 'cerberus', 'thunder-sword']);
  assert.equal(state[0].character, characters[0].id);
  assert.deepEqual(cleanState('invalid'), cleanState(null));
  assert.equal(cleanState(Array(41).fill({weapons:['hammer']})).length, 40);
});

test('配置・置換・武器移動で参考数を正確に集計する', () => {
  const state = cleanState(null);
  const put = (slot, weaponSlot, id) => applyItem(state, {slot, weaponSlot, category:'weapon'}, {id, category:'weapon'});
  assert.equal(put(0,0,'thunder-sword'), true);
  put(0,1,'thunder-sword'); put(39,4,'hammer');
  assert.equal(weaponCounts(state)['thunder-sword'], 2);
  assert.equal(weaponCounts(state).hammer, 1);
  put(0,1,'hammer');
  assert.equal(weaponCounts(state)['thunder-sword'], 1);
  assert.equal(weaponCounts(state).hammer, 2);
  const before = weaponCounts(state);
  assert.ok(applyItem(state, {slot:39, weaponSlot:4, category:'weapon'}, {id:'thunder-sword', category:'weapon', sourceSlot:0, sourceWeaponSlot:0}));
  assert.equal(state[0].weapons[0], 'hammer');
  assert.equal(state[39].weapons[4], 'thunder-sword');
  assert.deepEqual(weaponCounts(state), before);
  state[39].weapons[4] = null;
  assert.equal(weaponCounts(state)['thunder-sword'], 0);
});

test('キャラを移動すると5枠の武器も一緒に移動する', () => {
  const state = cleanState([{character:characters[0].id, weapons:['hammer']}, {character:characters[1].id, weapons:['wood-sword']}]);
  assert.ok(applyItem(state, {slot:1,category:'character'}, {id:characters[0].id,category:'character',sourceSlot:0}));
  assert.equal(state[1].character, characters[0].id);
  assert.equal(state[1].weapons[0], 'hammer');
  assert.equal(state[0].character, characters[1].id);
  assert.equal(state[0].weapons[0], 'wood-sword');
});

test('誤った種類・範囲外・古いドラッグ情報では配置を変更しない', () => {
  const state = cleanState(null), original = structuredClone(state);
  for (const target of [{slot:40,weaponSlot:0,category:'weapon'}, {slot:0,weaponSlot:5,category:'weapon'}, {slot:0,category:'character'}]) {
    assert.equal(applyItem(state,target,{id:'hammer',category:'weapon'}), false);
  }
  assert.equal(applyItem(state,{slot:0,weaponSlot:0,category:'weapon'},{id:'hammer',category:'weapon',sourceSlot:1,sourceWeaponSlot:0}),false);
  assert.deepEqual(state, original);
});

test('参考数は配置された全武器を数え、錬成の作成数制限とは独立する', () => {
  assert.deepEqual(weapons.map(w=>w.id), forging.weapons.map(w=>w.id));
  const state = cleanState(Array.from({length:40},()=>({weapons:Array(5).fill('cerberus')})));
  assert.equal(weaponCounts(state).cerberus, 200);
  assert.equal(forging.requirements({cerberus:200}).materials.アガルチウム, 3);
  assert.equal(forging.requirements({}).total, 0);
});
