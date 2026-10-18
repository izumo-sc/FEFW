(() => {
  const buttons = [...document.querySelectorAll('[data-character-route]')];
  const closeRoutes = document.getElementById('close-routes');
  const toggleLater = document.getElementById('toggle-later');
  const closeLater = document.getElementById('close-later');
  const later = document.getElementById('characters-later');

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
    });
  }
  closeRoutes.addEventListener('click', () => {
    const selected = buttons.find(button => button.getAttribute('aria-expanded') === 'true');
    showRoute(null);
    selected?.focus();
  });
  toggleLater.addEventListener('click', () => showLater(later.hidden));
  closeLater.addEventListener('click', () => {
    showLater(false);
    toggleLater.focus();
  });
  showRoute(null);
  showLater(false);
})();
