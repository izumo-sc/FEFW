const {test} = require('node:test');
const assert = require('node:assert/strict');
const {cleanState, weaponCounts, applyItem, characters, weapons, classes, weaponTypes, canEquip} = require('../dist/other/character-weapons/loadout-model.js');
const forging = require('../dist/other/forging/forging-data.js');

test('救世主を旧チーム枠から固定枠へ移し、兵種と武器を保持して二重計上しない', () => {
  const old = Array.from({length:40},()=>({character:null,weapons:[]}));
  old[16] = {character:'kyuuseishu',classId:'class-8',weapons:['thunder-sword','wood-spear']};
  const snapshot = structuredClone(old);
  const migrated = cleanState(old);
  assert.equal(migrated[40].character,'kyuuseishu');
  assert.equal(migrated[40].classId,'class-8');
  assert.deepEqual(migrated[40].weapons.slice(0,2),['thunder-sword','wood-spear']);
  assert.deepEqual(migrated[16],{character:null,classId:null,weapons:Array(5).fill(null)});
  assert.equal(weaponCounts(migrated)['thunder-sword'],1);
  assert.deepEqual(cleanState(JSON.parse(JSON.stringify(migrated))),migrated);
  assert.deepEqual(old,snapshot);
});

test('救世主固定枠のキャラは変更・チーム移動不可、兵種と武器は編集可能', () => {
  const state=cleanState(null);
  assert.equal(state[40].character,'kyuuseishu');
  for (const [target,payload] of [
    [{slot:0,category:'character'},{id:'kyuuseishu',category:'character'}],
    [{slot:0,category:'character'},{id:'kyuuseishu',category:'character',sourceSlot:40}],
    [{slot:40,category:'character'},{id:'kai',category:'character'}],
  ]) assert.equal(applyItem(state,target,payload),false);
  assert.equal(applyItem(state,{slot:40,category:'class'},{id:'class-8',category:'class'}),true);
  assert.equal(applyItem(state,{slot:40,weaponSlot:0,category:'weapon'},{id:'thunder-sword',category:'weapon'}),true);
  assert.equal(weaponCounts(state)['thunder-sword'],1);
  assert.equal(applyItem(state,{slot:40,weaponSlot:1,category:'weapon'},{id:'wood-bow',category:'weapon'}),false);
});

test('保存データをチーム40枠と救世主固定枠に正規化し、不明なIDと範囲外を捨てる', () => {
  const state = cleanState([{character:characters[1].id, weapons:['wood-sword', 'unknown', null, 'cerberus', 'thunder-sword', 'hammer']}, null]);
  assert.equal(state.length, 41);
  assert.ok(state.every(slot => slot.weapons.length === 5));
  assert.deepEqual(state[0].weapons, ['wood-sword', null, null, 'cerberus', 'thunder-sword']);
  assert.equal(state[0].character, characters[1].id);
  assert.deepEqual(cleanState('invalid'), cleanState(null));
  assert.equal(cleanState(Array(42).fill({weapons:['hammer']})).length, 41);
});

test('配置・置換・武器移動で参考数を正確に集計する', () => {
  const state = cleanState(null);
  for (const slot of state) slot.classId = 'class-1';
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
  const state = cleanState([{character:characters[1].id, weapons:['hammer']}, {character:characters[2].id, weapons:['wood-sword']}]);
  assert.ok(applyItem(state, {slot:1,category:'character'}, {id:characters[1].id,category:'character',sourceSlot:0}));
  assert.equal(state[1].character, characters[1].id);
  assert.equal(state[1].weapons[0], 'hammer');
  assert.equal(state[0].character, characters[2].id);
  assert.equal(state[0].weapons[0], 'wood-sword');
});

