"""Import the training workbook into JSON and generate all character training panels.

Usage: python -B scripts/sync-character-training.py [workbook.xlsx]
Without a workbook, regenerate pages from data/character-training.json.
"""
import argparse
import html
import json
import re
from pathlib import Path
from zipfile import ZipFile
import posixpath
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
TIERS = ['初級職', '中級職', '上級職', '最上級職', '神将職']
ROUTES = ['カイ編', 'ディートリヒ編', 'セオドラ編', 'レダ編']
MODES = [('shortest', '最短育成', 'B'), ('complete', '完熟育成', 'C')]
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'


def empty_character(character):
    return {'id': character['id'], 'name': character['name'], 'modes': {
        key: {'route': '', 'stages': {tier: [] for tier in TIERS}} for key, _, _ in MODES}}


def add_rounds(character):
    complete = character['modes']['complete']
    if 'rounds' not in complete:
        complete['rounds'] = [{tier: complete['stages'][tier] for tier in TIERS[:3]}]
        complete['rounds'] += [{tier: [] for tier in TIERS[:3]} for _ in range(2)]
    complete['stages'] = {tier: complete['stages'][tier] for tier in TIERS[3:]}
    return character


def read_sheets(path):
    sheets = {}
    with ZipFile(path) as z:
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            strings = [''.join(el.itertext()) for el in ET.fromstring(z.read('xl/sharedStrings.xml'))]
        rels = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
        for s in ET.fromstring(z.read('xl/workbook.xml')).find('s:sheets', NS):
            target = rels[s.get(f'{{{REL}}}id')]
            target = target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/' + target)
            cells = {}
            for c in ET.fromstring(z.read(target)).findall('.//s:sheetData/s:row/s:c', NS):
                if c.find('s:f', NS) is not None:
                    raise ValueError(f"数式ではなく選択値を入力してください: {s.get('name')}/{c.get('r')}")
                val = c.findtext('s:v', '', NS)
                if c.get('t') == 's':
                    val = strings[int(val)]
                elif c.get('t') == 'inlineStr':
                    val = ''.join(c.find('s:is', NS).itertext())
                cells[c.get('r')] = val.strip()
            sheets[s.get('name')] = cells
    return sheets


def import_sheets(sheets, characters):
    result = []
    for c in characters:
        cells = sheets[c['name']]
        if cells.get('A2') != c['name'] or cells.get('B4') != '最短育成' or cells.get('C4') != '完熟育成':
            raise ValueError(f"表の見出しが一致しません: {c['name']}")
        target = empty_character(c)
        for key, _, col in MODES:
            route = cells.get(f'{col}5', '')
            if route and route not in ROUTES:
                raise ValueError(f"推奨ルートが不正です: {c['name']}/{route}")
            target['modes'][key]['route'] = route
            for row in sorted({int(cell[1:]) for cell in cells if re.fullmatch(r'A\d+', cell)}):
                tier = cells.get(f'A{row}')
                value = cells.get(f'{col}{row}', '')
                if tier in TIERS and value:
                    target['modes'][key]['stages'][tier].append(value)
        add_rounds(target)
        for index, col in [(1, 'D'), (2, 'E')]:
            for row in sorted({int(cell[1:]) for cell in cells if re.fullmatch(r'A\d+', cell)}):
                tier, value = cells.get(f'A{row}'), cells.get(f'{col}{row}', '')
                if tier in TIERS and value:
                    if tier not in TIERS[:3]:
                        raise ValueError(f"周回の入力を確認してください: {c['name']}/{col}{row}")
                    target['modes']['complete']['rounds'][index][tier].append(value)
        result.append(target)
    return {'schemaVersion': 2, 'characters': result}


