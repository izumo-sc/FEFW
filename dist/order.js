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

      const matchingToggles = toggles.filter((item) => item.dataset.orderToggle === key);
      for (const item of matchingToggles) item.setAttribute("aria-expanded", "true");
      const content = contents.find((item) => item.dataset.orderContent === key);
      if (content) content.hidden = false;
      const topToggle = matchingToggles.find((item) => item.closest('[data-order-nav="top"]'));
      if (topToggle) topToggle.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  }
})();
