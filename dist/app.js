(() => {
  "use strict";

  function createMaterialTracker(source, config = {}) {
    const find = (id) => document.getElementById(`${config.prefix || ""}${id}`);
    if (!find("materials-list")) return;

    const materialOrder = [
      "タルトゴビー",
      "グラディゴビー",
      "バアルパイク",
      "シールドパイク",
      "ガラマーリン",
      "カーネポニート",
      "ハートポニート",
      "リルフィッシュ",
      "ハードフィッシュ",
      "コーシャルーガー",
      "スカライ",
      "バザリーシャーク",
      "テフノミ",
      "ギンジ",
      "デーツ",
      "カダム",
      "アオギンジ",
      "ヒカリボシ",
      "サンノミ",
      "レッドフリッカ",
      "シャクトウ",
      "イチノミ",
      "ジョッパ",
      "キンバショウ",
      "アルマメット",
      "シャルミール",
      "リガネット",
      "ヒシバナ",
      "グルマオサ",
      "アカキンバイ",
      "リナリア",
      "ザンゲ",
      "キンバイ",
      "ダッカモンジュ",
      "シナモス",
      "サバクキビ",
      "バク",
      "セムイモ",
      "ソルギ",
      "ロカ",
      "ソロム",
      "オリバ",
      "ポンゴ",
      "パイヤ",
      "オドモンジュ",
      "アガヴェ",
      "クレストル",
      "ラザニバータ",
      "ミラニラ",
      "ソルダネラ",
      "ユナメイ",
      "メララ",
      "チャノキ",
      "テネバトウ",
      "ミザンガ",
    ];
    const materialOrderIndex = new Map(materialOrder.map((name, index) => [name, index]));
    const materials = Array.isArray(source) ? [...source] : [];
    if (!config.preserveOrder) {
      materials.sort(
        (left, right) =>
          (materialOrderIndex.get(left.name) ?? Number.MAX_SAFE_INTEGER) -
          (materialOrderIndex.get(right.name) ?? Number.MAX_SAFE_INTEGER),
      );
    }
    const materialScreenshots = window.MATERIAL_SCREENSHOTS || {};
    const routes = [
      { key: "leda", label: "レダ" },
      { key: "dietrich", label: "ディートリヒ" },
      { key: "theodora", label: "セオドラ" },
      { key: "kai", label: "カイ" },
    ];
    const storageKey = config.storageKey || "fortune-weave-material-inventory-v2";
    const legacyStorageKey = config.storageKey ? null : "fortune-weave-material-inventory-v1";
    const state = {
      inventory: loadInventory(),
      filter: "all",
      query: "",
    };

    const list = find("materials-list");
    const emptyState = find("empty-state");
    const searchInput = find("search-input");
    const filterButtons = [...find("controls").querySelectorAll(".filter-button")];
    const resetButton = find("reset-button");
    const resetDialog = find("reset-dialog");
    const saveStatus = find("save-status");

    function loadInventory() {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed && typeof parsed === "object" ? parsed : {};
        }

        if (!legacyStorageKey) return {};
        const legacy = JSON.parse(localStorage.getItem(legacyStorageKey) || "{}");
        if (!legacy || typeof legacy !== "object") return {};
        return Object.fromEntries(
          Object.entries(legacy).map(([name, quantity]) => [
            name,
            { leda: normalizeQuantity(quantity), dietrich: 0, theodora: 0, kai: 0 },
          ]),
        );
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

    function quantitiesFor(name) {
      const stored = state.inventory[name];
      if (stored && typeof stored === "object") {
        return Object.fromEntries(routes.map((route) => [route.key, normalizeQuantity(stored[route.key])]));
      }
      return { leda: normalizeQuantity(stored), dietrich: 0, theodora: 0, kai: 0 };
    }

    function totalQuantity(quantities) {
      return routes.reduce((sum, route) => sum + normalizeQuantity(quantities[route.key]), 0);
    }

    function filteredMaterials() {
      const query = state.query.trim().toLocaleLowerCase("ja");
      return materials.filter((material) => {
        const categoryMatches = state.filter === "all" || material.category === state.filter;
        const textMatches = !query || `${material.exchangeFor || ""} ${material.name} ${material.locations.join(" ")}`.toLocaleLowerCase("ja").includes(query);
        return categoryMatches && textMatches;
      });
    }

    function render() {
      const visible = filteredMaterials();
      list.replaceChildren();
      emptyState.hidden = visible.length > 0;

      for (const material of visible) {
        const quantities = quantitiesFor(material.name);
        const held = totalQuantity(quantities);
        const shortage = Math.max(0, material.required - held);
        const row = document.createElement("article");
        row.className = `material-row${material.routeLimited ? " route-limited" : ""}`;
        row.dataset.name = material.name;

        const category = document.createElement("span");
        category.className = material.exchangeFor
          ? "category exchange-weapon"
          : `category ${material.category === "魚" ? "fish" : "vegetable"}`;
        category.textContent = material.exchangeFor || material.category;

        const name = document.createElement("span");
        name.className = "material-name";
        name.textContent = material.name;

        const required = document.createElement("span");
        required.className = "number-cell required";
        required.textContent = String(material.required);

        const routeInputs = document.createElement("span");
        routeInputs.className = "route-inputs";

        const totalCell = document.createElement("span");
        totalCell.className = "owned-total";
        totalCell.textContent = String(held);

        for (const route of routes) {
          const inputGroup = document.createElement("label");
          inputGroup.className = `route-input-group route-${route.key}`;

          const routeName = document.createElement("span");
          routeName.className = "route-name";
          routeName.textContent = route.label;

          const input = document.createElement("input");
          input.className = "material-input";
          input.type = "number";
          input.min = "0";
          input.step = "1";
          input.inputMode = "numeric";
          input.value = quantities[route.key] > 0 ? String(quantities[route.key]) : "";
          input.setAttribute("aria-label", `${material.name}の${route.label}所持数`);
          input.addEventListener("input", () => {
            state.inventory = loadInventory();
            const latestQuantities = quantitiesFor(material.name);
            Object.assign(quantities, latestQuantities);
            quantities[route.key] = normalizeQuantity(input.value);
            input.value = quantities[route.key] > 0 ? String(quantities[route.key]) : "";
            state.inventory[material.name] = quantities;
            const nextTotal = totalQuantity(quantities);
            const nextShortage = Math.max(0, material.required - nextTotal);
            totalCell.textContent = String(nextTotal);
            shortageCell.textContent = String(nextShortage);
            shortageCell.classList.toggle("is-complete", nextShortage === 0);
            saveInventory();
            updateSummary();
          });

          inputGroup.append(routeName, input);
          routeInputs.append(inputGroup);
        }

        const shortageCell = document.createElement("span");
        shortageCell.className = `shortage${shortage === 0 ? " is-complete" : ""}`;
        shortageCell.textContent = String(shortage);

        const locations = document.createElement("div");
        locations.className = "locations";
        if (material.locations.length) {
          const locationList = document.createElement("ul");
          for (const location of material.locations.slice(0, 4)) {
            const item = document.createElement("li");
            item.textContent = location;
            locationList.append(item);
          }
          locations.append(locationList);
          if (material.locations.length > 4) {
            const remainder = document.createElement("span");
            remainder.className = "location-remainder";
            remainder.textContent = `ほか${material.locations.length - 4}件`;
            locations.append(remainder);
          }
        } else {
          locations.textContent = "未確認";
        }

        const screenshot = document.createElement("div");
        screenshot.className = "screenshot-cell";
        const screenshotPath = materialScreenshots[material.name];
        if (screenshotPath) {
          const image = document.createElement("img");
          image.src = screenshotPath;
          image.alt = `${material.name}の採集場所`;
          image.loading = "lazy";
          screenshot.append(image);
        } else {
          screenshot.classList.add("is-empty");
        }

        row.append(category, name, required, routeInputs, totalCell, shortageCell, locations, screenshot);
        list.append(row);
      }
    }

    function updateSummary() {
      const requiredTotal = materials.reduce((sum, material) => sum + material.required, 0);
      const shortageTotal = materials.reduce((sum, material) => {
        const held = totalQuantity(quantitiesFor(material.name));
        return sum + Math.max(0, material.required - held);
      }, 0);
      find("material-count").textContent = String(materials.length);
      find("required-total").textContent = requiredTotal.toLocaleString("ja-JP");
      find("shortage-total").textContent = shortageTotal.toLocaleString("ja-JP");
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
      if (legacyStorageKey) localStorage.removeItem(legacyStorageKey);
      render();
      updateSummary();
      saveStatus.textContent = "所持数をリセットしました";
    });

    window.addEventListener("storage", (event) => {
      if (event.key !== storageKey && event.key !== null) return;
      state.inventory = loadInventory();
      render();
      updateSummary();
    });

    render();
    updateSummary();
  }

  createMaterialTracker(window.MATERIALS);
  createMaterialTracker(window.EXCHANGE_MATERIALS, {
    prefix: "exchange-",
    storageKey: "fortune-weave-weapon-exchange-inventory-v1",
    preserveOrder: true,
  });
})();
