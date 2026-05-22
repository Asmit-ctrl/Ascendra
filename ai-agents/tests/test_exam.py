"""Tests for the ported exam generator.

Covers (mirroring TS:215-327 in
``_inventory/scheme-scribe-ai/supabase/functions/generate-exam/index.ts``):
- ``normalize`` strips leading numbering and collapses non-alnum
- ``validate_scope``: exact + substring strand/sub-strand matching
- ``validate_scope``: practical-task regex filter
- ``validate_scope``: MCQ ``options.length === 4 && answerIndex in [0..3]``
- ``validate_scope``: short-answer non-empty + echo-answer detector
- ``validate_scope``: long-answer requires non-empty rubric
- ``validate_scope``: de-duplication by 80-char question fingerprint
- ``parse_questions``: ``{"questions": [...]}`` and bare array forms,
  fence stripping, stray-prose recovery
- ``generate_exam``: happy path with fake provider, required-field guards,
  RateLimitError propagation, ExamValidationError when all questions filtered
"""

from __future__ import annotations

import asyncio
import json
from typing import Optional

import pytest

from syncsenta_agents.agents.scheme.batched import RateLimitError
from syncsenta_agents.agents.scheme.exam import (
    ExamCounts,
    ExamValidationError,
    LongQ,
    MCQ,
    ShortQ,
    StrandAllocation,
    SubStrandInfo,
    generate_exam,
    normalize,
    parse_questions,
    validate_scope,
)


ALLOCATION = [
    StrandAllocation(
        strandName="1.0 Numbers",
        subStrands=[
            SubStrandInfo(name="1.4 Subtraction", lessons=4),
            SubStrandInfo(name="1.1 Whole Numbers", lessons=6),
        ],
    ),
    StrandAllocation(
        strandName="2.0 Measurement",
        subStrands=[SubStrandInfo(name="2.3 Length", lessons=3)],
    ),
]


def _mcq(**overrides):
    base = {
        "type": "mcq",
        "strand": "1.0 Numbers",
        "subStrand": "1.4 Subtraction",
        "question": "What is 8 minus 3?",
        "options": ["3", "4", "5", "6"],
        "answerIndex": 2,
        "marks": 1,
    }
    base.update(overrides)
    return base


def _short(**overrides):
    base = {
        "type": "short",
        "strand": "1.0 Numbers",
        "subStrand": "1.1 Whole Numbers",
        "question": "Write the number that comes after 47.",
        "expectedAnswer": "48",
        "acceptableKeywords": ["48", "forty", "eight"],
        "marks": 2,
    }
    base.update(overrides)
    return base


def _long(**overrides):
    base = {
        "type": "long",
        "strand": "2.0 Measurement",
        "subStrand": "2.3 Length",
        "question": "Explain how you would measure the length of your desk using hand spans.",
        "rubric": "1 mark: identifies hand span as a non-standard unit. 2 marks: explains placing hands end to end. 2 marks: mentions counting and recording the number of spans.",
        "marks": 5,
    }
    base.update(overrides)
    return base


# ── normalize ───────────────────────────────────────────────────────────────
def test_normalize_strips_leading_numbering():
    assert normalize("1.4 Subtraction") == "subtraction"
    assert normalize("  2.0  Measurement  ") == "measurement"


def test_normalize_collapses_non_alphanumerics():
    assert normalize("Whole-Numbers (basic)!") == "whole numbers basic"


def test_normalize_handles_empty_and_none():
    assert normalize("") == ""
    assert normalize(None) == ""  # type: ignore[arg-type]


# ── validate_scope: scope matching ──────────────────────────────────────────
def test_validate_scope_accepts_exact_label_match():
    out = validate_scope([_mcq()], ALLOCATION)
    assert len(out) == 1
    assert isinstance(out[0], MCQ)
    assert out[0].strand == "1.0 Numbers"
    assert out[0].subStrand == "1.4 Subtraction"


def test_validate_scope_accepts_substring_label_match():
    # LLM returns the un-numbered name; should still match the numbered one
    out = validate_scope(
        [_mcq(strand="Numbers", subStrand="Subtraction")], ALLOCATION
    )
    assert len(out) == 1
    # Canonicalised back to the allocation's exact label.
    assert out[0].strand == "1.0 Numbers"
    assert out[0].subStrand == "1.4 Subtraction"


