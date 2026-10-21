"""Sync character skill tables and magic learners from the shared JSON.

Usage: python scripts/sync-character-skills.py [path/to/character-learnsets.json]
Only the skill tables, stylesheet version and skill script tags are changed.
"""
import argparse
import html
import json
import re
import runpy
from pathlib import Path
from common_skill_learnsets import display_ranks

SKILLS = ['剣術', '槍術', '斧術', '弓術', '格闘術', '黒魔術', '白魔術', '指揮術', '歩兵術', '馬術', '重装術', '飛行術']
LEVELS = ['E', 'E＋', 'D', 'D＋', 'C', 'C＋', 'B', 'B＋', 'A', 'A＋', 'S', 'S＋']
GROUPS = [('weapons', '剣・槍・斧・弓'), ('magic-command', '格闘・黒・白・指揮'), ('movement', '歩兵・馬・重装・飛行')]


def read_learnsets(path):
    data = json.loads(path.read_text(encoding='utf-8'))
    if data.get('schemaVersion') != 1:
        raise ValueError('Unsupported schemaVersion')
    seen = set()
    for character in data['characters']:
        identifier = character['id']
        if not re.fullmatch(r'[a-z][a-z0-9-]*', identifier) or identifier in seen:
            raise ValueError(f'Invalid or duplicate character ID: {identifier}')
        seen.add(identifier)
        if not isinstance(character['name'], str) or not character['name'].strip():
            raise ValueError(f'Missing character name: {identifier}')
        if set(character['skills']) != set(SKILLS):
            raise ValueError(f'Expected all 12 skills: {identifier}')
        for skill, ranks in character['skills'].items():
            if set(ranks) != set(LEVELS):
                raise ValueError(f'Expected all 12 ranks: {identifier}/{skill}')
            for rank, names in ranks.items():
                if not isinstance(names, list) or any(not isinstance(name, str) or not name.strip() for name in names):
                    raise ValueError(f'Expected an array of names: {identifier}/{skill}/{rank}')
    return data


def render(values):
    escape = lambda v: html.escape(v).replace('\r\n', '\n').replace('\n', '<br>')
    lines = ['        <section class="character-skills" aria-labelledby="character-skills-title">',
             '          <h2 id="character-skills-title">スキル・戦技習得表</h2>',
             '          <div class="character-skill-buttons" aria-label="表示する技能">']
    for i, (key, label) in enumerate(GROUPS):
        lines.append(f'            <button type="button" class="character-control" id="skills-button-{key}" data-skill-group="{key}" aria-controls="skills-{key}" aria-expanded="{str(i == 0).lower()}">{label}</button>')
    lines.append('          </div>')
    for i, (key, _) in enumerate(GROUPS):
        hidden = ' hidden' if i else ''
        lines.extend([f'          <div class="character-skills-scroll" id="skills-{key}" role="region" aria-labelledby="skills-button-{key}"{hidden}>',
                      f'            <table class="character-skills-table" aria-labelledby="skills-button-{key}">',
                      '              <thead><tr><th scope="col">技能Lv</th>' + ''.join(f'<th scope="col">{s}</th>' for s in SKILLS[i*4:i*4+4]) + '</tr></thead>',
                      '              <tbody>'])
        for rank, level in enumerate(LEVELS):
            lines.append(f'                <tr><th scope="row">{level}</th>' + ''.join(f'<td>{escape(values[skill][rank])}</td>' for skill in range(i*4, i*4+4)) + '</tr>')
        lines.extend(['              </tbody>', '            </table>', '          </div>'])
    lines.append('        </section>')
    return '\n'.join(lines)


def main():
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path, nargs='?', default=root / 'data/character-learnsets.json')
    args = parser.parse_args()
    data = read_learnsets(args.source)
    directory = root / 'dist/other/characters'
    pages = {path.parent.name: path for path in directory.glob('*/index.html')}
    identifiers = {character['id'] for character in data['characters']}
    if identifiers != set(pages):
        raise ValueError({'json_only': sorted(identifiers-set(pages)), 'page_only': sorted(set(pages)-identifiers)})
    updates = []
    for character in data['characters']:
        path = pages[character['id']]
        text = path.read_text(encoding='utf-8')
        match = re.search(r'<h1>(.*?)</h1>', text)
        if not match or html.unescape(match.group(1)) != character['name']:
            raise ValueError(f"Character name mismatch: {character['id']}")
        ranks_by_skill = {skill: display_ranks(skill, character['skills'][skill]) for skill in SKILLS}
        values = [['\n'.join(ranks_by_skill[skill][rank]) for rank in LEVELS] for skill in SKILLS]
        section = render(values)
        if 'class="character-skills"' in text:
            changed, count = re.subn(r'        <section class="character-skills"[\s\S]*?        </section>', lambda _: section, text)
            assert count == 1, character['id']
        else:
            marker = '        <p class="character-pending">'
            assert text.count(marker) == 1, character['id']
            changed = text.replace(marker, section + '\n' + marker, 1)
        changed = re.sub(r'\.\./characters\.css\?v=\d+', '../characters.css?v=7', changed)
        if 'character-skills.js' not in changed:
            changed = changed.replace('  </body>', '    <script src="../character-skills.js?v=1" defer></script>\n  </body>')
        if changed != text:
            updates.append((path, changed))
    magic = runpy.run_path(str(root / 'scripts/sync-magic-learners.py'))
    result = magic['collect'](data)
    # Validate and render both views before writing any output.
    for path, text in updates:
        path.write_text(text, encoding='utf-8')
    magic['write_data'](root, result)
    print(f"{len(data['characters'])} character learnsets verified; {len(updates)} pages updated.")


if __name__ == '__main__':
    main()
