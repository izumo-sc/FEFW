import {test} from 'node:test';
import assert from 'node:assert/strict';
import {containsBlockedWord, blockedPhrases, blockedStandalone} from '../lib/board-blocked-words.mjs';

test('禁止語一覧と文字幅・カナ・不可視文字の表記揺れを検出', () => {
  for (const word of [...blockedPhrases, ...blockedStandalone]) assert(containsBlockedWord(word), word);
  for (const text of ['お前はキチガイだ', 'ｷﾁｶﾞｲ', 'き\u200bち\u2060がい',
    'き\ufe0fちがい', 'き ち が い', '死ね！', 'シネ', 'ＦＵＣＫ', 'これはfuckだ']) {
    assert(containsBlockedWord(text), text);
  }
});

test('攻略用語・短い語の部分一致・別々の文を誤検出しない', () => {
  for (const text of ['キャラのスカウト条件', '馬殺しの弓', '獣狩りの弓', 'キルソード',
    '敵を殺す', '死ねないので回復する', 'すまんこれで合ってる？',
    'アーカイヴZ', 'カスパル', '催眠', 'スキルを追加', 'Scunthorpe', 'classic',
    'きち。がい', 'きち\nがい', '']) assert.equal(containsBlockedWord(text), false, text);
});
