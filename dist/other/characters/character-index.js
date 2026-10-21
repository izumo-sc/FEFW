(() => {
  const buttons = [...document.querySelectorAll('[data-character-route]')];
  const closeRoutes = document.getElementById('close-routes');
  const toggleLater = document.getElementById('toggle-later');
  const closeLater = document.getElementById('close-later');
  const later = document.getElementById('characters-later');
  const storageKey = 'fefw-character-index-state-v1';

  function saveState() {
    const selected = buttons.find(button => button.getAttribute('aria-expanded') === 'true');
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({
        route: selected?.getAttribute('data-character-route') ?? null,
        later: !later.hidden,
      }));
    } catch { /* Navigation still works when browser storage is unavailable. */ }
  }

  function showRoute(selected) {
    for (const button of buttons) {
      const expanded = button === selected;
      button.setAttribute('aria-expanded', String(expanded));
      document.getElementById(button.getAttribute('aria-controls')).hidden = !expanded;
    }
    closeRoutes.disabled = !selected;
  }

  function showLater(expanded) {
    toggleLater.setAttribute('aria-expanded', String(expanded));
    later.hidden = !expanded;
    closeLater.disabled = !expanded;
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      showRoute(button.getAttribute('aria-expanded') === 'true' ? null : button);
      saveState();
    });
  }
  closeRoutes.addEventListener('click', () => {
    const selected = buttons.find(button => button.getAttribute('aria-expanded') === 'true');
    showRoute(null);
    saveState();
    selected?.focus();
  });
  toggleLater.addEventListener('click', () => {
    showLater(later.hidden);
    saveState();
  });
  closeLater.addEventListener('click', () => {
    showLater(false);
    saveState();
    toggleLater.focus();
  });
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(storageKey)); } catch { /* Start collapsed. */ }
  showRoute(buttons.find(button => button.getAttribute('data-character-route') === saved?.route) ?? null);
  showLater(saved?.later === true);
})();