def test_validate_scope_rejects_out_of_scope():
    out = validate_scope(
        [_mcq(strand="3.0 Geometry", subStrand="3.1 Shapes")], ALLOCATION
    )
    assert out == []


# ── validate_scope: practical-task regex ────────────────────────────────────
@pytest.mark.parametrize(
    "question",
    [
        "Draw the sun and label its parts.",
        "Colour the Kenyan flag using crayons.",
        "Shade half of the rectangle.",
        "Sing the national anthem.",
        "Measure your desk with a ruler.",
        "Ask your partner what their favourite colour is.",
        "Use counters to show 5 + 3.",
    ],
)
def test_validate_scope_drops_practical_tasks(question):
    out = validate_scope([_short(question=question, expectedAnswer="X")], ALLOCATION)
    assert out == []


# ── validate_scope: MCQ answer validation ───────────────────────────────────
def test_validate_scope_drops_mcq_with_wrong_option_count():
    out = validate_scope([_mcq(options=["a", "b", "c"])], ALLOCATION)
    assert out == []


def test_validate_scope_drops_mcq_with_out_of_range_index():
    out = validate_scope([_mcq(answerIndex=7)], ALLOCATION)
    assert out == []


def test_validate_scope_drops_mcq_with_negative_index():
    out = validate_scope([_mcq(answerIndex=-1)], ALLOCATION)
    assert out == []


# ── validate_scope: short answer echo detection ─────────────────────────────
def test_validate_scope_drops_echo_short_answer():
    # Q asks to "Name four members of your family"; A just restates it.
    q = _short(
        question="Name four members of your family.",
        expectedAnswer="Name four family members.",
    )
    out = validate_scope([q], ALLOCATION)
    assert out == []


def test_validate_scope_keeps_real_short_answer():
    q = _short(
        question="Name four members of your family.",
        expectedAnswer="Father, Mother, Brother, Sister",
    )
    out = validate_scope([q], ALLOCATION)
    assert len(out) == 1
    assert isinstance(out[0], ShortQ)


def test_validate_scope_drops_empty_short_answer():
    out = validate_scope([_short(expectedAnswer="   ")], ALLOCATION)
    assert out == []


# ── validate_scope: long answer rubric ──────────────────────────────────────
def test_validate_scope_drops_long_with_empty_rubric():
    out = validate_scope([_long(rubric="   ")], ALLOCATION)
    assert out == []


def test_validate_scope_keeps_long_with_concrete_rubric():
    out = validate_scope([_long()], ALLOCATION)
    assert len(out) == 1
    assert isinstance(out[0], LongQ)


# ── validate_scope: dedup ───────────────────────────────────────────────────
def test_validate_scope_dedupes_near_identical_questions():
    q1 = _mcq(question="What is 8 minus 3?")
    q2 = _mcq(question="What is 8 minus 3?", options=["1", "2", "5", "9"])
    out = validate_scope([q1, q2], ALLOCATION)
    assert len(out) == 1


def test_validate_scope_dedupes_only_within_80_char_fingerprint():
    # Two genuinely different questions — should both survive.
    q1 = _mcq(question="What is 8 minus 3?")
    q2 = _mcq(question="What is 9 minus 4?")
    out = validate_scope([q1, q2], ALLOCATION)
    assert len(out) == 2


# ── parse_questions ─────────────────────────────────────────────────────────
def test_parse_questions_accepts_object_form():
    raw = json.dumps({"questions": [_mcq(), _short()]})
    qs = parse_questions(raw)
    assert len(qs) == 2
    assert qs[0]["type"] == "mcq"


def test_parse_questions_accepts_bare_array():
    raw = json.dumps([_mcq(), _long()])
    qs = parse_questions(raw)
    assert len(qs) == 2


def test_parse_questions_strips_code_fence():
    raw = "```json\n" + json.dumps({"questions": [_mcq()]}) + "\n```"
    qs = parse_questions(raw)
    assert len(qs) == 1


def test_parse_questions_recovers_from_stray_prose():
    raw = "Here is the exam:\n" + json.dumps({"questions": [_mcq()]}) + "\nDone."
    qs = parse_questions(raw)
    assert len(qs) == 1


