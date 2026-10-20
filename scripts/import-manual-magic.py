"""Import only used magic names from character sheets, then sync both site views.

Usage: python scripts/import-manual-magic.py path/to/manual-workbook.xlsx
The workbook is read only. Validation candidate sheets are never imported.
"""
import argparse
import json
import posixpath
import re
import runpy
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET

NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
LEVELS = ['E', 'E＋', 'D', 'D＋', 'C', 'C＋', 'B', 'B＋', 'A', 'A＋', 'S', 'S＋']
MAGIC = ('黒魔術', '白魔術')


def split_names(value, rank):
    for part in re.split(r'[、/／\r\n]+', value):
        name = part.strip()
        if not name:
            continue
        match = re.fullmatch(r'(.*?)\s*[（(]\s*([EDCBAS][+＋]?)\s*[）)]', name)
        target = rank
        if match:
            name = match[1].strip()
            target = match[2].replace('+', '＋')
        if re.fullmatch(r'(黒|白)魔術(?:Lv\.?\s*[1-5]|の深奥)[+＋]?', name):
            continue
        yield target, name


def extract(workbook, character_names):
    result = {}
    with ZipFile(workbook) as archive:
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            strings = [''.join(t.text or '' for t in si.findall('s:t', NS) + si.findall('s:r/s:t', NS))
                       for si in ET.fromstring(archive.read('xl/sharedStrings.xml'))]
        targets = {r.attrib['Id']: r.attrib['Target'] for r in ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))}
        for sheet in ET.fromstring(archive.read('xl/workbook.xml')).find('s:sheets', NS):
            name = sheet.get('name')
            if name not in character_names:
                continue
            target = targets[sheet.attrib[f'{{{REL}}}id']]
            target = target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/' + target)
            cells = {}
            for cell in ET.fromstring(archive.read(target)).findall('.//s:sheetData/s:row/s:c', NS):
                value = cell.findtext('s:v', default='', namespaces=NS)
                if cell.get('t') == 's':
                    value = strings[int(value)]
                elif cell.get('t') == 'inlineStr':
                    value = ''.join(t.text or '' for t in cell.findall('s:is/s:t', NS) + cell.findall('s:is/s:r/s:t', NS))
                cells[cell.get('r')] = value
            if cells.get('A9') != '技能' or [cells.get(f'{chr(66+i)}9') for i in range(12)] != LEVELS:
                raise ValueError(f'Unexpected skill table layout: {name}')
            result[name] = {}
            for skill in MAGIC:
                rows = [r for r in range(10, 22) if cells.get(f'A{r}') == skill]
                if len(rows) != 1:
                    raise ValueError(f'Missing magic row: {name}/{skill}')
                ranks = {rank: [] for rank in LEVELS}
                for i, rank in enumerate(LEVELS):
                    for target_rank, entry in split_names(cells.get(f'{chr(66+i)}{rows[0]}', ''), rank):
                        if entry not in ranks[target_rank]:
                            ranks[target_rank].append(entry)
                result[name][skill] = ranks
    if set(result) != set(character_names):
        raise ValueError(f'Missing character sheets: {set(character_names)-set(result)}')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('workbook', type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    source = root / 'data/character-learnsets.json'
    data = json.loads(source.read_text(encoding='utf-8'))
    learned = extract(args.workbook, {c['name'] for c in data['characters']})
    for character in data['characters']:
        character['skills'].update(learned[character['name']])
    source.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    # Both output views continue to read the same shared JSON.
    import sys
    sys.argv = ['sync-character-skills.py']
    runpy.run_path(str(root / 'scripts/sync-character-skills.py'), run_name='__main__')


if __name__ == '__main__':
    main()
