(() => {
  const reconstructionMaterials = new Map((window.MATERIALS || []).map((material) => [material.name, material]));
  const exchangeMaterials = [
    { exchangeFor: "斬馬刀", name: "バク", required: 10 },
    { exchangeFor: "斬馬刀", name: "キンバイ", required: 3 },
    { exchangeFor: "サンダーソード", name: "サンノミ", required: 10 },
    { exchangeFor: "サンダーソード", name: "ユナメイ", required: 1 },
    {
      exchangeFor: "清めの剣", name: "ラドンパイク", required: 3, category: "魚",
      locations: ["ラドン湖（メリアス州）", "ブロンテス湖（サヴェロン州）", "神託の滝（プラクシテア州）"],
    },
    {
      exchangeFor: "馬殺しの弓", name: "エンリエット", required: 1,
      locations: ["旅人の丘（エレクトラ州）", "陽光の花園（エレクトラ州）"],
    },
    {
      exchangeFor: "アーカイヴB", name: "煉獄草", required: 3,
      locations: ["焼け草の砂丘（ランパス州）", "骸の大流砂（ニュシアデス州）"],
    },
    { exchangeFor: "アーカイヴΓ", name: "ポンゴ", required: 10 },
    { exchangeFor: "アーカイヴΓ", name: "グルマオサ", required: 1 },
  ];

  window.EXCHANGE_MATERIALS = exchangeMaterials.map((material) => ({
    category: "野菜",
    locations: reconstructionMaterials.get(material.name)?.locations || [],
    ...material,
  }));
})();
