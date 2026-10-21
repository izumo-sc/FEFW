"""Shared proficiency skills live in code, not per-character JSON."""
import re

COMMON_SKILLS = ('剣術', '槍術', '斧術', '弓術', '格闘術', '黒魔術', '白魔術')
COMMON_RANKS = ('D＋', 'C＋', 'B＋', 'A＋', 'S')
COMMON_LEARNSETS = {
    skill: {**{rank: [f'{skill}Lv.{level}'] for level, rank in enumerate(COMMON_RANKS, 1)},
            'S＋': [f'{skill}の深奥']}
    for skill in COMMON_SKILLS
}


def is_common_skill(name):
    return bool(re.fullmatch(r'(?:剣術|槍術|斧術|弓術|格闘術|黒魔術|白魔術)(?:Lv\.?\s*[1-5]|の深奥)[+＋]?', name))


def display_ranks(skill, ranks):
    """Merge without mutating JSON; tolerate legacy copies of common names."""
    result = {rank: list(dict.fromkeys(name for name in names if not is_common_skill(name)))
              for rank, names in ranks.items()}
    for rank, names in COMMON_LEARNSETS.get(skill, {}).items():
        result[rank] = list(dict.fromkeys(names + result.get(rank, [])))
    return result
