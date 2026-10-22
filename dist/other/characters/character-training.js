(() => {
  const section = document.querySelector('.character-training');
  if (!section) return;
  const buttons = section.querySelectorAll('[data-training-mode]');
  const panels = section.querySelectorAll('.training-panel');
  for (const button of buttons) button.addEventListener('click', () => {
    for (const item of buttons) item.setAttribute('aria-pressed', String(item === button));
    for (const panel of panels) panel.hidden = panel.id !== 'training-' + button.dataset.trainingMode;
  });
})();
