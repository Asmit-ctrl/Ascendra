"""Tests for the KSA-balanced worksheet generator.

Covers:
- ``parse_worksheet`` happy path, fence stripping, stray-prose recovery,
  missing-key rejection, short-items rejection, invalid-type rejection, bad
  matching-pair-count rejection.
- ``generate_worksheet`` happy path with fake provider, SchemeRow + grade
  guards, RateLimitError pass-through, 429-string conversion, validation
  surfacing.
- Item discriminated-union dispatch (fill_blank / short_answer /
  problem_solving / matching / reflect).
- SchemeRow key tolerance: camelCase and legacy snake_case both render into
  the prompt context block.
- Lower-primary verb-substitution table is included for Grade 1-3
  non-language; excluded for language subjects and upper-primary grades.
"""

from __future__ import annotations

import asyncio
import json
from typing import Optional

import pytest

from syncsenta_agents.agents.scheme.batched import RateLimitError
from syncsenta_agents.agents.scheme.worksheet import (
    FillBlank,
    Matching,
    ProblemSolving,
    Reflect,
    ShortAnswer,
    Worksheet,
    WorksheetValidationError,
    generate_worksheet,
    parse_worksheet,
)


SCHEME_ROW_CAMEL = {
    "week": 1,
    "lesson": 1,
    "strand": "1.0 Numbers",
    "subStrand": "1.1 Whole Numbers",
    "specificLearningOutcome": (
        "By the end of the sub-strand the learner should be able to: "
        "a) identify whole numbers up to 100, "
        "b) draw numerals 1-100, "
        "c) appreciate the use of numbers in daily life."
    ),
    "keyInquiryQuestion": "How do we use numbers in daily life?",
    "learningExperiences": "Count bottle tops; group in tens; draw numerals on slates",
    "learningResources": "KLB Visionary Mathematics Grade 2; bottle tops; slates",
}


SCHEME_ROW_SNAKE = {
    "strand": "1.0 Numbers",
    "sub_strand": "1.1 Whole Numbers",
    "specific_learning_outcomes": "a) identify b) draw c) appreciate",
    "key_inquiry_questions": "How do we use numbers?",
    "learning_experiences": "Count and group bottle tops",
    "learning_resources": "KLB Visionary Mathematics",
}


VALID_WORKSHEET = {
    "title": "Whole Numbers up to 100",
    "grade": "Grade 2",
    "subject": "Mathematics",
    "strand": "1.0 Numbers",
    "subStrand": "1.1 Whole Numbers",
    "duration": "30 minutes",
    "instructions": "Work on your own. Use a pencil. Read each question carefully.",
    "items": [
        {"type": "fill_blank", "ksa": "knowledge", "prompt": "The number after 47 is _____.", "answer": "48"},
        {"type": "short_answer", "ksa": "knowledge", "prompt": "Name the number that comes before 30.", "answer": "29"},
        {"type": "short_answer", "ksa": "knowledge", "prompt": "Identify the largest of: 56, 65, 67.", "answer": "67"},
        {"type": "short_answer", "ksa": "knowledge", "prompt": "Recall the place value of 4 in 47.", "answer": "Tens"},
        {"type": "problem_solving", "ksa": "skills", "prompt": "Count the bottle tops: 23 + 18.", "answer": "41", "workingHint": "Add the ones first, then the tens."},
        {"type": "problem_solving", "ksa": "skills", "prompt": "Calculate: 50 - 24.", "answer": "26", "workingHint": "Borrow from the tens column."},
        {"type": "short_answer", "ksa": "skills", "prompt": "Solve: 6 + 7.", "answer": "13"},
        {"type": "short_answer", "ksa": "skills", "prompt": "Draw a tally for the number 12.", "answer": "Two groups of five plus two."},
        {"type": "problem_solving", "ksa": "skills", "prompt": "If a basket has 30 mangoes and you take 12, how many remain?", "answer": "18", "workingHint": "Subtract: 30 - 12."},
        {
            "type": "matching", "ksa": "knowledge",
            "prompt": "Match each numeral to its name.",
            "pairs": [
                {"left": "10", "right": "ten"},
                {"left": "20", "right": "twenty"},
                {"left": "50", "right": "fifty"},
                {"left": "100", "right": "one hundred"},
            ],
        },
        {"type": "reflect", "ksa": "attitudes", "prompt": "Appreciate one way you use numbers at home. Write one sentence.", "sampleResponse": "I count my pencils."},
        {"type": "reflect", "ksa": "attitudes", "prompt": "Show how numbers help when buying mandazi at the shop.", "sampleResponse": "Numbers help me know how much to pay."},
    ],
    "extensionChallenge": "Write all the numbers from 90 to 100. Find the largest and smallest.",
    "answerKey": "1. 48  2. 29  3. 67  4. Tens  5. 41  6. 26  7. 13  8. ‖‖ ‖‖ ‖‖   9. 18  10. matching pairs  11-12. open",
}


