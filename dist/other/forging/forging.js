(() => {
  "use strict";
  const {weapons, routes, materialNames, quantity, requirements, balance} = window.FORGING;
  const storageKey = "fortune-weave-forging-v1";
  const find = id => document.getElementById(id);
  const status = find("forging-save-status");
  let storageFailed = false;
  function readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
      return {counts: object(saved?.counts), inventory: object(saved?.inventory)};
    } catch { return {counts:{}, inventory:{}}; }
  }
  let state = readState();
  function changeState(edit) {
    // 他のタブで入力した数を保持する。保存できない場合もこの画面では計算を続ける。
    if (!storageFailed) state = readState();
    edit(state);
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      storageFailed = false;
      status.textContent = "入力内容はこのブラウザに自動保存されます";
    } catch {
      storageFailed = true;
      status.textContent = "保存できませんでした。入力内容はこの画面を閉じると失われます。";
    }
    update();
  }
  const number = value => value.toLocaleString("ja-JP");
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function input(label, onInput) {
    const field = element("input", "forging-input");
    Object.assign(field, {type:"number", min:"0", max:"9999", step:"1", inputMode:"numeric", placeholder:"0"});
    field.setAttribute("aria-label", label);
    field.addEventListener("input", () => {
      const n = quantity(field.value);
      field.value = n ? String(n) : "";
      onInput(n);
    });
    return field;
  }
  function materialList(weapon, count) {
    const list = element("div", "forging-material-list");
    for (const [name, amount] of Object.entries(weapon.materials)) list.append(element("span", "", `${name} × ${number(amount * count)}`));
    list.append(element("span", "forging-gold", `${number(weapon.gold * count)} ゴールド`));
    return list;
  }
  const weaponFields = new Map();
  const weaponOutputs = new Map();
  for (const weapon of weapons) {
    const row = element("tr");
    const cost = element("td"); cost.dataset.label = "1個分の素材"; cost.append(materialList(weapon, 1));
    const result = element("td"); result.dataset.label = "必要合計数";
    const control = element("td"); control.dataset.label = "作成数";
    const field = input(`${weapon.name}の作成数`, n => changeState(current => {current.counts[weapon.id] = n;}));
    control.append(field);
    row.append(element("td", "", weapon.name), cost, control, result);
    find("forging-weapons").append(row);
    weaponFields.set(weapon.id, field); weaponOutputs.set(weapon.id, result);
  }
  const totalOutputs = new Map();
  const inventoryRows = new Map();
  for (const name of materialNames) {
    const total = element("div"); const value = element("dd");
    total.append(element("dt", "", name), value); find("forging-material-totals").append(total);
    totalOutputs.set(name, value);
    const row = element("tr"); row.dataset.material = name;
    row.append(element("td", "", name));
    const fields = {};
    for (const route of routes) {
      const cell = element("td", "forging-route-cell"); cell.dataset.label = route.label;
      const field = input(`${name}の${route.label}採集数`, n => changeState(current => {
        const previous = current.inventory[name];
        current.inventory[name] = Object.fromEntries(routes.map(r => [r.key, quantity(previous?.[r.key])]));
        current.inventory[name][route.key] = n;
      }));
      fields[route.key] = field; cell.append(field); row.append(cell);
    }
    const outputs = {};
    for (const [key, label] of [["held", "採集合計"], ["required", "必要数"], ["shortage", "不足数"]]) {
      const cell = element("td", `forging-result-cell${key === "shortage" ? " forging-shortage" : ""}`);
      cell.dataset.label = label; outputs[key] = element("span"); cell.append(outputs[key]); row.append(cell);
    }
    find("forging-inventory-rows").append(row);
    inventoryRows.set(name, {fields, outputs});
  }
  function update() {
    const needed = requirements(state.counts);
    for (const weapon of weapons) {
      const count = quantity(state.counts[weapon.id]);
      const field = weaponFields.get(weapon.id);
      if (document.activeElement !== field) field.value = count ? String(count) : "";
      weaponOutputs.get(weapon.id).replaceChildren(materialList(weapon, count));
    }
    let heldTotal = 0, shortageTotal = 0;
    for (const name of materialNames) {
      const required = needed.materials[name];
      totalOutputs.get(name).textContent = number(required);
      const {fields, outputs} = inventoryRows.get(name);
      const stored = state.inventory[name];
      for (const route of routes) {
        const n = quantity(stored?.[route.key]);
        if (document.activeElement !== fields[route.key]) fields[route.key].value = n ? String(n) : "";
      }
      const {held, shortage} = balance(required, stored);
      outputs.held.textContent = number(held); outputs.required.textContent = number(required); outputs.shortage.textContent = number(shortage);
      outputs.shortage.parentElement.classList.toggle("is-complete", shortage === 0);
      heldTotal += held; shortageTotal += shortage;
    }
    find("forging-required-total").textContent = number(needed.total);
    find("forging-gold-total").textContent = number(needed.gold);
    find("forging-held-total").textContent = number(heldTotal);
    find("forging-shortage-total").textContent = number(shortageTotal);
  }
  const dialog = find("forging-reset-dialog");
  let resetTarget;
  for (const button of document.querySelectorAll("[data-reset]")) button.addEventListener("click", () => {
    resetTarget = button.dataset.reset;
    find("forging-reset-title").textContent = resetTarget === "counts" ? "作成数をリセットしますか？" : "採集数をリセットしますか？";
    find("forging-reset-description").textContent = resetTarget === "counts" ? "武器の作成数をすべて空欄に戻します。採集数は残ります。" : "4ルートの採集数をすべて空欄に戻します。武器の作成数は残ります。";
    dialog.returnValue = "cancel"; dialog.showModal();
  });
  dialog.addEventListener("close", () => {
    if (dialog.returnValue === "confirm") changeState(current => { current[resetTarget] = {}; });
  });
  window.addEventListener("storage", event => {
    if (event.key === storageKey || event.key === null) { state = readState(); update(); }
  });
  update();
})();
