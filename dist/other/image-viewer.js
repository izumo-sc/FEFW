(() => {
  const links = document.querySelectorAll('[data-image-viewer]');
  if (!links.length) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'image-viewer';
  dialog.id = 'image-viewer';
  dialog.setAttribute('aria-label', '画像の拡大表示');

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'image-viewer-close';
  closeButton.setAttribute('aria-label', '画像を閉じる');
  closeButton.textContent = '×';

  const image = document.createElement('img');
  image.className = 'image-viewer-image';
  dialog.append(closeButton, image);
  document.body.append(dialog);

  let opener;
  links.forEach((link) => {
    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-controls', dialog.id);
    link.addEventListener('click', (event) => {
      event.preventDefault();
      opener = link;
      image.src = link.href;
      image.alt = link.querySelector('img')?.alt || '拡大画像';
      dialog.showModal();
      document.documentElement.classList.add('image-viewer-open');
      closeButton.focus();
    });
  });

  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('image-viewer-open');
    image.removeAttribute('src');
    opener?.focus({ preventScroll: true });
  });
})();
