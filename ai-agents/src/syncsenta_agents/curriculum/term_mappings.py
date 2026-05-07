"""Term-to-strand allocation rules.

Hand-ported from scheme-scribe-ai/src/data/curriculum/term-mappings.ts
(NOT auto-generated — this file contains logic, not just data).
"""

from __future__ import annotations

import math
from typing import Dict, List, Optional

from .types import StrandInfo, SubStrandInfo


KISWAHILI_LP_TERM_START: Dict[str, Dict[str, int]] = {
    "Grade 1": {"Term 1": 0, "Term 2": 4, "Term 3": 7},
    "Grade 2": {"Term 1": 0, "Term 2": 6, "Term 3": -1},
    "Grade 3": {"Term 1": 0, "Term 2": 4, "Term 3": 7},
}

WEEKS_PER_TERM = 11
WEEKS_PER_MADA = 3


def is_lower_primary_kiswahili(grade: str, subject: str) -> bool:
    if subject != "Kiswahili":
        return False
    try:
        num = int(grade.replace("Grade ", ""))
    except ValueError:
        return False
    return 1 <= num <= 3


def get_kiswahili_lp_term_allocation(
    grade: str, term: str
) -> Optional[List[Dict[str, object]]]:
    from . import get_hardcoded_strands  # local import to break cycle

    all_strands = get_hardcoded_strands(grade, "Kiswahili")
    if not all_strands:
        return None

    term_starts = KISWAHILI_LP_TERM_START.get(grade)
    if not term_starts:
        return None

    start_idx = term_starts.get(term)
    if start_idx is None or start_idx < 0:
        return None

    max_mada = math.ceil(WEEKS_PER_TERM / WEEKS_PER_MADA)
    end_idx = min(start_idx + max_mada, len(all_strands))

    return [
        {"strandName": mada["name"], "subStrands": mada["subStrands"]}
        for mada in all_strands[start_idx:end_idx]
    ]


StrandTermRule = Dict[str, List[str]]

STRAND_TERM_RULES: Dict[str, StrandTermRule] = {
    "Environmental Activities": {
        "Term 1": ["Social"],
        "Term 2": ["Natural"],
        "Term 3": ["Resources"],
    },
    "Creative Activities": {
        "Term 1": ["Creating"],
        "Term 2": ["Performing"],
        "Term 3": ["Appreciation"],
    },
    "Science & Technology": {
        "Term 1": ["Living Things"],
        "Term 2": ["Matter"],
        "Term 3": ["Force", "Energy"],
    },
    "Creative Arts": {
        "Term 1": ["Creating"],
        "Term 2": ["Performing"],
        "Term 3": ["Appreciation"],
    },
    "English Activities": {
        "Term 1": ["Listening and Speaking"],
        "Term 2": ["Reading"],
        "Term 3": ["Language Use", "Writing"],
    },
}

MATH_SUBJECT = "Mathematics"


def get_term_allocation(
    grade: str, subject: str, term: str
) -> Optional[List[Dict[str, object]]]:
    from . import get_hardcoded_strands

    if is_lower_primary_kiswahili(grade, subject):
        return get_kiswahili_lp_term_allocation(grade, term)

    all_strands = get_hardcoded_strands(grade, subject)
    if not all_strands:
        return None

    try:
        term_index = ["Term 1", "Term 2", "Term 3"].index(term)
    except ValueError:
        return None

    if subject == MATH_SUBJECT:
        return _math_term_allocation(all_strands, term_index)

    rules = STRAND_TERM_RULES.get(subject)
    if rules:
        return _explicit_term_allocation(all_strands, rules, term)

    return _sequential_term_allocation(all_strands, term_index)


def _math_term_allocation(
    all_strands: List[StrandInfo], term_index: int
) -> List[Dict[str, object]]:
    numbers_strand = next(
        (s for s in all_strands if "number" in s["name"].lower()), None
    )
    other_strands = [s for s in all_strands if "number" not in s["name"].lower()]

    if term_index == 2:
        return [{"strandName": s["name"], "subStrands": s["subStrands"]} for s in other_strands]

    if not numbers_strand:
        return []
    subs = numbers_strand["subStrands"]
    half = math.ceil(len(subs) / 2)
    term_subs = subs[:half] if term_index == 0 else subs[half:]
    return [{"strandName": numbers_strand["name"], "subStrands": term_subs}]


def _explicit_term_allocation(
    all_strands: List[StrandInfo], rules: StrandTermRule, term: str
) -> List[Dict[str, object]]:
    keywords = rules.get(term)
    if not keywords:
        return []
    matched = [
        s for s in all_strands
        if any(k.lower() in s["name"].lower() for k in keywords)
    ]
    return [{"strandName": s["name"], "subStrands": s["subStrands"]} for s in matched]


def _sequential_term_allocation(
    all_strands: List[StrandInfo], term_index: int
) -> List[Dict[str, object]]:
    items: List[Dict[str, object]] = []
    for strand in all_strands:
        for ss in strand["subStrands"]:
            items.append({"strand": strand, "subStrand": ss})

    total_lessons = sum(int(i["subStrand"].get("lessons", 0)) for i in items)
    target_per_term = math.ceil(total_lessons / 3)

    accumulated = 0
    current_term_idx = 0
    term_buckets: List[List[Dict[str, object]]] = [[], [], []]

    for item in items:
        term_buckets[current_term_idx].append(item)
        accumulated += int(item["subStrand"].get("lessons", 0))
        if accumulated >= target_per_term and current_term_idx < 2:
            accumulated = 0
            current_term_idx += 1

    grouped: Dict[str, Dict[str, object]] = {}
    for item in term_buckets[term_index]:
        strand_name = item["strand"]["name"]
        if strand_name in grouped:
            grouped[strand_name]["subStrands"].append(item["subStrand"])  # type: ignore[union-attr]
        else:
            grouped[strand_name] = {
                "strandName": strand_name,
                "subStrands": [item["subStrand"]],
            }
    return list(grouped.values())


def get_term_lesson_count(
    allocation: List[Dict[str, object]],
) -> int:
    return sum(
        sum(int(ss.get("lessons", 0)) for ss in a["subStrands"])  # type: ignore[union-attr]
        for a in allocation
    )


__all__ = [
    "is_lower_primary_kiswahili",
    "get_kiswahili_lp_term_allocation",
    "get_term_allocation",
    "get_term_lesson_count",
    "STRAND_TERM_RULES",
]