class _FakeProvider:
    def __init__(self, response: str, raise_exc: Optional[Exception] = None) -> None:
        self.response = response
        self.raise_exc = raise_exc
        self.calls = 0
        self.last_system: Optional[str] = None
        self.last_prompt: Optional[str] = None

    async def generate(self, prompt: str, *, system: Optional[str] = None) -> str:
        self.calls += 1
        self.last_prompt = prompt
        self.last_system = system
        if self.raise_exc is not None:
            raise self.raise_exc
        return self.response


# ── parse_worksheet ─────────────────────────────────────────────────────────
def test_parse_worksheet_happy_path():
    ws = parse_worksheet(json.dumps(VALID_WORKSHEET))
    assert isinstance(ws, Worksheet)
    assert ws.title == "Whole Numbers up to 100"
    assert len(ws.items) == 12
    # Discriminated union dispatched correctly.
    assert isinstance(ws.items[0], FillBlank)
    assert isinstance(ws.items[4], ProblemSolving)
    assert isinstance(ws.items[6], ShortAnswer)
    assert isinstance(ws.items[9], Matching)
    assert isinstance(ws.items[10], Reflect)
    # KSA tagging preserved.
    assert ws.items[0].ksa == "knowledge"
    assert ws.items[4].ksa == "skills"
    assert ws.items[10].ksa == "attitudes"


def test_parse_worksheet_strips_markdown_fence():
    raw = "```json\n" + json.dumps(VALID_WORKSHEET) + "\n```"
    ws = parse_worksheet(raw)
    assert ws.subStrand == "1.1 Whole Numbers"


def test_parse_worksheet_recovers_from_stray_prose():
    raw = "Here is the worksheet:\n" + json.dumps(VALID_WORKSHEET) + "\nDone."
    ws = parse_worksheet(raw)
    assert ws.grade == "Grade 2"


def test_parse_worksheet_rejects_missing_required_keys():
    bad = dict(VALID_WORKSHEET)
    del bad["answerKey"]
    with pytest.raises(WorksheetValidationError):
        parse_worksheet(json.dumps(bad))


def test_parse_worksheet_rejects_too_few_items():
    bad = dict(VALID_WORKSHEET)
    bad["items"] = VALID_WORKSHEET["items"][:3]  # below min_length=6
    with pytest.raises(WorksheetValidationError):
        parse_worksheet(json.dumps(bad))


def test_parse_worksheet_rejects_invalid_item_type():
    bad = json.loads(json.dumps(VALID_WORKSHEET))
    bad["items"][0]["type"] = "unknown_type"
    with pytest.raises(WorksheetValidationError):
        parse_worksheet(json.dumps(bad))


def test_parse_worksheet_rejects_invalid_ksa_label():
    bad = json.loads(json.dumps(VALID_WORKSHEET))
    bad["items"][0]["ksa"] = "metacognition"
    with pytest.raises(WorksheetValidationError):
        parse_worksheet(json.dumps(bad))


def test_parse_worksheet_rejects_matching_with_too_few_pairs():
    bad = json.loads(json.dumps(VALID_WORKSHEET))
    # Find the matching item and drop pairs below min_length=3.
    for it in bad["items"]:
        if it["type"] == "matching":
            it["pairs"] = it["pairs"][:2]
            break
    with pytest.raises(WorksheetValidationError):
        parse_worksheet(json.dumps(bad))


def test_parse_worksheet_rejects_non_json():
    with pytest.raises(WorksheetValidationError):
        parse_worksheet("not json at all")


# ── generate_worksheet ──────────────────────────────────────────────────────
def test_generate_worksheet_happy_path():
    provider = _FakeProvider(json.dumps(VALID_WORKSHEET))
    ws = asyncio.run(
        generate_worksheet(
            provider,
            row=SCHEME_ROW_CAMEL,
            grade="Grade 2",
            subject="Mathematics",
        )
    )
    assert provider.calls == 1
    assert len(ws.items) == 12
    # System prompt is the verbatim ported one.
    assert "KICD" in (provider.last_system or "")
    # User prompt carries SchemeRow context + KSA verb lists.
    assert "Grade 2" in (provider.last_prompt or "")
    assert "1.1 Whole Numbers" in (provider.last_prompt or "")
    assert "KSA-BALANCED ITEM MIX" in (provider.last_prompt or "")
    # SLO from camelCase key should be in the prompt.
    assert "identify whole numbers up to 100" in (provider.last_prompt or "")


