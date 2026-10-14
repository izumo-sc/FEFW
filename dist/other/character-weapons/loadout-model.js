(function (root) {
  "use strict";
  const node = typeof module !== "undefined" && module.exports;
  const weapons = (node ? require('../forging/forging-data.js') : root.FORGING).weapons;
  const characters = node ? require('./characters-data.js') : root.LOADOUT_CHARACTERS;
  const classes = node ? require('./classes-data.js') : root.LOADOUT_CLASSES;
  const classMap = new Map(classes.map(item => [item.id, item]));
  const weaponTypes = Object.fromEntries([
    ['剣', ['wood-sword','zanbato','flissa','thunder-sword','great-sword','purifying-sword']],
    ['槍', ['wood-spear','javelin','short-spear','knight-killer','aurora','solel','shinza','mahamadou','gracida','assal']],
    ['斧', ['hammer']], ['弓', ['wood-bow','beast-bow','long-bow','horse-bow','short-bow']],
    ['籠手', ['wood-gauntlet','kenkonken','salamander','cerberus']],
  ].flatMap(([type, ids]) => ids.map(id => [id, type])));
  function canEquip(classId, weaponId) { return weaponIds.has(weaponId) && (classId == null || Boolean(classMap.get(classId)?.weaponTypes.includes(weaponTypes[weaponId]))); }
  const weaponIds = new Set(weapons.map(item => item.id));
  const characterIds = new Set(characters.map(item => item.id));
  const storageKey = 'fortune-weave-character-weapons-v1';
  const teamSlotCount = 40, saviorSlot = teamSlotCount, saviorId = 'kyuuseishu';
  const slotCount = teamSlotCount + 1, weaponSlotCount = 5;
  function cleanState(value) {
    const source = Array.isArray(value) ? value.slice(0, slotCount) : [];
    const oldSavior = source.slice(0, teamSlotCount).findIndex(slot => slot?.character === saviorId);
    if (!source[saviorSlot] && oldSavior >= 0) {
      source[saviorSlot] = source[oldSavior];
      source[oldSavior] = null;
    }
    const usedCharacters = new Set();
    return Array.from({length:slotCount}, (_, i) => {
      const id = source[i]?.character;
      const character = i === saviorSlot ? saviorId : id !== saviorId && characterIds.has(id) && !usedCharacters.has(id) ? id : null;
      if (character) usedCharacters.add(character);
      const classId = classMap.has(source[i]?.classId) ? source[i].classId : null;
      return {character, classId, weapons: Array.from({length:weaponSlotCount}, (_, j) => {
        const id = source[i]?.weapons?.[j];
        return weaponIds.has(id) && (!classId || canEquip(classId, id)) ? id : null;
      })};
    });
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
    if (target.category === 'class') {
      if (payload.sourceSlot !== undefined || (payload.id !== null && !classMap.has(payload.id))) return false;
      const slot = state[target.slot]; slot.classId = payload.id;
      slot.weapons = slot.weapons.map(id => id && canEquip(payload.id, id) ? id : null);
      return true;
    }
    const character = target.category === 'character';
    if (!character && target.category !== 'weapon') return false;
    if (character && (target.slot === saviorSlot || payload.id === saviorId || payload.sourceSlot === saviorSlot)) return false;
    if (!(character ? characterIds : weaponIds).has(payload.id)) return false;
    if (!character && !validWeaponSlot(target.weaponSlot)) return false;
    if (!character && !canEquip(state[target.slot].classId, payload.id)) return false;
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
        if (previous && !canEquip(state[payload.sourceSlot].classId, previous)) return false;
        state[target.slot].weapons[target.weaponSlot] = payload.id;
        state[payload.sourceSlot].weapons[payload.sourceWeaponSlot] = previous;
      }
    } else if (character) {
      if (state.some((slot, index) => index !== target.slot && slot.character === payload.id)) return false;
      state[target.slot].character = payload.id;
    }
    else state[target.slot].weapons[target.weaponSlot] = payload.id;
    return true;
  }
  const api = {weapons, characters, classes, weaponTypes, canEquip, storageKey, slotCount, teamSlotCount, saviorSlot, saviorId, weaponSlotCount, cleanState, weaponCounts, applyItem};
  if (node) module.exports = api; else root.WEAPON_LOADOUT = api;
})(typeof window !== 'undefined' ? window : globalThis);
