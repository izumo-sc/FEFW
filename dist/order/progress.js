(() => {
  'use strict';
  // Dedicated prototype storage: reverting this feature leaves existing site data intact.
  const storageKey = 'fortune-weave-chart-progress-prototype-v1';
  let saved = {};
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (value && typeof value === 'object' && !Array.isArray(value)) saved = value;
  } catch { /* Progress remains usable when browser storage is unavailable. */ }

  function stepId(chapter, text) {
    let hash = 2166136261;
    for (const char of text.replace(/\s+/g, '')) {
      hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
    }
    return `${chapter}-${(hash >>> 0).toString(36)}`;
  }

  const tracks = [];
  for (const content of document.querySelectorAll('[data-progress-track]')) {
    const steps = [];
    const occurrences = new Map();
    for (const section of content.querySelectorAll('.guide-section')) {
      const heading = section.querySelector('h2');
      for (const paragraph of [...section.querySelectorAll(':scope > p')]) {
        if (!paragraph.textContent.trimStart().startsWith('・')) continue;
        const group = document.createElement('div');
        group.className = 'chart-step';
        const firstLine = paragraph.childNodes[0]?.textContent || paragraph.textContent;
        // Use the complete first line, including any character links, for a stable key.
        const copy = paragraph.cloneNode(true);
        for (const br of [...copy.querySelectorAll('br')]) br.replaceWith('\n');
        const baseKey = stepId(heading?.id || '', copy.textContent.split('\n')[0] || firstLine);
        const occurrence = (occurrences.get(baseKey) || 0) + 1;
        occurrences.set(baseKey, occurrence);
        const key = occurrence === 1 ? baseKey : `${baseKey}-${occurrence}`;
        paragraph.before(group);
        group.append(paragraph);
        while (group.nextElementSibling?.matches('p') &&
               group.nextElementSibling.textContent.trimStart().startsWith('※')) {
          group.append(group.nextElementSibling);
        }
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'chart-step-select';
        button.textContent = 'ここから進める';
        button.setAttribute('aria-label', `${heading?.textContent || ''}・項目${steps.length + 1}を現在位置にする`);
        group.append(button);
        steps.push({ group, button, key, chapter: heading?.textContent || '' });
      }
    }
    if (!steps.length) continue;
    const route = content.dataset.orderContent;
    const found = steps.findIndex(step => step.key === saved[route]);
    tracks.push({ content, steps, route, index: found < 0 ? 0 : found });
  }
  if (!tracks.length) return;

  const panel = document.createElement('nav');
  panel.className = 'chart-progress';
  panel.setAttribute('aria-label', 'チャートの進行');
  const status = document.createElement('p');
  status.className = 'chart-progress-status';
  status.setAttribute('role', 'status');
  const actions = document.createElement('div');
  actions.className = 'chart-progress-actions';
  const back = document.createElement('button');
  back.type = 'button';
  back.textContent = 'ひとつ戻る';
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'chart-progress-next';
  next.textContent = '次へ進む';
  actions.append(back, next);
  panel.append(status, actions);
  document.body.append(panel);
  const activeTrack = () => tracks.find(track => !track.content.hidden);

  function render() {
    const active = activeTrack();
    panel.hidden = !active;
    document.body.classList.toggle('has-chart-progress', Boolean(active));
    for (const track of tracks) {
      track.steps.forEach((step, index) => {
        const current = index === track.index;
        step.group.classList.toggle('is-current', current);
        if (current) step.group.setAttribute('aria-current', 'step');
        else step.group.removeAttribute('aria-current');
        step.button.disabled = current;
        step.button.textContent = current ? '現在位置' : 'ここから進める';
      });
    }
    if (!active) return;
    status.textContent = `${active.steps[active.index].chapter}　${active.index + 1} / ${active.steps.length}`;
    back.disabled = active.index === 0;
    next.disabled = active.index === active.steps.length - 1;
    next.textContent = next.disabled ? '最後の項目' : '次へ進む';
  }

  function move(track, index) {
    if (!track || index < 0 || index >= track.steps.length) return;
    track.index = index;
    saved[track.route] = track.steps[index].key;
    try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { /* Keep in-memory progress. */ }
    render();
    track.steps[index].group.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  back.addEventListener('click', () => {
    const track = activeTrack();
    if (track) move(track, track.index - 1);
  });
  next.addEventListener('click', () => {
    const track = activeTrack();
    if (track) move(track, track.index + 1);
  });
  for (const track of tracks) {
    track.steps.forEach((step, index) => {
      step.button.addEventListener('click', () => move(track, index));
      step.group.addEventListener('click', event => {
        if (event.target.closest('a, button') || window.getSelection()?.toString()) return;
        move(track, index);
      });
    });
    new MutationObserver(() => {
      render();
      if (!track.content.hidden && saved[track.route]) {
        track.steps[track.index].group.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }).observe(track.content, { attributes: true, attributeFilter: ['hidden'] });
  }
  render();
})();
