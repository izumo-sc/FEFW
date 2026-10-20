(() => {
  const buttons = [...document.querySelectorAll('[data-magic-skill]')];
  const heading = document.getElementById('magic-heading');
  const table = document.getElementById('magic-table');
  const rows = document.getElementById('magic-rows');
  const empty = document.getElementById('magic-empty');
  const data = window.MAGIC_LEARNERS;

  function render(skill) {
    heading.textContent = skill;
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.magicSkill === skill));
    }
    rows.replaceChildren();
    const entries = data?.[skill];
    if (!Array.isArray(entries)) {
      table.hidden = true;
      empty.hidden = false;
      empty.textContent = '一覧を読み込めませんでした。ページを再読み込みしてください。';
      return;
    }
    for (const entry of entries) {
      const row = document.createElement('tr');
      const name = document.createElement('th');
      name.scope = 'row';
      name.textContent = entry.name;
      const cell = document.createElement('td');
      const list = document.createElement('ul');
      list.className = 'magic-learners';
      for (const learner of entry.learners) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = `../characters/${encodeURIComponent(learner.id)}/`;
        const showRank = !['E', 'E＋', 'E+'].includes(learner.rank);
        link.textContent = showRank ? `${learner.name}（${learner.rank}）` : learner.name;
        item.append(link);
        list.append(item);
      }
      cell.append(list);
      row.append(name, cell);
      rows.append(row);
    }
    table.hidden = entries.length === 0;
    empty.hidden = entries.length !== 0;
    empty.textContent = '修得データは準備中です。';
  }

  for (const button of buttons) {
    button.addEventListener('click', () => render(button.dataset.magicSkill));
  }
  render('剣術');
})();
