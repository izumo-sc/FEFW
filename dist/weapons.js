(() => {
  "use strict";

  const weapons = Array.isArray(window.WEAPONS) ? window.WEAPONS : [];
  const routes = [
    { key: "leda", label: "レダ" },
    { key: "dietrich", label: "ディートリヒ" },
    { key: "theodora", label: "セオドラ" },
    { key: "kai", label: "カイ" },
  ];
  const storageKey = "fortune-weave-weapon-checks-v1";
  const list = document.querySelector("#weapon-list");
  const count = document.querySelector("#weapon-count");
  const duplicateNames = new Set(
    weapons
      .map((weapon) => weapon.name)
      .filter((name, index, names) => names.indexOf(name) !== index),
  );
  const unavailableRoutes = new Map([
    ["偃月刀｜ジーマの港", new Set(["leda", "dietrich", "kai"])],
    ["サラマンダー｜ニュシアデス州・南の通路", new Set(["leda", "kai"])],
    ["サンダーソード｜ストーリー", new Set(["leda", "theodora"])],
  ]);
  let checks = loadChecks();

  function loadChecks() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return saved && typeof saved === "object" ? saved : {};
    } catch {
      return {};
    }
  }

  function weaponKey(weapon) {
    return duplicateNames.has(weapon.name) ? `${weapon.name}｜${weapon.acquisition}` : weapon.name;
  }

  function isChecked(weapon, routeKey) {
    return Boolean(checks[weaponKey(weapon)]?.[routeKey]);
  }

  function isUnavailable(weapon, routeKey) {
    return unavailableRoutes.get(`${weapon.name}｜${weapon.acquisition}`)?.has(routeKey) || false;
  }

  function saveCheck(weapon, routeKey, checked) {
    const key = weaponKey(weapon);
    checks[key] = { ...(checks[key] || {}), [routeKey]: checked };
    localStorage.setItem(storageKey, JSON.stringify(checks));
  }

  function render() {
    count.textContent = `${weapons.length}件`;
    list.replaceChildren();

    for (const weapon of weapons) {
      const row = document.createElement("article");
      row.className = "weapon-row";

      const name = document.createElement("strong");
      name.className = "weapon-name";
      name.textContent = weapon.name;

      const acquisition = document.createElement("p");
      acquisition.className = "weapon-acquisition";
      acquisition.textContent = weapon.acquisition;

      const routeChecks = document.createElement("div");
      routeChecks.className = "weapon-route-checks";

      for (const route of routes) {
        const unavailable = isUnavailable(weapon, route.key);
        const label = document.createElement("label");
        label.className = `weapon-check${unavailable ? " is-unavailable" : ""}`;

        const checkBox = document.createElement("span");
        checkBox.className = "weapon-check-box";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = unavailable ? false : isChecked(weapon, route.key);
        input.disabled = unavailable;
        input.setAttribute(
          "aria-label",
          unavailable
            ? `${weapon.name}（${weapon.acquisition}）は${route.label}では入手対象外`
            : `${weapon.name}（${weapon.acquisition}）を${route.label}で入手済みにする`,
        );
        if (!unavailable) {
          input.addEventListener("change", () => saveCheck(weapon, route.key, input.checked));
        }

        checkBox.append(input);

        const routeName = document.createElement("span");
        routeName.className = "weapon-route-name";
        routeName.textContent = route.label;

        label.append(checkBox, routeName);
        routeChecks.append(label);
      }

      row.append(name, acquisition, routeChecks);
      list.append(row);
    }
  }

  render();
})();
