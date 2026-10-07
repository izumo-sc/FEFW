(() => {
  const toggles = [...document.querySelectorAll("[data-order-toggle]")];
  const contents = [...document.querySelectorAll("[data-order-content]")];

  function closeAll() {
    for (const toggle of toggles) toggle.setAttribute("aria-expanded", "false");
    for (const content of contents) content.hidden = true;
  }

  for (const toggle of toggles) {
    toggle.addEventListener("click", () => {
      const key = toggle.dataset.orderToggle;
      const shouldOpen = toggle.getAttribute("aria-expanded") !== "true";
      closeAll();
      if (!shouldOpen) return;

      toggle.setAttribute("aria-expanded", "true");
      const content = contents.find((item) => item.dataset.orderContent === key);
      if (content) content.hidden = false;
    });
  }
})();
