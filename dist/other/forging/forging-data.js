(function (root) {
  "use strict";
  // 動画 2026-10-14 00-54-24.mkv の表示値。サンダーソードの雷石はユーザー訂正で5個。
  // 追加分は動画 2026-10-15 01-18-13.mkv の最大錬成段階の表示値。
  // 戦魂石は3部限定素材として計算対象外。
  const singleWeaponIds = new Set(["aurora", "solel", "shinza", "mahamadou", "gracida", "assal", "cerberus"]);
  const weapons = [
    ["wood-sword", "木製の剣+9", {錬成石:37, ブルースノール:1}, 2310],
    ["bronze-sword","青銅の剣+5",{"錬成石":16,"ブルースノール":1},1960],
    ["iron-sword","鉄の剣+5",{"錬成石":18,"ブルースノール":1},2170],
    ["damina-sword","ダ・ミナの剣+3",{"錬成石":10,"ブルースノール":1},1750],
    ["killing-edge","キルソード+3",{"玉鋼":5},1120],
    ["wind-sword","疾風の剣+3",{"風石":5},1400],
    ["zanbato", "斬馬刀+3", {カレット:5}, 1120],
    ["flissa", "フリッサ+3", {カレット:5}, 1120],
    ["thunder-sword", "サンダーソード+3", {雷石:5}, 1050],
    ["great-sword", "グレートソード+3", {ウーツ鋼:5}, 1400],
    ["purifying-sword", "清めの剣+3", {月光石:3}, 1400],
    ["wood-spear", "木製の槍+9", {錬成石:37, ブルースノール:1}, 2310],
    ["bronze-spear","青銅の槍+5",{"錬成石":16,"ブルースノール":1},1960],
    ["iron-spear","鉄の槍+5",{"錬成石":18,"ブルースノール":1},2170],
    ["damina-spear","ダ・ミナの槍+3",{"錬成石":10,"ブルースノール":1},1750],
    ["halberd","ハルバード+3",{"カレット":5},1120],
    ["javelin", "手槍+3", {錬成石:5, ブルースノール:1}, 1540],
    ["short-spear", "ショートスピア+3", {錬成石:10, ブルースノール:1}, 1610],
    ["knight-killer", "ナイトキラー+3", {玉鋼:5}, 1120],
    ["aurora", "アウロラの星槍+3", {海星石:3, アダマント:1}, 1750],
    ["solel", "主人公の槍+5", {太陽石:11, オリハルコン:1}, 3500],
    ["shinza", "シンザのモリ+3", {錬成石:30}, 980],
    ["mahamadou", "マハマドゥの槍+5", {玉鋼:16, アダマント:1}, 2520],
    ["gracida", "魔槍グラシーダ+3", {雷石:3, アガルチウム:2}, 2100],
    ["assal", "聖槍アッサル+3", {太陽石:1, マジックアレイ:2}, 1750],
    ["hammer", "ハンマー+3", {玉鋼:5}, 1120],
    ["wood-axe","木製の斧+9",{"錬成石":37,"ブルースノール":1},2310],
    ["bronze-axe","青銅の斧+5",{"錬成石":16,"ブルースノール":1},1960],
    ["iron-axe","鉄の斧+5",{"錬成石":18,"ブルースノール":1},2170],
    ["damina-axe","ダ・ミナの斧+3",{"錬成石":10,"ブルースノール":1},1750],
    ["hand-axe","手斧+3",{"錬成石":5,"ブルースノール":1},980],
    ["short-axe","ショートアクス+3",{"錬成石":10,"ブルースノール":1},1120],
    ["sagaris","サガリス+3",{"錬成石":15,"ブルースノール":1},1400],
    ["smash-axe","スマッシュアクス+3",{"カレット":5},1120],
    ["shield-axe","シールドアクス+3",{"ウーツ鋼":5},1400],
    ["hawk-axe","鷹爪斧+3",{"風石":5},1400],
    ["bardiche","バルディッシュ+3",{"雷石":5},1400],
    ["mace","メイス+3",{"海星石":5},980],
    ["wood-bow", "木製の弓+9", {錬成石:37, ブルースノール:1}, 2310],
    ["bronze-bow","青銅の弓+5",{"錬成石":16,"ブルースノール":1},1960],
    ["iron-bow","鉄の弓+5",{"錬成石":18,"ブルースノール":1},2170],
    ["damina-bow","ダ・ミナの弓+3",{"錬成石":10,"ブルースノール":1},1750],
    ["wind-bow","風の弓+3",{"風石":5},1400],
    ["poison-bow","毒の弓+5",{"毒石":30},980],
    ["beast-bow", "獣狩りの弓+3", {玉鋼:5}, 1120],
    ["long-bow", "ロングボウ+3", {カレット:5}, 1120],
    ["horse-bow", "馬殺しの弓+3", {玉鋼:5}, 1120],
    ["short-bow", "ショートボウ+3", {カレット:5}, 1120],
    ["wood-gauntlet", "木製の籠手+9", {錬成石:37, ブルースノール:1}, 2310],
    ["bronze-gauntlet","青銅の籠手+5",{"錬成石":16,"ブルースノール":1},1960],
    ["iron-gauntlet","鉄の籠手+5",{"錬成石":18,"ブルースノール":1},2170],
    ["damina-gauntlet","ダ・ミナの籠手+3",{"錬成石":10,"ブルースノール":1},1750],
    ["counter-gauntlet","反撃の籠手+3",{"カレット":10},1120],
    ["wind-fire-wheel","風火輪+3",{"太陽石":1,"アダマント":1},2100],
    ["kenkonken", "乾坤圏+3", {カレット:15}, 1120],
    ["salamander", "サラマンダー+5", {太陽石:6, オリハルコン:1}, 2520],
    ["cerberus", "ツェルベルス+3", {アガルチウム:3}, 1400],
  ].map(([id, name, materials, gold]) => ({id, name, materials, gold, maxCount: singleWeaponIds.has(id) ? 1 : 9999}));
  const routes = [
    {key:"leda", label:"レダ"}, {key:"dietrich", label:"ディートリヒ"},
    {key:"theodora", label:"セオドラ"}, {key:"kai", label:"カイ"},
  ];
  const materialNames = [...new Set(weapons.flatMap(w => Object.keys(w.materials)))];
  // 素材表の並びは維持し、1個限定の武器だけを武器一覧の末尾へ移動する。
  weapons.sort((left, right) => Number(left.maxCount === 1) - Number(right.maxCount === 1));
  const quantity = value => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(9999, Math.max(0, Math.floor(n))) : 0;
  };
  const weaponQuantity = (weapon, value) => Math.min(weapon.maxCount, quantity(value));
  function requirements(counts = {}) {
    const materials = Object.fromEntries(materialNames.map(name => [name, 0]));
    let gold = 0;
    for (const weapon of weapons) {
      const count = weaponQuantity(weapon, counts[weapon.id]);
      for (const [name, amount] of Object.entries(weapon.materials)) materials[name] += amount * count;
      gold += weapon.gold * count;
    }
    return {materials, gold, total: Object.values(materials).reduce((a,b) => a+b, 0)};
  }
  function balance(required, inventory = {}) {
    const held = routes.reduce((sum, route) => sum + quantity(inventory?.[route.key]), 0);
    return {held, shortage: Math.max(0, required - held)};
  }
  const api = {weapons, routes, materialNames, quantity, weaponQuantity, requirements, balance};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FORGING = api;
})(typeof window !== "undefined" ? window : globalThis);
