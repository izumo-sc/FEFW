(function (root) {
  "use strict";
  const node = typeof module !== "undefined" && module.exports;
  const weapons = (node ? require('../forging/forging-data.js') : root.FORGING).weapons;
  const characters = node ? require('./characters-data.js') : root.LOADOUT_CHARACTERS;
  const weaponIds = new Set(weapons.map(item => item.id));
  const characterIds = new Set(characters.map(item => item.id));
  const storageKey = 'fortune-weave-character-weapons-v1';
  const slotCount = 40, weaponSlotCount = 5;
  function cleanState(value) {
    const source = Array.isArray(value) ? value : [];
    return Array.from({length:slotCount}, (_, i) => ({
      character: characterIds.has(source[i]?.character) ? source[i].character : null,
      weapons: Array.from({length:weaponSlotCount}, (_, j) => weaponIds.has(source[i]?.weapons?.[j]) ? source[i].weapons[j] : null),
    }));
  }
  function weaponCounts(value) {
    const counts = Object.fromEntries(weapons.map(w => [w.id, 0]));
    for (const slot of cleanState(value)) for (const id of slot.weapons) if (id) counts[id]++;
    return counts;
  }
  const validSlot = slot => Number.isInteger(slot) && slot >= 0 && slot < slotCount;
  const validWeaponSlot = slot => Number.isInteger(slot) && slot >= 0 && slot < weaponSlotCount;
  function applyItem(state, target, payload) {
    if (!target || !payload || !validSlot(target.slot) || target.category !== payload.category) return false;
    const character = target.category === 'character';
    if (!character && target.category !== 'weapon') return false;
    if (!(character ? characterIds : weaponIds).has(payload.id)) return false;
    if (!character && !validWeaponSlot(target.weaponSlot)) return false;
    const moving = payload.sourceSlot !== undefined;
    if (moving) {
      if (!validSlot(payload.sourceSlot) || (!character && !validWeaponSlot(payload.sourceWeaponSlot))) return false;
      const sourceId = character ? state[payload.sourceSlot].character : state[payload.sourceSlot].weapons[payload.sourceWeaponSlot];
      if (sourceId !== payload.id) return false;
      if (character) {
        // キャラの移動には所持武器も伴う。
        [state[target.slot], state[payload.sourceSlot]] = [state[payload.sourceSlot], state[target.slot]];
      } else {
        const previous = state[target.slot].weapons[target.weaponSlot];
        state[target.slot].weapons[target.weaponSlot] = payload.id;
        state[payload.sourceSlot].weapons[payload.sourceWeaponSlot] = previous;
      }
    } else if (character) state[target.slot].character = payload.id;
    else state[target.slot].weapons[target.weaponSlot] = payload.id;
    return true;
  }
  const api = {weapons, characters, storageKey, slotCount, weaponSlotCount, cleanState, weaponCounts, applyItem};
  if (node) module.exports = api; else root.WEAPON_LOADOUT = api;
})(typeof window !== 'undefined' ? window : globalThis);
