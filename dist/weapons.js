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
  let checks = loadChecks();

  function loadChecks() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return saved && typeof saved === "object" ? saved : {};
    } catch {
      return {};
    }
  }

  function isChecked(name, routeKey) {
    return Boolean(checks[name]?.[routeKey]);
  }

  function saveCheck(name, routeKey, checked) {
    checks[name] = { ...(checks[name] || {}), [routeKey]: checked };
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
        const label = document.createElement("label");
        label.className = "weapon-check";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = isChecked(weapon.name, route.key);
        input.setAttribute("aria-label", `${weapon.name}を${route.label}で入手済みにする`);
        input.addEventListener("change", () => saveCheck(weapon.name, route.key, input.checked));

        const routeName = document.createElement("span");
        routeName.textContent = route.label;

        label.append(input, routeName);
        routeChecks.append(label);
      }

      row.append(name, acquisition, routeChecks);
      list.append(row);
    }
  }

  render();
})();
