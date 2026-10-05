(() => {
  const data = window.GROWTH_DATA;
  const evolutionClassOrder = new Map(window.EVOLUTION_CLASS_ORDER.map((name, index) => [name, index]));
  const storageKey = "fefw-growth-comparison-v1";
  const categories = [
    { key: "character", dataKey: "characters", label: "キャラ" },
    { key: "class", dataKey: "classes", label: "兵種" },
    { key: "animal", dataKey: "animals", label: "動物" },
  ];
  const classMountTypes = new Map([
    ["軽騎兵", "馬"],
    ["戦車兵", "馬"],
    ["フォレストナイト", "馬"],
    ["バーディンガー", "馬"],
    ["トルバドール", "馬"],
    ["カタフラクト", "馬"],
    ["オリハルディア", "馬"],
    ["ボウナイト", "馬"],
    ["グレートナイト", "馬"],
    ["ヴァルキュリウム", "馬"],
    ["ハイエピタフ", "馬"],
    ["ザ・キャバリアー", "馬"],
    ["飛駝兵", "駝兵"],
    ["騎甲駝兵", "駝兵"],
    ["カラドリオス", "駝兵"],
    ["天翼兵", "ペガサス"],
    ["聖天翼兵", "ペガサス"],
    ["ドラグーン", "バウ"],
    ["ドラゴンマスター", "バウ"],
  ]);
  const animalMountTypes = { 馬: "馬", 飛駝: "駝兵", 天馬: "ペガサス", 飛竜: "バウ" };

  const itemById = new Map(
    categories.flatMap(({ dataKey }) => data[dataKey]).map((item) => [item.id, item]),
  );

  const emptySlot = () => ({ character: null, class: null, animal: null });
  const comparisonSlots = document.querySelector("#comparison-slots");
  const growthLists = document.querySelector("#growth-lists");
  const status = document.querySelector("#growth-status");
  const swapButton = document.querySelector("#swap-button");

  let state = loadState();
  const queries = { character: "", class: "", animal: "" };
  let classOrderMode = "default";

  state.forEach((slot) => {
    if (slot.animal && getClassMountType(slot.class) !== getAnimalMountType(slot.animal)) slot.animal = null;
  });
  saveState();

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey));
      if (!Array.isArray(stored) || stored.length !== 2) return [emptySlot(), emptySlot()];
      return stored.map((slot) => {
        const clean = emptySlot();
        categories.forEach(({ key }) => {
          clean[key] = itemById.has(slot?.[key]) ? slot[key] : null;
        });
        return clean;
      });
    } catch {
      return [emptySlot(), emptySlot()];
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function announce(message) {
    status.textContent = message;
  }

  function getClassMountType(itemId) {
    return classMountTypes.get(itemById.get(itemId)?.name) || null;
  }

  function getAnimalMountType(itemId) {
    return animalMountTypes[itemById.get(itemId)?.group] || null;
  }

  function itemMeta(category, item) {
    if (category === "class") return `${item.group} · ${classMountTypes.get(item.name) || "動物なし"}`;
    if (category === "animal") return getAnimalMountType(item.id);
    return item.group;
  }

  function selectedItemId(slotIndex, category) {
    if (category === "character" && slotIndex === 1 && !state[1].character) {
      return state[0].character;
    }
    return state[slotIndex][category];
  }

  function getTotals(slotIndex) {
    const totals = Object.fromEntries(data.stats.map((stat) => [stat, 0]));
    categories.forEach(({ key }) => {
      const item = itemById.get(selectedItemId(slotIndex, key));
      if (!item) return;
      data.stats.forEach((stat) => {
        totals[stat] += item.stats[stat];
      });
    });
    return totals;
  }

  function renderSlots() {
    comparisonSlots.innerHTML = state
      .map((slot, slotIndex) => {
        const totals = getTotals(slotIndex);
        const selectionHtml = categories
          .map(({ key, label }) => {
            const isShadow = key === "character" && slotIndex === 1 && !slot.character && Boolean(state[0].character);
            const item = itemById.get(selectedItemId(slotIndex, key));
            const classMountType = getClassMountType(slot.class);
            if (!item) {
              const emptyMessage =
                key === "animal"
                  ? classMountType
                    ? `${classMountType}をここへ`
                    : slot.class
                      ? "この兵種は動物なし"
                      : "兵種を先に選択"
                  : `${label}をここへ`;
              const disabledClass = key === "animal" && !classMountType ? " is-disabled" : "";
              return `
                <div class="growth-drop-zone${disabledClass}" data-slot="${slotIndex}" data-category="${key}">
                  <span>${label}</span>
                  <strong>${emptyMessage}</strong>
                </div>`;
            }

            return `
              <div class="growth-drop-zone has-item" data-slot="${slotIndex}" data-category="${key}">
                <div class="selected-growth-item${isShadow ? " is-shadow" : ""}" ${isShadow ? "" : `draggable="true" data-slot="${slotIndex}" data-category="${key}" data-id="${item.id}"`}>
                  <div>
                    <span>${label} · ${isShadow ? "シャドウ" : itemMeta(key, item)}</span>
                    <strong>${item.name}</strong>
                  </div>
                  ${
                    isShadow
                      ? '<span class="shadow-label">自動</span>'
                      : `<button class="remove-growth-item" type="button" data-remove-slot="${slotIndex}" data-remove-category="${key}" aria-label="${item.name}を削除">削除</button>`
                  }
                </div>
              </div>`;
          })
          .join("");

        const statsHtml = data.stats
          .map(
            (stat) => `
              <div class="growth-stat">
                <span>${stat}</span>
                <strong>${totals[stat]}<small>%</small></strong>
              </div>`,
          )
          .join("");

        return `
          <article class="comparison-card" aria-label="比較枠${slotIndex + 1}">
            <div class="growth-selection-grid">${selectionHtml}</div>
            <div class="growth-stats-grid">${statsHtml}</div>
          </article>`;
      })
      .join("");
  }

  function renderLists() {
    growthLists.innerHTML = categories
      .map(({ key, dataKey, label }) => {
        const query = queries[key].trim().toLocaleLowerCase("ja");
        const sourceItems =
          key === "class" && classOrderMode === "evolution"
            ? [...data[dataKey]].sort(
                (left, right) =>
                  (evolutionClassOrder.get(left.name) ?? Number.MAX_SAFE_INTEGER) -
                  (evolutionClassOrder.get(right.name) ?? Number.MAX_SAFE_INTEGER),
              )
            : data[dataKey];
        const filtered = sourceItems.filter((item) =>
          `${item.name} ${item.group}`.toLocaleLowerCase("ja").includes(query),
        );

        const rows = filtered.length
          ? filtered
              .map(
                (item) => `
                  <div class="growth-list-row" draggable="true" data-category="${key}" data-id="${item.id}">
                    <div>
                      <span>${itemMeta(key, item)}</span>
                      <strong>${item.name}</strong>
                    </div>
                    <button class="pull-button" type="button" data-pull-category="${key}" data-pull-id="${item.id}">PULL</button>
                  </div>`,
              )
              .join("")
          : '<p class="growth-list-empty">該当する項目がありません。</p>';

        return `
          <section class="growth-list-column" aria-labelledby="${key}-list-title">
            <div class="growth-list-title">
              <h3 id="${key}-list-title">${label}</h3>
              <div class="growth-list-title-actions">
                <span>${data[dataKey].length}</span>
                ${
                  key === "class"
                    ? `<span class="class-order-state${classOrderMode === "evolution" ? " is-active" : ""}">${classOrderMode === "evolution" ? "進化順" : "通常順"}</span><button class="class-order-button" type="button" data-toggle-class-order aria-label="${classOrderMode === "evolution" ? "通常順に戻す" : "進化順に変更"}">並び変更</button>`
                    : ""
                }
              </div>
            </div>
            <label class="growth-search">
              <span class="sr-only">${label}を検索</span>
              <input type="search" data-search-category="${key}" value="${queries[key]}" placeholder="${label}を検索" autocomplete="off" />
            </label>
            <div class="growth-list-scroll">${rows}</div>
          </section>`;
      })
      .join("");
  }

  function addToFirstAvailable(category, itemId) {
    const animalMountType = category === "animal" ? getAnimalMountType(itemId) : null;
    const slotIndex = state.findIndex((slot) => {
      if (slot[category]) return false;
      if (category !== "animal") return true;
      return getClassMountType(slot.class) === animalMountType;
    });
    if (slotIndex === -1) {
      if (category === "animal") {
        announce(`${animalMountType}に対応する兵種を先に選択してください。`);
        return;
      }
      announce("同じ種類が2枠とも埋まっています。削除するか、入れたい枠へドラッグしてください。");
      return;
    }
    state[slotIndex][category] = itemId;
    let message = `${itemById.get(itemId).name}を比較枠${slotIndex + 1}に追加しました。`;
    if (category === "class" && state[slotIndex].animal) {
      const removedAnimal = itemById.get(state[slotIndex].animal);
      if (getClassMountType(itemId) !== getAnimalMountType(state[slotIndex].animal)) {
        state[slotIndex].animal = null;
        message = `${itemById.get(itemId).name}を追加し、対応しない${removedAnimal.name}を外しました。`;
      }
    }
    saveState();
    renderSlots();
    announce(message);
  }

  function applyDrop(targetSlot, targetCategory, payload) {
    if (!payload || payload.category !== targetCategory || !itemById.has(payload.id)) return;

    if (targetCategory === "animal" && getClassMountType(state[targetSlot].class) !== getAnimalMountType(payload.id)) {
      announce(`${getAnimalMountType(payload.id)}に対応する兵種には配置できません。`);
      return;
    }

    if (Number.isInteger(payload.sourceSlot)) {
      if (payload.sourceSlot === targetSlot) return;
      const replacedId = state[targetSlot][targetCategory];
      if (
        targetCategory === "animal" &&
        replacedId &&
        getClassMountType(state[payload.sourceSlot].class) !== getAnimalMountType(replacedId)
      ) {
        announce("入れ替え先の兵種と動物の区分が一致しません。");
        return;
      }
      if (targetCategory === "class") {
        const targetAnimal = state[targetSlot].animal;
        const sourceAnimal = state[payload.sourceSlot].animal;
        if (
          (targetAnimal && getClassMountType(payload.id) !== getAnimalMountType(targetAnimal)) ||
          (sourceAnimal && getClassMountType(replacedId) !== getAnimalMountType(sourceAnimal))
        ) {
          announce("動物との区分が合わないため、兵種を入れ替えられません。");
          return;
        }
      }
      state[targetSlot][targetCategory] = payload.id;
      state[payload.sourceSlot][targetCategory] = replacedId;
      announce("選択項目を入れ替えました。");
    } else {
      state[targetSlot][targetCategory] = payload.id;
      if (
        targetCategory === "class" &&
        state[targetSlot].animal &&
        getClassMountType(payload.id) !== getAnimalMountType(state[targetSlot].animal)
      ) {
        state[targetSlot].animal = null;
      }
      announce(`${itemById.get(payload.id).name}を比較枠${targetSlot + 1}に入れました。`);
    }

    saveState();
    renderSlots();
  }

  growthLists.addEventListener("click", (event) => {
    const orderButton = event.target.closest("[data-toggle-class-order]");
    if (orderButton) {
      classOrderMode = classOrderMode === "evolution" ? "default" : "evolution";
      renderLists();
      announce(`兵種一覧を${classOrderMode === "evolution" ? "進化順" : "通常順"}に変更しました。`);
      return;
    }
    const button = event.target.closest("[data-pull-id]");
    if (!button) return;
    addToFirstAvailable(button.dataset.pullCategory, button.dataset.pullId);
  });

  growthLists.addEventListener("input", (event) => {
    const input = event.target.closest("[data-search-category]");
    if (!input) return;
    queries[input.dataset.searchCategory] = input.value;
    const cursorPosition = input.selectionStart;
    renderLists();
    const nextInput = growthLists.querySelector(`[data-search-category="${input.dataset.searchCategory}"]`);
    nextInput.focus();
    nextInput.setSelectionRange(cursorPosition, cursorPosition);
  });

  document.addEventListener("dragstart", (event) => {
    const source = event.target.closest("[draggable='true'][data-id]");
    if (!source) return;
    const payload = { category: source.dataset.category, id: source.dataset.id };
    if (source.dataset.slot !== undefined) payload.sourceSlot = Number(source.dataset.slot);
    event.dataTransfer.effectAllowed = payload.sourceSlot === undefined ? "copy" : "move";
    event.dataTransfer.setData("application/json", JSON.stringify(payload));
    source.classList.add("is-dragging");
  });

  document.addEventListener("dragend", (event) => {
    event.target.closest("[draggable='true']")?.classList.remove("is-dragging");
    document.querySelectorAll(".growth-drop-zone.is-over").forEach((zone) => zone.classList.remove("is-over"));
  });

  comparisonSlots.addEventListener("dragover", (event) => {
    const zone = event.target.closest(".growth-drop-zone");
    if (!zone) return;
    event.preventDefault();
    zone.classList.add("is-over");
  });

  comparisonSlots.addEventListener("dragleave", (event) => {
    event.target.closest(".growth-drop-zone")?.classList.remove("is-over");
  });

  comparisonSlots.addEventListener("drop", (event) => {
    const zone = event.target.closest(".growth-drop-zone");
    if (!zone) return;
    event.preventDefault();
    zone.classList.remove("is-over");
    try {
      applyDrop(Number(zone.dataset.slot), zone.dataset.category, JSON.parse(event.dataTransfer.getData("application/json")));
    } catch {
      announce("項目を移動できませんでした。");
    }
  });

  comparisonSlots.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-slot]");
    if (!button) return;
    const slotIndex = Number(button.dataset.removeSlot);
    const category = button.dataset.removeCategory;
    state[slotIndex][category] = null;
    if (category === "class") state[slotIndex].animal = null;
    saveState();
    renderSlots();
    announce(`比較枠${slotIndex + 1}から削除しました。`);
  });

  swapButton.addEventListener("click", () => {
    if (state[0].character && !state[1].character) {
      [state[0].class, state[1].class] = [state[1].class, state[0].class];
      [state[0].animal, state[1].animal] = [state[1].animal, state[0].animal];
    } else {
      [state[0], state[1]] = [state[1], state[0]];
    }
    saveState();
    renderSlots();
    announce("比較枠1と比較枠2を入れ替えました。");
  });

  renderSlots();
  renderLists();
})();