def render(character):
    e = html.escape
    lines = ['        <!-- character-training:start -->',
             '        <section class="character-training" aria-labelledby="training-title">',
             '          <h2 id="training-title">推奨育成ルート</h2>',
             '          <div class="training-buttons" aria-label="育成方法">']
    for i, (key, label, _) in enumerate(MODES):
        lines.append(f'            <button type="button" class="character-control" data-training-mode="{key}" aria-controls="training-{key}" aria-pressed="{str(i == 0).lower()}">{label}</button>')
    lines.append('          </div>')
    for i, (key, label, _) in enumerate(MODES):
        values = character['modes'][key]
        hidden = ' hidden' if i else ''
        lines.append(f'          <div id="training-{key}" class="training-panel" aria-label="{label}"{hidden}>')
        lines.append(f'            <p class="training-route">推奨ルート：<span>{e(values["route"])}</span></p>')
        for period, tiers in [('1部2部', TIERS[:3]), ('3部', TIERS[3:])]:
            if key == 'complete' and period == '1部2部':
                lines.extend(['            <h3>1部2部</h3>',
                              '            <div class="training-rounds-scroll"><table class="training-rounds">',
                              '              <thead><tr><th scope="col">兵種区分</th><th scope="col">1周目</th><th scope="col">2周目</th><th scope="col">3周目</th></tr></thead><tbody>'])
                for tier in tiers:
                    cells = ''.join('<td><ol>' + ''.join(f'<li>{e(name)}</li>' for name in run[tier]) + '</ol></td>' for run in values['rounds'])
                    lines.append(f'              <tr><th scope="row">{tier}</th>{cells}</tr>')
                lines.append('              </tbody></table></div>')
                continue
            lines.extend([f'            <h3>{period}</h3>', '            <dl class="training-stages">'])
            for tier in tiers:
                items = ''.join(f'<li>{e(name)}</li>' for name in values['stages'][tier])
                lines.append(f'              <div><dt>{tier}</dt><dd><ol>{items}</ol></dd></div>')
            lines.append('            </dl>')
        lines.append('          </div>')
    lines.extend(['        </section>', '        <!-- character-training:end -->'])
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('workbook', type=Path, nargs='?')
    args = parser.parse_args()
    characters = json.loads((ROOT / 'data/character-learnsets.json').read_text(encoding='utf-8'))['characters']
    source = ROOT / 'data/character-training.json'
    if args.workbook:
        data = import_sheets(read_sheets(args.workbook), characters)
    elif source.exists():
        data = json.loads(source.read_text(encoding='utf-8'))
    else:
        data = {'schemaVersion': 1, 'characters': [empty_character(c) for c in characters]}
    if data.get('schemaVersion') not in (1, 2) or [(c['id'], c['name']) for c in data['characters']] != [(c['id'], c['name']) for c in characters]:
        raise ValueError('キャラ一覧が一致しません')
    data['characters'] = [add_rounds(c) for c in data['characters']]
    data['schemaVersion'] = 2
    updates = []
    for c in data['characters']:
        page = ROOT / f'dist/other/characters/{c["id"]}/index.html'
        text = page.read_text(encoding='utf-8')
        section = render(c)
        if '<!-- character-training:start -->' in text:
            text, n = re.subn(r'        <!-- character-training:start -->[\s\S]*?<!-- character-training:end -->\n?', '', text)
            assert n == 1
        text, n = re.subn(r'(        <section class="character-skills"[\s\S]*?        </section>)',
                          lambda match: match[1] + '\n' + section, text)
        assert n == 1
        if 'character-training.css' not in text:
            text = text.replace('</head>', '  <link rel="stylesheet" href="../character-training.css?v=1" />\n  </head>')
        if 'character-training.js' not in text:
            text = text.replace('</body>', '  <script src="../character-training.js?v=1" defer></script>\n  </body>')
        text = text.replace('character-training.css?v=1', 'character-training.css?v=2')
        updates.append((page, text))
    source.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for page, text in updates:
        page.write_text(text, encoding='utf-8')
    print(f'{len(updates)} character training panels updated.')


if __name__ == '__main__':
    main()
