import copy
import runpy
import unittest
from pathlib import Path

M = runpy.run_path(str(Path(__file__).resolve().parents[1] / 'scripts/sync-character-training.py'))


class TrainingTest(unittest.TestCase):
    def source(self):
        return {'入力規則': {'A2': '闘士', 'A3': '兵士', 'B2': '剣士'},
                'カイ': {'A2': 'カイ', 'B4': '最短育成', 'C4': '完熟育成',
                       'B5': 'レダ編', 'C5': 'カイ編', 'A7': '初級職', 'B7': '闘士',
                       'A8': '初級職', 'A9': '初級職', 'B9': '兵士', 'C9': '闘士',
                       'A10': '中級職', 'B10': '剣士'}}

    def test_blank_skipping_order_and_separate_modes(self):
        sheets = self.source()
        original = copy.deepcopy(sheets)
        data = M['import_sheets'](sheets, [{'id': 'kai', 'name': 'カイ'}])
        c = data['characters'][0]
        self.assertEqual(c['modes']['shortest']['route'], 'レダ編')
        self.assertEqual(c['modes']['shortest']['stages']['初級職'], ['闘士', '兵士'])
        self.assertEqual(c['modes']['complete']['rounds'][0]['初級職'], ['闘士'])
        self.assertEqual(c['modes']['complete']['rounds'][0]['中級職'], [])
        self.assertEqual(sheets, original)

    def test_three_rounds_only_for_parts_one_two(self):
        sheets = self.source()
        sheets['カイ'].update({'D7': '兵士', 'E10': '剣士', 'A23': '最上級職'})
        c = M['import_sheets'](sheets, [{'id':'kai','name':'カイ'}])['characters'][0]
        complete = c['modes']['complete']
        self.assertEqual(complete['rounds'][1]['初級職'], ['兵士'])
        self.assertEqual(complete['rounds'][2]['中級職'], ['剣士'])
        self.assertEqual(set(complete['stages']), {'最上級職','神将職'})
        sheets['カイ']['D23'] = '兵士'
        with self.assertRaises(ValueError):
            M['import_sheets'](sheets, [{'id':'kai','name':'カイ'}])

    def test_invalid_route_and_wrong_tier_rejected(self):
        for field, value in [('B5', '全ルート'), ('B7', '剣士')]:
            sheets = self.source()
            sheets['カイ'][field] = value
            with self.assertRaises(ValueError):
                M['import_sheets'](sheets, [{'id': 'kai', 'name': 'カイ'}])

    def test_added_rows_and_safe_render(self):
        sheets = self.source()
        sheets['カイ'].update({'A40': '初級職', 'B40': '闘士'})
        c = M['import_sheets'](sheets, [{'id': 'kai', 'name': 'カイ'}])['characters'][0]
        self.assertEqual(c['modes']['shortest']['stages']['初級職'], ['闘士', '兵士', '闘士'])
        c['modes']['shortest']['stages']['初級職'] = ['<script>test</script>']
        rendered = M['render'](c)
        self.assertNotIn('<script>', rendered)
        self.assertIn('&lt;script&gt;', rendered)
        self.assertEqual(rendered.count('data-training-mode='), 2)
        self.assertIn('aria-label="完熟育成" hidden', rendered)


if __name__ == '__main__':
    unittest.main()