def test_parse_questions_rejects_non_json():
    with pytest.raises(ExamValidationError):
        parse_questions("definitely not json")


def test_parse_questions_rejects_non_array_questions_field():
    with pytest.raises(ExamValidationError):
        parse_questions(json.dumps({"questions": "oops"}))


# ── generate_exam ───────────────────────────────────────────────────────────
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


def test_generate_exam_happy_path():
    payload = {"questions": [_mcq(), _short(), _long()]}
    provider = _FakeProvider(json.dumps(payload))
    qs = asyncio.run(
        generate_exam(
            provider,
            grade="Grade 2",
            subject="Mathematics",
            term="Term 1",
            allocation=ALLOCATION,
        )
    )
    assert provider.calls == 1
    assert len(qs) == 3
    # System prompt must carry the KICD scope rule + the allocation labels.
    assert "NON-NEGOTIABLE SCOPE RULE" in (provider.last_system or "")
    assert "1.4 Subtraction" in (provider.last_system or "")
    # User prompt carries grade/subject/term context.
    assert "Grade 2" in (provider.last_prompt or "")


def test_generate_exam_requires_core_fields():
    provider = _FakeProvider(json.dumps({"questions": [_mcq()]}))
    with pytest.raises(ValueError):
        asyncio.run(
            generate_exam(
                provider,
                grade="",
                subject="Mathematics",
                term="Term 1",
                allocation=ALLOCATION,
            )
        )
    assert provider.calls == 0


def test_generate_exam_requires_allocation():
    provider = _FakeProvider(json.dumps({"questions": [_mcq()]}))
    with pytest.raises(ValueError):
        asyncio.run(
            generate_exam(
                provider,
                grade="Grade 2",
                subject="Mathematics",
                term="Term 1",
                allocation=[],
            )
        )


def test_generate_exam_passes_through_rate_limit_error():
    provider = _FakeProvider("", raise_exc=RateLimitError("RATE_LIMIT"))
    with pytest.raises(RateLimitError):
        asyncio.run(
            generate_exam(
                provider,
                grade="Grade 2",
                subject="Mathematics",
                term="Term 1",
                allocation=ALLOCATION,
            )
        )


def test_generate_exam_converts_429_string_to_rate_limit_error():
    provider = _FakeProvider("", raise_exc=RuntimeError("HTTP 429 rate limit"))
    with pytest.raises(RateLimitError):
        asyncio.run(
            generate_exam(
                provider,
                grade="Grade 2",
                subject="Mathematics",
                term="Term 1",
                allocation=ALLOCATION,
            )
        )


def test_generate_exam_raises_when_all_questions_filtered():
    # Every question is out of scope — should raise rather than return [].
    out_of_scope = _mcq(strand="9.0 Astronomy", subStrand="9.1 Stars")
    provider = _FakeProvider(json.dumps({"questions": [out_of_scope]}))
    with pytest.raises(ExamValidationError):
        asyncio.run(
            generate_exam(
                provider,
                grade="Grade 2",
                subject="Mathematics",
                term="Term 1",
                allocation=ALLOCATION,
            )
        )


def test_generate_exam_passes_counts_to_prompt():
    payload = {"questions": [_mcq()]}
    provider = _FakeProvider(json.dumps(payload))
    asyncio.run(
        generate_exam(
            provider,
            grade="Grade 2",
            subject="Mathematics",
            term="Term 1",
            allocation=ALLOCATION,
            counts=ExamCounts(mcq=20, short=10, long=3),
        )
    )
    sys_prompt = provider.last_system or ""
    assert "20 multiple-choice questions" in sys_prompt
    assert "10 short-answer questions" in sys_prompt
    assert "3 long/structured questions" in sys_prompt


def test_generate_exam_uses_kiswahili_language_for_kiswahili_subject():
    payload = {
        "questions": [
            _mcq(strand="1.0 Numbers", subStrand="1.4 Subtraction"),
        ]
    }
    provider = _FakeProvider(json.dumps(payload))
    asyncio.run(
        generate_exam(
            provider,
            grade="Grade 2",
            subject="Kiswahili",
            term="Term 1",
            allocation=ALLOCATION,
        )
    )
    sys_prompt = provider.last_system or ""
    # Both occurrences of "in Kiswahili" should appear (language + vocab clause).
    assert "in Kiswahili" in sys_prompt
