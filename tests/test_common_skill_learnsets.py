import copy
import runpy
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from common_skill_learnsets import COMMON_SKILLS, display_ranks, is_common_skill

collect = runpy.run_path(str(ROOT / 'scripts/sync-magic-learners.py'))['collect']
split_names = runpy.run_path(str(ROOT / 'scripts/import-manual-magic.py'))['split_names']


class CommonSkillsTest(unittest.TestCase):
    def test_common_ranks_and_deep_skill(self):
        for skill in COMMON_SKILLS:
            ranks = display_ranks(skill, {})
            for level, rank in enumerate(('D＋', 'C＋', 'B＋', 'A＋', 'S'), 1):
                self.assertEqual(ranks[rank], [f'{skill}Lv.{level}'])
            self.assertEqual(ranks['S＋'], [f'{skill}の深奥'])
        self.assertEqual(display_ranks('指揮術', {}), {})

    def test_merge_keeps_s_magic_without_mutating_source(self):
        source = {'S': ['オーラ', 'オーラ', '白魔術Lv5'], 'S＋': []}
        original = copy.deepcopy(source)
        ranks = display_ranks('白魔術', source)
        self.assertEqual(ranks['S'], ['白魔術Lv.5', 'オーラ'])
        self.assertEqual(source, original)

    def test_import_excludes_common_and_moves_annotated_ranks(self):
        self.assertEqual(list(split_names('白魔術Lv.5、リカバー、バリアー（A＋）', 'S')),
                         [('S', 'リカバー'), ('A＋', 'バリアー')])
        self.assertEqual(list(split_names('黒魔術の深奥', 'S＋')), [])

    def test_reverse_index_excludes_common_skills_but_keeps_magic(self):
        source = {'schemaVersion': 1, 'characters': [
            {'id': 'kai', 'name': 'カイ', 'skills': {'白魔術': {'S': ['オーラ', '白魔術Lv.5'], 'S＋': ['白魔術の深奥']}}}]}
        original = copy.deepcopy(source)
        result = {entry['name']: entry['learners'] for entry in collect(source)['白魔術']}
        self.assertEqual(result, {'オーラ': [{'id': 'kai', 'name': 'カイ', 'rank': 'S'}]})
        self.assertEqual(source, original)


if __name__ == '__main__':
    unittest.main()