test('誤った種類・範囲外・古いドラッグ情報では配置を変更しない', () => {
  const state = cleanState(null), original = structuredClone(state);
  for (const target of [{slot:41,weaponSlot:0,category:'weapon'}, {slot:0,weaponSlot:5,category:'weapon'}, {slot:0,category:'character'}]) {
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

test('同一キャラは別チームでも重複配置できず、解除後は再配置できる', () => {
  const state = cleanState(null), id = characters[1].id;
  const place = slot => applyItem(state, {slot,category:'character'}, {id,category:'character'});
  assert.equal(place(0), true);
  for (const slot of [1,8,16,24,32]) assert.equal(place(slot), false);
  assert.equal(state.filter(slot => slot.character === id).length, 1);
  assert.ok(applyItem(state, {slot:32,category:'character'}, {id,category:'character',sourceSlot:0}));
  assert.equal(place(0), false);
  state[32].character = null;
  assert.equal(place(8), true);
});

test('旧データの重複キャラは先頭のみ残し、武器と全チームの参考数は保持する', () => {
  const saved = Array.from({length:40}, () => ({character:null,weapons:[]}));
  saved[0] = {character:characters[1].id, weapons:['hammer']};
  saved[32] = {character:characters[1].id, weapons:['hammer','thunder-sword']};
  const cleaned = cleanState(saved);
  assert.equal(cleaned[0].character, characters[1].id);
  assert.equal(cleaned[32].character, null);
  assert.deepEqual(cleaned[32].weapons.slice(0,2), ['hammer','thunder-sword']);
  assert.equal(weaponCounts(cleaned).hammer, 2);
  assert.equal(weaponCounts(cleaned)['thunder-sword'], 1);
});

test('59兵種の使用可能技能と全26武器の種類で判定し、試験条件とは区別する', () => {
  assert.equal(classes.length, 59);
  for (const weapon of weapons) assert.ok(weaponTypes[weapon.id]);
  const id = name => classes.find(item => item.name === name).id;
  assert.equal(canEquip(id('剣士'), 'wood-spear'), true);
  assert.equal(canEquip(id('剣士'), 'hammer'), false);
  assert.equal(canEquip(id('ワイズマン'), 'salamander'), true);
  assert.equal(canEquip(id('ワイズマン'), 'cerberus'), true);
  assert.equal(canEquip(id('戦象兵'), 'wood-bow'), false);
  assert.equal(canEquip(null, 'wood-sword'), false);
});

test('兵種未選択・不適合武器を拒否し、兵種変更では不適合武器だけ外す', () => {
  const state = cleanState(null);
  const put = (category, id, weaponSlot = 0) => applyItem(state, {slot:0,category,weaponSlot}, {category,id});
  assert.equal(put('weapon','wood-sword'), false);
  assert.equal(put('class','class-1'), true);
  assert.equal(put('weapon','wood-sword'), true);
  assert.equal(put('weapon','wood-bow',1), true);
  assert.equal(put('class','class-8'), true); // 剣士：剣・槍
  assert.deepEqual(state[0].weapons, ['wood-sword',null,null,null,null]);
  assert.equal(put('weapon','wood-bow'), false);
  assert.equal(weaponCounts(state)['wood-bow'],0);
  assert.equal(put('class',null), true);
  assert.ok(state[0].weapons.every(id => id === null));
});

test('武器を交換する際は両側の兵種を検証し、キャラ移動には兵種も伴う', () => {
  const state = cleanState([
    {character:characters[1].id,classId:'class-11',weapons:['wood-bow']}, // アーチャー
    {classId:'class-1',weapons:['wood-sword']},
  ]);
  const before = structuredClone(state);
  assert.equal(applyItem(state,{slot:1,category:'weapon',weaponSlot:0},{id:'wood-bow',category:'weapon',sourceSlot:0,sourceWeaponSlot:0}),false);
  assert.deepEqual(state,before);
  assert.equal(applyItem(state,{slot:8,category:'character'},{id:characters[1].id,category:'character',sourceSlot:0}),true);
  assert.equal(state[8].classId,'class-11');
  assert.equal(state[8].weapons[0],'wood-bow');
});

test('旧保存データの兵種なし武器は保ち、既知の兵種の不適合武器は除外する', () => {
  const state=cleanState([{weapons:['hammer']},{classId:'class-11',weapons:['hammer','wood-bow']},{classId:'unknown'}]);
  assert.equal(state[0].classId,null);
  assert.equal(state[0].weapons[0],'hammer');
  assert.deepEqual(state[1].weapons.slice(0,2),[null,'wood-bow']);
  assert.equal(state[2].classId,null);
});
