(() => {
  const reconstructionMaterials = new Map((window.MATERIALS || []).map((material) => [material.name, material]));
  const exchangeMaterials = [
    { exchangeFor: "斬馬刀", name: "バク", required: 10 },
    { exchangeFor: "斬馬刀", name: "キンバイ", required: 3 },
    { exchangeFor: "サンダーソード", name: "サンノミ", required: 10 },
    { exchangeFor: "サンダーソード", name: "ユナメイ", required: 1 },
    { exchangeFor: "清めの剣", name: "ラドンパイク", required: 3, category: "魚" },
    { exchangeFor: "馬殺しの弓", name: "エンリエット", required: 1 },
    { exchangeFor: "アーカイヴB", name: "煉獄草", required: 3 },
    { exchangeFor: "アーカイヴΓ", name: "ポンゴ", required: 10 },
    { exchangeFor: "アーカイヴΓ", name: "グルマオサ", required: 1 },
  ];

  window.MATERIALS = exchangeMaterials.map((material) => ({
    category: "野菜",
    locations: reconstructionMaterials.get(material.name)?.locations || [],
    ...material,
  }));
  window.MATERIAL_TRACKER_CONFIG = {
    storageKey: "fortune-weave-weapon-exchange-inventory-v1",
    preserveOrder: true,
  };
})();
