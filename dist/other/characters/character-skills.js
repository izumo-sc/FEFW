(() => {
  for (const section of document.querySelectorAll('.character-skills')) {
    const buttons = [...section.querySelectorAll('[data-skill-group]')];
    for (const button of buttons) {
      button.addEventListener('click', () => {
        for (const candidate of buttons) {
          const selected = candidate === button;
          candidate.setAttribute('aria-expanded', String(selected));
          const panel = document.getElementById(candidate.getAttribute('aria-controls'));
          panel.hidden = !selected;
        }
      });
    }
  }
})();
