// 成長率ページの59兵種と、保存済みGameWith兵種資料（2026-09-26）の「使用可能技能」を対応。資格試験条件は使用しない。
(function (root) {
  const classes = [
  {
    "id": "class-1",
    "name": "平民",
    "group": "基本職",
    "weaponTypes": [
      "剣",
      "槍",
      "斧",
      "弓",
      "籠手"
    ],
    "source": "https://gamewith.jp/fefw/577370"
  },
  {
    "id": "class-2",
    "name": "貴族",
    "group": "基本職",
    "weaponTypes": [
      "剣",
      "槍",
      "斧",
      "弓",
      "籠手"
    ],
    "source": "https://gamewith.jp/fefw/577369"
  },
  {
    "id": "class-3",
    "name": "闘士",
    "group": "初級職",
    "weaponTypes": [
      "剣",
      "斧",
      "籠手"
    ],
    "source": "https://gamewith.jp/fefw/577333"
  },
  {
    "id": "class-4",
    "name": "猟兵",
    "group": "初級職",
    "weaponTypes": [
      "剣",
      "弓"
    ],
    "source": "https://gamewith.jp/fefw/577368"
  },
  {
    "id": "class-5",
    "name": "兵士",
    "group": "初級職",
    "weaponTypes": [
      "剣",
      "槍",
      "斧"
    ],
    "source": "https://gamewith.jp/fefw/577367"
  },
  {
    "id": "class-6",
    "name": "飛駝兵",
    "group": "初級職",
    "weaponTypes": [
      "剣",
      "槍",
      "斧"
    ],
    "source": "https://gamewith.jp/fefw/577366"
  },
  {
    "id": "class-7",
    "name": "呪い師",
    "group": "初級職",
    "weaponTypes": [
      "剣",
      "斧",
      "籠手"
    ],
    "source": "https://gamewith.jp/fefw/577365"
  },
  {
    "id": "class-8",
    "name": "剣士",
    "group": "中級職",
    "weaponTypes": [
      "剣",
      "槍"
    ],
    "source": "https://gamewith.jp/fefw/577364"
  },
  {
    "id": "class-9",
    "name": "ブリガンド",
    "group": "中級職",
    "weaponTypes": [
      "剣",
      "斧",
      "籠手"
    ],
    "source": "https://gamewith.jp/fefw/577363"
  },
  {
    "id": "class-10",
    "name": "セスタス",
    "group": "中級職",
    "weaponTypes": [
      "籠手"
    ],
    "source": "https://gamewith.jp/fefw/577362"
  },
  {
    "id": "class-11",
    "name": "アーチャー",
    "group": "中級職",
    "weaponTypes": [
      "弓"
    ],
    "source": "https://gamewith.jp/fefw/577361"
  },
  {
    "id": "class-12",
    "name": "ローグ",
    "group": "中級職",
    "weaponTypes": [
      "剣",
      "弓"
    ],
    "source": "https://gamewith.jp/fefw/577360"
  },
  {
    "id": "class-13",
    "name": "重装歩兵",
    "group": "中級職",
    "weaponTypes": [
      "剣",
      "槍",
      "斧"
    ],
    "source": "https://gamewith.jp/fefw/577359"
  },
  {
    "id": "class-14",
    "name": "軽騎兵",
    "group": "中級職",
    "weaponTypes": [
      "剣",
      "槍",
      "斧"
    ],
    "source": "https://gamewith.jp/fefw/577358"
  },
  {
    "id": "class-15",
    "name": "戦車兵",
    "group": "中級職",
    "weaponTypes": [
      "弓"
    ],
    "source": "https://gamewith.jp/fefw/577357"
  },
  {
    "id": "class-16",
    "name": "騎甲駝兵",
    "group": "中級職",
    "weaponTypes": [
      "剣",
      "槍",
      "斧"
    ],
    "source": "https://gamewith.jp/fefw/577356"
  },
  {
    "id": "class-17",
    "name": "シャーマン",
    "group": "中級職",
    "weaponTypes": [
      "剣",
      "籠手"
    ],
    "source": "https://gamewith.jp/fefw/577355"
  },
  {
    "id": "class-18",
    "name": "プリースト",
    "group": "中級職",
    "weaponTypes": [
      "剣",
      "籠手"
    ],
    "source": "https://gamewith.jp/fefw/577354"
  },
  {
    "id": "class-19",
    "name": "天翼兵",
    "group": "中級職",
    "weaponTypes": [
      "剣",
      "槍"
    ],
    "source": "https://gamewith.jp/fefw/577444"
  },
  {
    "id": "class-20",
    "name": "シドー",
    "group": "上級職",
    "weaponTypes": [
      "剣",
      "槍"
    ],
    "source": "https://gamewith.jp/fefw/577353"
  },
  {
    "id": "class-21",
    "name": "ウォーリアー",
    "group": "上級職",
    "weaponTypes": [
      "剣",
      "斧",
      "籠手"
    ],
    "source": "https://gamewith.jp/fefw/577352"
  },
  {
    "id": "class-22",
    "name": "スナイパー",
    "group": "上級職",
    "weaponTypes": [
      "弓"
    ],
    "source": "https://gamewith.jp/fefw/577351"
  },
  {
    "id": "class-23",
    "name": "フォレストナイト",
    "group": "上級職",
    "weaponTypes": [
      "剣",
      "弓"
    ],
    "source": "https://gamewith.jp/fefw/577350"
  },
  {
    "id": "class-24",
    "name": "ヘヴィアーマー",
    "group": "上級職",
    "weaponTypes": [
      "槍",
      "斧"
    ],
    "source": "https://gamewith.jp/fefw/577349"
  },
  {
    "id": "class-25",
    "name": "バーディンガー",
    "group": "上級職",
    "weaponTypes": [
      "剣",
      "槍",
      "斧"
    ],
    "source": "https://gamewith.jp/fefw/577348"
  },
  {
    "id": "class-26",
    "name": "ウァテス",
    "group": "上級職",
    "weaponTypes": [
      "剣",
      "籠手"
    ],
    "source": "https://gamewith.jp/fefw/577347"
  },
  {
    "id": "class-27",
    "name": "ビショップ",
    "group": "上級職",
    "weaponTypes": [
      "斧",
      "籠手"
    ],
    "source": "https://gamewith.jp/fefw/577346"
  },
  {
    "id": "class-28",
    "name": "カラドリオス",
    "group": "上級職",
    "weaponTypes": [
      "剣",
      "槍",
      "斧"
    ],
    "source": "https://gamewith.jp/fefw/577345"
  },
  {
    "id": "class-29",
    "name": "ガーディアン",
    "group": "上級職",
    "weaponTypes": [
      "槍"
    ],
    "source": "https://gamewith.jp/fefw/577344"
  },
  {
    "id": "class-30",
    "name": "踊り子",
    "group": "上級職",
    "weaponTypes": [
      "剣",
      "弓"
    ],
    "source": "https://gamewith.jp/fefw/577445"
  },
  {
    "id": "class-31",
    "name": "ドラグーン",
    "group": "上級職",
    "weaponTypes": [
      "剣",
      "槍",
      "斧"
    ],
    "source": "https://gamewith.jp/fefw/577441"
  },
  {
    "id": "class-32",
    "name": "トルバドール",
    "group": "上級職",
    "weaponTypes": [],
    "source": "https://gamewith.jp/fefw/577442"
  },
  {
    "id": "class-33",
    "name": "カタフラクト",
    "group": "上級職",
    "weaponTypes": [
      "剣",
      "槍",
      "斧"
    ],
    "source": "https://gamewith.jp/fefw/577520"
  },
  {
    "id": "class-34",
    "name": "レンジャー",
    "group": "上級職",
    "weaponTypes": [
      "剣",
      "弓"
    ],
    "source": "https://gamewith.jp/fefw/577544"
  },
  {
    "id": "class-35",
    "name": "戦象兵",
    "group": "上級職",
    "weaponTypes": [],
    "source": "https://gamewith.jp/fefw/577923"
  },
  {
    "id": "class-36",
    "name": "バトルマスター",
    "group": "最上級職",
    "weaponTypes": [
      "剣",
      "斧",
      "籠手"
    ],
    "source": "https://gamewith.jp/fefw/577601"
  },
  {
    "id": "class-37",
    "name": "マスターアーチ",
    "group": "最上級職",
    "weaponTypes": [
      "弓"
    ],
    "source": "https://gamewith.jp/fefw/577600"
  },
  {
    "id": "class-38",
    "name": "シャドーシーカー",
    "group": "最上級職",
    "weaponTypes": [
      "剣",
      "弓"
    ],
    "source": "https://gamewith.jp/fefw/577603"
  },
  {
    "id": "class-39",
    "name": "ホーリーランサー",
    "group": "最上級職",
    "weaponTypes": [
      "槍"
    ],
    "source": "https://gamewith.jp/fefw/577599"
  },
  {
    "id": "class-40",
    "name": "フォートレス",
    "group": "最上級職",
    "weaponTypes": [
      "槍",
      "斧"
    ],
    "source": "https://gamewith.jp/fefw/577598"
  },
  {
    "id": "class-41",
    "name": "オリハルディア",
    "group": "最上級職",
    "weaponTypes": [
      "剣",
      "槍",
      "斧"
    ],
    "source": "https://gamewith.jp/fefw/577597"
  },
  {
    "id": "class-42",
    "name": "ドラゴンマスター",
    "group": "最上級職",
    "weaponTypes": [
      "剣",
      "槍",
      "斧"
    ],
    "source": "https://gamewith.jp/fefw/577596"
  },
  {
    "id": "class-43",
    "name": "ドルイド",
    "group": "最上級職",
    "weaponTypes": [
      "剣",
      "籠手"
    ],
    "source": "https://gamewith.jp/fefw/577602"
  },
  {
    "id": "class-44",
    "name": "ワイズマン",
    "group": "最上級職",
    "weaponTypes": [
      "籠手"
    ],
    "source": "https://gamewith.jp/fefw/577595"
  },
  {
    "id": "class-45",
    "name": "バトルモンク",
    "group": "最上級職",
    "weaponTypes": [
      "籠手"
    ],
    "source": "https://gamewith.jp/fefw/577606"
  },
  {
    "id": "class-46",
    "name": "聖天翼兵",
    "group": "最上級職",
    "weaponTypes": [
      "剣",
      "槍"
    ],
    "source": "https://gamewith.jp/fefw/577605"
  },
  {
    "id": "class-47",
    "name": "グレートナイト",
    "group": "最上級職",
    "weaponTypes": [
      "剣",
      "槍",
      "斧"
    ],
    "source": "https://gamewith.jp/fefw/577893"
  },
  {
    "id": "class-48",
    "name": "ソードマスター",
    "group": "最上級職",
    "weaponTypes": [
      "剣",
      "槍"
    ],
    "source": "https://gamewith.jp/fefw/577914"
  },
  {
    "id": "class-49",
    "name": "ハイエピタフ",
    "group": "最上級職",
    "weaponTypes": [
      "剣"
    ],
    "source": "https://gamewith.jp/fefw/577913"
  },
  {
    "id": "class-50",
    "name": "ボウナイト",
    "group": "最上級職",
    "weaponTypes": [
      "剣",
      "弓"
    ],
    "source": "https://gamewith.jp/fefw/577912"
  },
  {
    "id": "class-51",
    "name": "ヴァルキュリウム",
    "group": "最上級職",
    "weaponTypes": [],
    "source": "https://gamewith.jp/fefw/577911"
  },
  {
    "id": "class-52",
    "name": "ザ・ブレイド",
    "group": "神将職",
    "weaponTypes": [
      "剣",
      "槍"
    ],
    "source": "https://gamewith.jp/fefw/577877"
  },
  {
    "id": "class-53",
    "name": "ジ・アプサラス",
    "group": "神将職",
    "weaponTypes": [
      "剣",
      "弓"
    ],
    "source": "https://gamewith.jp/fefw/577878"
  },
  {
    "id": "class-54",
    "name": "ジ・エターナル",
    "group": "神将職",
    "weaponTypes": [
      "剣",
      "斧",
      "籠手"
    ],
    "source": "https://gamewith.jp/fefw/577879"
  },
  {
    "id": "class-55",
    "name": "ザ・ゴッドハンド",
    "group": "神将職",
    "weaponTypes": [
      "籠手"
    ],
    "source": "https://gamewith.jp/fefw/577880"
  },
  {
    "id": "class-56",
    "name": "ザ・カラミティ",
    "group": "神将職",
    "weaponTypes": [
      "剣",
      "弓"
    ],
    "source": "https://gamewith.jp/fefw/577881"
  },
  {
    "id": "class-57",
    "name": "ザ・トライデント",
    "group": "神将職",
    "weaponTypes": [
      "槍"
    ],
    "source": "https://gamewith.jp/fefw/577882"
  },
  {
    "id": "class-58",
    "name": "ザ・キャバリアー",
    "group": "神将職",
    "weaponTypes": [
      "剣",
      "槍",
      "斧"
    ],
    "source": "https://gamewith.jp/fefw/577883"
  },
  {
    "id": "class-59",
    "name": "ジ・アヴァタール",
    "group": "神将職",
    "weaponTypes": [
      "斧",
      "弓"
    ],
    "source": "https://gamewith.jp/fefw/577884"
  }
];
  if (typeof module !== "undefined" && module.exports) module.exports = classes; else root.LOADOUT_CLASSES = classes;
})(typeof window !== "undefined" ? window : globalThis);
