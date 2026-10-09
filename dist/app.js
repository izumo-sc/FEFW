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
    if (!config.exchange) {
      const existingNames = new Set(materials.map((material) => material.name));
      for (const { exchangeFor, ...material } of window.EXCHANGE_MATERIALS || []) {
        if (existingNames.has(material.name)) continue;
        materials.push({ ...material, required: 0, exchangeOnly: true });
        existingNames.add(material.name);
      }
    }
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
    const storageKey = "fortune-weave-material-inventory-v3";
    const exchangeRequirements = new Map();
    for (const material of window.EXCHANGE_MATERIALS || []) {
      exchangeRequirements.set(material.name, (exchangeRequirements.get(material.name) || 0) + material.required);
    }
    const displayStorageKey = "fortune-weave-exchange-materials-visible";
    const state = {
      inventory: loadInventory(),
      filter: "all",
      query: "",
      showExchange: loadExchangeDisplay(),
    };

    const list = find("materials-list");
    const emptyState = find("empty-state");
    const searchInput = find("search-input");
    const filterButtons = [...find("controls").querySelectorAll(".filter-button")];
    const resetButton = find("reset-button");
    const resetDialog = find("reset-dialog");
    const saveStatus = find("save-status");

    const displayToggle = find("exchange-display-toggle");

    function loadExchangeDisplay() {
      if (config.exchange) return true;
      try { return localStorage.getItem(displayStorageKey) !== "false"; }
      catch { return true; }
    }

    function includedMaterials() {
      return materials.filter((material) => state.showExchange || !material.exchangeOnly);
    }

    function updateDisplayToggle() {
      if (!displayToggle) return;
      displayToggle.setAttribute("aria-pressed", String(state.showExchange));
      find("exchange-display-state").textContent = state.showExchange ? "ON" : "OFF";
    }

    displayToggle?.addEventListener("click", () => {
      state.showExchange = !state.showExchange;
      try { localStorage.setItem(displayStorageKey, String(state.showExchange)); } catch {}
      updateDisplayToggle();
      render();
      updateSummary();
    });

    function loadInventory() {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed && typeof parsed === "object" ? parsed : {};
        }

        const reconstruction = JSON.parse(localStorage.getItem("fortune-weave-material-inventory-v2") ||
          localStorage.getItem("fortune-weave-material-inventory-v1") || "{}");
        const exchange = JSON.parse(localStorage.getItem("fortune-weave-weapon-exchange-inventory-v1") || "{}");
        const merged = {};
        for (const inventory of [reconstruction, exchange]) {
          if (!inventory || typeof inventory !== "object") continue;
          for (const [name, stored] of Object.entries(inventory)) {
            merged[name] ||= {};
            for (const route of routes) {
              const quantity = stored && typeof stored === "object" ? stored[route.key] : route.key === "leda" ? stored : 0;
              merged[name][route.key] = Math.max(merged[name][route.key] || 0, normalizeQuantity(quantity));
            }
          }
        }
        localStorage.setItem(storageKey, JSON.stringify(merged));
        return merged;
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

    function totalsFor(material, quantities) {
      const held = totalQuantity(quantities);
      const perRoute = state.showExchange ? exchangeRequirements.get(material.name) || 0 : 0;
      const exchangeHeld = routes.reduce((sum, route) => sum + Math.min(perRoute, normalizeQuantity(quantities[route.key])), 0);
      const exchangeShortage = perRoute * routes.length - exchangeHeld;
      const reconstructionHeld = held - exchangeHeld;
      const reconstructionShortage = Math.max(0, material.required - reconstructionHeld);
      return {
        held: config.exchange ? exchangeHeld : held,
        shortage: config.exchange ? exchangeShortage : reconstructionShortage,
        combinedShortage: exchangeShortage + reconstructionShortage,
        perRoute,
      };
    }

    function filteredMaterials() {
      const query = state.query.trim().toLocaleLowerCase("ja");
      return includedMaterials().filter((material) => {
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
        const totals = totalsFor(material, quantities);
        const { held, shortage } = totals;
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
        required.textContent = material.exchangeOnly ? "" : String(material.required);
        if (config.exchange) {
          required.textContent = `${material.required}×4`;
        } else if (totals.perRoute) {
          const note = document.createElement("small");
          note.className = "exchange-note";
          note.textContent = `（${totals.perRoute}×4）`;
          note.title = "武器交換に各ルートで必要な数";
          required.append(note);
        }

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
            const nextTotals = totalsFor(material, quantities);
            totalCell.textContent = String(nextTotals.held);
            updateShortage(nextTotals);
            saveInventory();
            updateSummary();
          });

          inputGroup.append(routeName, input);
          routeInputs.append(inputGroup);
        }

        const shortageCell = document.createElement("span");
        shortageCell.className = `shortage${shortage === 0 ? " is-complete" : ""}`;
        function updateShortage(current) {
          shortageCell.replaceChildren(document.createTextNode(material.exchangeOnly ? "" : String(current.shortage)));
          shortageCell.classList.toggle("is-complete", current.shortage === 0);
          if (!config.exchange && current.perRoute) {
            const note = document.createElement("small");
            note.className = "exchange-note";
            note.textContent = `（${current.combinedShortage}）`;
            note.title = "復興分と武器交換4ルート分の不足合計";
            note.style.color = current.combinedShortage === 0 ? "#35714a" : "var(--danger)";
            shortageCell.append(note);
          }
        }
        updateShortage(totals);

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
      const included = includedMaterials();
      const requiredTotal = included.reduce((sum, material) => sum + material.required * (config.exchange ? routes.length : 1), 0);
      const shortageTotal = included.reduce((sum, material) => {
        return sum + totalsFor(material, quantitiesFor(material.name)).shortage;
      }, 0);
      find("material-count").textContent = String(included.length);
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
      state.inventory = loadInventory();
      for (const material of includedMaterials()) delete state.inventory[material.name];
      saveInventory();
      render();
      updateSummary();
      saveStatus.textContent = "所持数をリセットしました";
    });

    window.addEventListener("storage", (event) => {
      if (event.key !== storageKey && event.key !== displayStorageKey && event.key !== null) return;
      state.inventory = loadInventory();
      state.showExchange = loadExchangeDisplay();
      updateDisplayToggle();
      render();
      updateSummary();
    });

    updateDisplayToggle();
    render();
    updateSummary();
  }

  createMaterialTracker(window.MATERIALS);
  createMaterialTracker(window.EXCHANGE_MATERIALS, {
    prefix: "exchange-",
    exchange: true,
    preserveOrder: true,
  });
})();
