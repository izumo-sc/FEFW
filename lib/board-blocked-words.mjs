// Curated from inappropriate-words-ja (MIT) and Japanese bad words list (CC0).
// License notices are kept in licenses/board-blocked-words.txt.
// Broad everyday/game terms are intentionally excluded. Edit these lists to tune moderation.
export const blockedPhrases = Object.freeze([
  'きちがい', 'ガイジ', 'クソくらえ', 'クソアマ', 'クソガキ', 'クソゴミ',
  'バカヤロウ', 'バカヤロー', '馬鹿野郎', '糞くらえ', '糞食らえ', '豚野郎',
  'やりまん', 'ヤリチン', '痴女', '淫乱',
  'おちんちん', 'おまんこ', 'オナニー', 'アダルトビデオ', 'アナルセックス',
  'アナルビーズ', 'アナルプラグ', 'イラマチオ', 'オナホ', 'クリトリス',
  'クンニ', 'ザーメン', 'スカトロ', 'スペルマ', 'セックス', 'セフレ',
  'センズリ', 'ソープランド', 'ソープ嬢', 'ダッチワイフ', 'ディルド',
  'デリヘル', 'ハメ撮り', 'パイズリ', 'フェラ', 'ペニバン',
  'マスターベーション', '口内射精', '強姦', '輪姦', '獣姦', '屍姦', '睡姦',
  '近親相姦', '性奴隷', '援助交際', '肉便器',
  // Site-specific threats / direct harassment.
  '死んでしまえ', '死んじまえ', '自殺しろ', '殺してやる', 'ぶっ殺す',
]);

// Short words only match complete runs, avoiding e.g.「死ねない」「すまんこれ」.
export const blockedStandalone = Object.freeze([
  '死ね', 'しね', 'あほ', 'ばか', 'クソ', 'カス', 'ちんこ', 'ちんぽ', 'まんこ',
  'fuck', 'fucking', 'shit', 'asshole', 'bitch',
]);

function normalize(value) {
  return value.normalize('NFKC').toLowerCase()
    .replace(/[\p{Cf}\u034f\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/gu, '')
    .replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));
}
const phrases = blockedPhrases.map(normalize);
const standalone = new Set(blockedStandalone.map(normalize));

export function containsBlockedWord(value) {
  const normalized = normalize(value);
  // Do not join punctuation or line breaks: unrelated sentences must stay separate.
  const compact = normalized.replace(/[\p{Zs}\t]/gu, '');
  if (phrases.some(word => compact.includes(word))) return true;
  // Latin words use Latin boundaries, so Japanese surrounding text is supported.
  const words = normalized.match(/[a-z]+|[\p{Script=Han}\p{Script=Hiragana}ー0-9]+/gu) || [];
  return words.some(word => standalone.has(word));
}