def test_generate_worksheet_accepts_legacy_snake_case_row():
    provider = _FakeProvider(json.dumps(VALID_WORKSHEET))
    asyncio.run(
        generate_worksheet(
            provider,
            row=SCHEME_ROW_SNAKE,
            grade="Grade 2",
            subject="Mathematics",
        )
    )
    prompt = provider.last_prompt or ""
    # Snake-case `sub_strand` should still feed the Sub-Strand line.
    assert "1.1 Whole Numbers" in prompt
    # Snake-case SLO should still be picked up.
    assert "a) identify" in prompt


def test_generate_worksheet_requires_grade_and_subject():
    provider = _FakeProvider(json.dumps(VALID_WORKSHEET))
    with pytest.raises(ValueError):
        asyncio.run(
            generate_worksheet(
                provider, row=SCHEME_ROW_CAMEL, grade="", subject="Mathematics"
            )
        )
    assert provider.calls == 0


def test_generate_worksheet_requires_row_with_substrand():
    provider = _FakeProvider(json.dumps(VALID_WORKSHEET))
    with pytest.raises(ValueError):
        asyncio.run(
            generate_worksheet(
                provider,
                row={"strand": "1.0 Numbers"},  # missing subStrand
                grade="Grade 2",
                subject="Mathematics",
            )
        )


def test_generate_worksheet_passes_through_rate_limit_error():
    provider = _FakeProvider("", raise_exc=RateLimitError("RATE_LIMIT"))
    with pytest.raises(RateLimitError):
        asyncio.run(
            generate_worksheet(
                provider,
                row=SCHEME_ROW_CAMEL,
                grade="Grade 2",
                subject="Mathematics",
            )
        )


def test_generate_worksheet_converts_429_string_to_rate_limit_error():
    provider = _FakeProvider("", raise_exc=RuntimeError("HTTP 429 rate limit"))
    with pytest.raises(RateLimitError):
        asyncio.run(
            generate_worksheet(
                provider,
                row=SCHEME_ROW_CAMEL,
                grade="Grade 2",
                subject="Mathematics",
            )
        )


def test_generate_worksheet_surfaces_validation_error_on_bad_shape():
    provider = _FakeProvider(json.dumps({"title": "incomplete"}))
    with pytest.raises(WorksheetValidationError):
        asyncio.run(
            generate_worksheet(
                provider,
                row=SCHEME_ROW_CAMEL,
                grade="Grade 2",
                subject="Mathematics",
            )
        )


# ── Lower-primary verb-substitution prompt logic ────────────────────────────
def test_lower_primary_substitution_present_for_grade2_math():
    provider = _FakeProvider(json.dumps(VALID_WORKSHEET))
    asyncio.run(
        generate_worksheet(
            provider, row=SCHEME_ROW_CAMEL, grade="Grade 2", subject="Mathematics"
        )
    )
    prompt = provider.last_prompt or ""
    assert "LOWER-PRIMARY VERB SUBSTITUTIONS" in prompt
    assert "write → draw" in prompt


def test_lower_primary_substitution_absent_for_language_subject():
    provider = _FakeProvider(json.dumps(VALID_WORKSHEET))
    asyncio.run(
        generate_worksheet(
            provider, row=SCHEME_ROW_CAMEL, grade="Grade 2", subject="English"
        )
    )
    assert "LOWER-PRIMARY VERB SUBSTITUTIONS" not in (provider.last_prompt or "")


def test_lower_primary_substitution_absent_for_upper_primary():
    provider = _FakeProvider(json.dumps(VALID_WORKSHEET))
    asyncio.run(
        generate_worksheet(
            provider, row=SCHEME_ROW_CAMEL, grade="Grade 5", subject="Mathematics"
        )
    )
    assert "LOWER-PRIMARY VERB SUBSTITUTIONS" not in (provider.last_prompt or "")


def test_generate_worksheet_passes_duration_minutes_to_prompt():
    provider = _FakeProvider(json.dumps(VALID_WORKSHEET))
    asyncio.run(
        generate_worksheet(
            provider,
            row=SCHEME_ROW_CAMEL,
            grade="Grade 2",
            subject="Mathematics",
            duration_minutes=45,
        )
    )
    assert "Target duration: 45 minutes" in (provider.last_prompt or "")
