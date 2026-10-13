(() => {
  'use strict';
  const model = window.WEAPON_LOADOUT;
  const {characters, weapons, storageKey, cleanState, applyItem} = model;
  const catalogs = {character:characters, weapon:weapons};
  const names = Object.fromEntries(Object.entries(catalogs).map(([key, list]) => [key, new Map(list.map(item => [item.id, item.name]))]));
  const find = id => document.getElementById(id);
  const board = find('loadout-board'), status = find('loadout-status'), picker = find('loadout-picker');
  let state = read(), selected = 0, category = 'character', pickerTarget = null, saveFailed = false;
  let drag = null, touch = null, scrollFrame = null, suppressClickUntil = 0;
  function read() { try { return cleanState(JSON.parse(localStorage.getItem(storageKey))); } catch { return cleanState(null); } }
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(text, label, className = '') {
    const node = el('button', className, text); node.type = 'button';
    if (label) node.setAttribute('aria-label', label);
    return node;
  }
  function announce(text) { status.textContent = text; }
  function commit(edit, message) {
    if (!saveFailed) state = read();
    if (edit(state) === false) { announce('配置できませんでした。空き枠や選択した項目を確認してください。'); return false; }
    try { localStorage.setItem(storageKey, JSON.stringify(state)); saveFailed = false; }
    catch { saveFailed = true; }
    renderBoard();
    announce(saveFailed ? '保存できませんでした。この画面を閉じると変更が失われ、錬成ページにも反映されません。' : `${message} 自動保存しました。`);
    return true;
  }
  function selectSlot(index) {
    selected = index;
    for (const card of board.children) {
      const current = Number(card.dataset.slot) === selected;
      card.classList.toggle('is-selected', current);
      const target = card.querySelector('.loadout-target-button');
      target.setAttribute('aria-pressed', String(current)); target.textContent = current ? '選択中' : 'PUSH先';
    }
    const name = names.character.get(state[selected].character);
    find('loadout-selection').textContent = `武器のPUSH先：キャラ枠${selected + 1}${name ? `（${name}）` : ''}`;
  }
  function targetFrom(node) {
    return {slot:Number(node.dataset.slot), category:node.dataset.category, weaponSlot:Number(node.dataset.weaponSlot)};
  }
  function payloadFrom(node) {
    const payload = {category:node.dataset.category, id:node.dataset.dragId};
    if (node.dataset.slot !== undefined) {
      payload.sourceSlot = Number(node.dataset.slot);
      if (payload.category === 'weapon') payload.sourceWeaponSlot = Number(node.dataset.weaponSlot);
    }
    return payload;
  }
  function cell(slot, kind, weaponSlot) {
    const id = kind === 'character' ? state[slot].character : state[slot].weapons[weaponSlot];
    const name = names[kind].get(id);
    const label = kind === 'character' ? `キャラ枠${slot + 1}のキャラ` : `キャラ枠${slot + 1}の武器${weaponSlot + 1}`;
    const node = el('div', `loadout-cell${id ? ' has-item' : ''}`);
    Object.assign(node.dataset, {slot:String(slot), category:kind});
    if (kind === 'weapon') node.dataset.weaponSlot = String(weaponSlot);
    if (id) { node.draggable = true; node.dataset.dragId = id; }
    const choose = button(name || (kind === 'character' ? 'キャラを選択' : `武器${weaponSlot + 1}`), `${label}を選択${name ? `：${name}` : ''}`, 'loadout-choose');
    choose.addEventListener('click', () => {
      if (Date.now() < suppressClickUntil) return;
      selectSlot(slot); pickerTarget = targetFrom(node);
      find('loadout-picker-title').textContent = `${label}を選択`;
      find('loadout-picker-search').value = '';
      renderPicker(); picker.showModal(); find('loadout-picker-search').focus();
    });
    node.append(choose);
    if (id) {
      const clear = button('×', `${label}の${name}を外す`, 'loadout-clear');
      clear.addEventListener('click', () => clearTarget(targetFrom(node)));
      node.append(clear);
    }
    return node;
  }
  function renderBoard() {
    board.replaceChildren();
    state.forEach((slot, index) => {
      const card = el('article', 'loadout-card'); card.dataset.slot = String(index); card.setAttribute('aria-label', `キャラ枠${index + 1}`);
      const heading = el('div', 'loadout-card-heading');
      const target = button('PUSH先', `キャラ枠${index + 1}をPUSH先にする`, 'loadout-target-button');
      target.addEventListener('click', () => selectSlot(index));
      heading.append(el('h3', '', `キャラ枠${index + 1}`), target); card.append(heading, cell(index, 'character'));
      for (let j = 0; j < model.weaponSlotCount; j++) card.append(cell(index, 'weapon', j));
      board.append(card);
    });
    selectSlot(selected);
  }
  function clearTarget(target) {
    commit(current => {
      if (target.category === 'character') current[target.slot].character = null;
      else current[target.slot].weapons[target.weaponSlot] = null;
    }, '枠を空にしました。');
  }
  function place(target, payload) {
    const success = commit(current => applyItem(current, target, payload), '配置を更新しました。');
    if (success) selectSlot(target.slot);
    return success;
  }
  function push(kind, id) {
    commit(current => {
      if (kind === 'character') {
        const slot = current.findIndex(item => !item.character);
        if (slot < 0) return false;
        selected = slot; return applyItem(current, {category:kind, slot}, {category:kind, id});
      }
      const weaponSlot = current[selected].weapons.indexOf(null);
      if (weaponSlot < 0) return false;
      return applyItem(current, {category:kind, slot:selected, weaponSlot}, {category:kind, id});
    }, `${names[kind].get(id)}を追加しました。`);
  }
  function filtered(kind, query) {
    const text = query.trim().toLocaleLowerCase('ja');
    return catalogs[kind].filter(item => item.name.toLocaleLowerCase('ja').includes(text));
  }
  function renderLibrary() {
    const list = find('loadout-library-items'); list.replaceChildren();
    for (const item of filtered(category, find('loadout-search').value)) {
      const row = el('div', 'loadout-library-item');
      const name = el('span', '', item.name); name.draggable = true; Object.assign(name.dataset, {category, dragId:item.id});
      const kind = category;
      const add = button('PUSH', `${item.name}をPUSH`); add.addEventListener('click', () => push(kind, item.id));
      row.append(name, add); list.append(row);
    }
    if (!list.children.length) list.append(el('p', '', '該当する項目がありません。'));
  }
  function renderPicker() {
    const list = find('loadout-picker-items'); list.replaceChildren();
    for (const item of filtered(pickerTarget.category, find('loadout-picker-search').value)) {
      const pick = button(item.name);
      pick.addEventListener('click', () => {
        if (place(pickerTarget, {category:pickerTarget.category, id:item.id})) picker.close();
      });
      list.append(pick);
    }
    if (!list.children.length) list.append(el('p', '', '該当する項目がありません。'));
  }
  find('loadout-picker-close').addEventListener('click', () => picker.close());
  find('loadout-picker-clear').addEventListener('click', () => {clearTarget(pickerTarget); picker.close();});
  picker.addEventListener('close', () => {
    const target = pickerTarget;
    if (!target) return;
    const selector = `.loadout-cell[data-slot="${target.slot}"][data-category="${target.category}"]${target.category === 'weapon' ? `[data-weapon-slot="${target.weaponSlot}"]` : ''} .loadout-choose`;
    board.querySelector(selector)?.focus({preventScroll:true});
  });
  find('loadout-picker-search').addEventListener('input', renderPicker);
  find('loadout-search').addEventListener('input', renderLibrary);
  for (const toggle of document.querySelectorAll('[data-library]')) toggle.addEventListener('click', () => {
    category = toggle.dataset.library;
    for (const other of document.querySelectorAll('[data-library]')) { other.classList.toggle('is-active', other === toggle); other.setAttribute('aria-pressed', String(other === toggle)); }
    find('loadout-search').value = ''; renderLibrary();
  });
  find('loadout-library-toggle').addEventListener('click', event => {
    const body = find('loadout-library-body'); body.hidden = !body.hidden;
    event.currentTarget.textContent = body.hidden ? '一覧を開く' : '一覧を閉じる';
    event.currentTarget.setAttribute('aria-expanded', String(!body.hidden));
  });
  const reset = find('loadout-reset-dialog');
  find('loadout-reset').addEventListener('click', () => {reset.returnValue = 'cancel'; reset.showModal();});
  reset.addEventListener('close', () => {
    if (reset.returnValue === 'confirm') {selected = 0; commit(current => current.splice(0, current.length, ...cleanState(null)), 'すべての枠を空にしました。');}
  });
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) {state = read(); renderBoard(); announce('別のページで変更された配置を反映しました。');}
  });
  window.addEventListener('pageshow', event => {if (event.persisted && !saveFailed) {state = read(); renderBoard();}});
  document.addEventListener('dragstart', event => {
    const source = event.target.closest('[data-drag-id]'); if (!source || event.target.closest('.loadout-clear')) return;
    drag = payloadFrom(source); event.dataTransfer.effectAllowed = drag.sourceSlot === undefined ? 'copy' : 'move';
    event.dataTransfer.setData('application/x-fefw-loadout', JSON.stringify(drag));
  });
  function clearHover() { for (const zone of board.querySelectorAll('.is-over')) zone.classList.remove('is-over'); }
  document.addEventListener('dragend', () => {drag = null; clearHover();});
  board.addEventListener('dragover', event => {
    const zone = event.target.closest('.loadout-cell');
    if (!zone || !drag || zone.dataset.category !== drag.category) return;
    event.preventDefault(); event.dataTransfer.dropEffect = drag.sourceSlot === undefined ? 'copy' : 'move';
    clearHover(); zone.classList.add('is-over');
  });
  board.addEventListener('dragleave', event => event.target.closest('.loadout-cell')?.classList.remove('is-over'));
  board.addEventListener('drop', event => {
    const zone = event.target.closest('.loadout-cell'); if (!zone || !drag) return;
    event.preventDefault(); clearHover(); place(targetFrom(zone), drag); drag = null;
  });
  // 成長率ページと同様、縦スクロールを残して横への動きからタッチドラッグを開始。
  function touchTarget() {
    clearHover();
    const zone = document.elementFromPoint(touch.x, touch.y)?.closest('.loadout-cell');
    touch.target = zone?.dataset.category === touch.payload.category ? zone : null;
    touch.target?.classList.add('is-over');
  }
  function autoScroll() {
    if (!touch?.active) return;
    const edge = 60, libraryBottom = find('loadout-library-body').parentElement.getBoundingClientRect().bottom;
    if (touch.y > window.innerHeight - edge) window.scrollBy(0, 10);
    else if (touch.y < Math.min(libraryBottom + edge, window.innerHeight / 2)) window.scrollBy(0, -10);
    touchTarget(); scrollFrame = requestAnimationFrame(autoScroll);
  }
  function finishTouch(cancelled) {
    if (!touch) return;
    const done = touch; touch = null;
    cancelAnimationFrame(scrollFrame); done.preview?.remove(); clearHover();
    if (done.active) suppressClickUntil = Date.now() + 400;
    if (!cancelled && done.active && done.target) place(targetFrom(done.target), done.payload);
  }
  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || !event.isPrimary || event.target.closest('.loadout-clear')) return;
    const source = event.target.closest('[data-drag-id]'); if (!source) return;
    touch = {pointerId:event.pointerId, source, payload:payloadFrom(source), startX:event.clientX, startY:event.clientY, x:event.clientX, y:event.clientY, active:false};
    source.setPointerCapture?.(event.pointerId);
  });
  document.addEventListener('pointermove', event => {
    if (!touch || touch.pointerId !== event.pointerId) return;
    const dx = event.clientX - touch.startX, dy = event.clientY - touch.startY;
    if (!touch.active) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {touch.source.releasePointerCapture?.(event.pointerId); finishTouch(true); return;}
      if (Math.abs(dx) < 10) return;
      touch.active = true; touch.preview = el('div', 'loadout-drag-preview', names[touch.payload.category].get(touch.payload.id));
      document.body.append(touch.preview); scrollFrame = requestAnimationFrame(autoScroll);
    }
    event.preventDefault(); touch.x = event.clientX; touch.y = event.clientY;
    touch.preview.style.transform = `translate(${touch.x + 12}px,${touch.y + 12}px)`; touchTarget();
  }, {passive:false});
  document.addEventListener('pointerup', event => {if (touch?.pointerId === event.pointerId) finishTouch(false);});
  document.addEventListener('pointercancel', event => {if (touch?.pointerId === event.pointerId) finishTouch(true);});
  renderBoard(); renderLibrary();
})();
