(() => {
  "use strict";

  const materials = Array.isArray(window.MATERIALS) ? window.MATERIALS : [];
  const storageKey = "fortune-weave-material-inventory-v1";
  const state = {
    inventory: loadInventory(),
    filter: "all",
    query: "",
  };

  const list = document.querySelector("#materials-list");
  const emptyState = document.querySelector("#empty-state");
  const searchInput = document.querySelector("#search-input");
  const filterButtons = [...document.querySelectorAll(".filter-button")];
  const resetButton = document.querySelector("#reset-button");
  const resetDialog = document.querySelector("#reset-dialog");
  const saveStatus = document.querySelector("#save-status");

  function loadInventory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function normalizeQuantity(value) {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function saveInventory() {
    localStorage.setItem(storageKey, JSON.stringify(state.inventory));
    saveStatus.textContent = "保存しました";
    window.clearTimeout(saveInventory.timer);
    saveInventory.timer = window.setTimeout(() => {
      saveStatus.textContent = "入力内容はこのブラウザに自動保存されます";
    }, 1200);
  }

  function filteredMaterials() {
    const query = state.query.trim().toLocaleLowerCase("ja");
    return materials.filter((material) => {
      const categoryMatches = state.filter === "all" || material.category === state.filter;
      const textMatches = !query || `${material.name} ${material.locations.join(" ")}`.toLocaleLowerCase("ja").includes(query);
      return categoryMatches && textMatches;
    });
  }

  function render() {
    const visible = filteredMaterials();
    list.replaceChildren();
    emptyState.hidden = visible.length > 0;

    for (const material of visible) {
      const held = normalizeQuantity(state.inventory[material.name]);
      const shortage = Math.max(0, material.required - held);
      const row = document.createElement("article");
      row.className = `material-row${material.routeLimited ? " route-limited" : ""}${material.sectionStart ? " section-gap" : ""}`;
      row.dataset.name = material.name;

      const category = document.createElement("span");
      category.className = `category ${material.category === "魚" ? "fish" : "vegetable"}`;
      category.textContent = material.category;

      const name = document.createElement("span");
      name.className = "material-name";
      name.textContent = material.name;

      const required = document.createElement("span");
      required.className = "number-cell required";
      required.textContent = String(material.required);

      const inputCell = document.createElement("span");
      inputCell.className = "input-cell";
      const input = document.createElement("input");
      input.className = "material-input";
      input.type = "number";
      input.min = "0";
      input.step = "1";
      input.inputMode = "numeric";
      input.value = String(held);
      input.setAttribute("aria-label", `${material.name}の所持数`);
      input.addEventListener("input", () => {
        const quantity = normalizeQuantity(input.value);
        input.value = String(quantity);
        state.inventory[material.name] = quantity;
        const nextShortage = Math.max(0, material.required - quantity);
        shortageCell.textContent = String(nextShortage);
        shortageCell.classList.toggle("is-complete", nextShortage === 0);
        saveInventory();
        updateSummary();
      });
      inputCell.append(input);

      const shortageCell = document.createElement("span");
      shortageCell.className = `shortage${shortage === 0 ? " is-complete" : ""}`;
      shortageCell.textContent = String(shortage);

      const locations = document.createElement("span");
      locations.className = "locations";
      locations.textContent = material.locations.length ? material.locations.join(" / ") : "未確認";

      row.append(category, name, required, inputCell, shortageCell, locations);
      list.append(row);
    }
  }

  function updateSummary() {
    const requiredTotal = materials.reduce((sum, material) => sum + material.required, 0);
    const shortageTotal = materials.reduce((sum, material) => {
      const held = normalizeQuantity(state.inventory[material.name]);
      return sum + Math.max(0, material.required - held);
    }, 0);
    document.querySelector("#material-count").textContent = String(materials.length);
    document.querySelector("#required-total").textContent = requiredTotal.toLocaleString("ja-JP");
    document.querySelector("#shortage-total").textContent = shortageTotal.toLocaleString("ja-JP");
  }

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    render();
  });

  for (const button of filterButtons) {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter || "all";
      for (const other of filterButtons) other.classList.toggle("is-active", other === button);
      render();
    });
  }

  resetButton.addEventListener("click", () => resetDialog.showModal());
  resetDialog.addEventListener("close", () => {
    if (resetDialog.returnValue !== "confirm") return;
    state.inventory = {};
    localStorage.removeItem(storageKey);
    render();
    updateSummary();
    saveStatus.textContent = "所持数をリセットしました";
  });

  render();
  updateSummary();
})();
