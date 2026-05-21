"""Tests for the ported lesson-plan generator.

Covers:
- ``parse_lesson_plan`` strips ``` fences and validates the JSON contract
- ``parse_lesson_plan`` falls back to first ``{...}`` blob on stray prose
- ``LessonPlanValidationError`` on missing required keys
- ``generate_lesson_plan`` happy path with a fake provider
- ``generate_lesson_plan`` requires grade/subject/strand/sub_strand
- ``generate_lesson_plan`` converts 429-ish provider errors into RateLimitError
"""

from __future__ import annotations

import asyncio
import json
from typing import Optional

import pytest

from syncsenta_agents.agents.scheme.batched import RateLimitError
from syncsenta_agents.agents.scheme.lesson_plan import (
    LessonPlan,
    LessonPlanValidationError,
    generate_lesson_plan,
    parse_lesson_plan,
)


VALID_PLAN = {
    "title": "Counting up to 100",
    "grade": "Grade 2",
    "subject": "Mathematics",
    "strand": "Numbers",
    "subStrand": "Whole Numbers",
    "duration": "40 minutes",
    "objectives": [
        "count objects up to 100",
        "write numerals 1-100",
        "identify place value of ones and tens",
    ],
    "keyInquiryQuestion": "How do we count and write numbers up to 100?",
    "introduction": {
        "duration": "5-8 minutes",
        "activities": [
            "Sing the counting song",
            "Quick mental count to 20",
            "Show number cards",
        ],
    },
    "development": {
        "duration": "20-25 minutes",
        "activities": [
            "Group learners into pairs",
            "Use bottle tops to count to 100",
            "Write numerals on slates",
            "Identify tens and ones",
            "Share findings",
        ],
    },
    "conclusion": {
        "duration": "5-8 minutes",
        "activities": [
            "Recap key points",
            "Quick exit ticket: write any number 1-100",
            "Praise effort",
        ],
    },
    "assessment": [
        "Observation during pair work",
        "Exit ticket numerals",
        "Oral counting check",
    ],
    "differentiation": {
        "advanced": "Extend to numbers 100-200 using base-ten blocks.",
        "struggling": "Provide a counting chart and pair with a peer mentor.",
    },
    "resources": [
        "Bottle tops",
        "Slates",
        "Number cards",
        "Counting chart",
        "Base-ten blocks",
    ],
    "teacherReflection": "Did all learners reach 100? Which pairs struggled?",
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


# ── parse_lesson_plan ─────────────────────────────────────────────────────
def test_parse_lesson_plan_happy_path():
    plan = parse_lesson_plan(json.dumps(VALID_PLAN))
    assert isinstance(plan, LessonPlan)
    assert plan.title == "Counting up to 100"
    assert plan.introduction.duration == "5-8 minutes"
    assert len(plan.development.activities) == 5
    assert plan.differentiation.advanced.startswith("Extend")


def test_parse_lesson_plan_strips_markdown_fence():
    raw = "```json\n" + json.dumps(VALID_PLAN) + "\n```"
    plan = parse_lesson_plan(raw)
    assert plan.subStrand == "Whole Numbers"


def test_parse_lesson_plan_recovers_from_stray_prose():
    raw = "Here you go:\n" + json.dumps(VALID_PLAN) + "\nThanks!"
    plan = parse_lesson_plan(raw)
    assert plan.grade == "Grade 2"


def test_parse_lesson_plan_rejects_missing_required_keys():
    bad = dict(VALID_PLAN)
    del bad["teacherReflection"]
    with pytest.raises(LessonPlanValidationError):
        parse_lesson_plan(json.dumps(bad))


def test_parse_lesson_plan_rejects_empty_objectives():
    bad = dict(VALID_PLAN)
    bad["objectives"] = []
    with pytest.raises(LessonPlanValidationError):
        parse_lesson_plan(json.dumps(bad))


def test_parse_lesson_plan_rejects_non_json():
    with pytest.raises(LessonPlanValidationError):
        parse_lesson_plan("not json at all, sorry")


# ── generate_lesson_plan ──────────────────────────────────────────────────
def test_generate_lesson_plan_happy_path():
    provider = _FakeProvider(json.dumps(VALID_PLAN))
    plan = asyncio.run(
        generate_lesson_plan(
            provider,
            grade="Grade 2",
            subject="Mathematics",
            strand="Numbers",
            sub_strand="Whole Numbers",
            slo="By the end... a) count, b) write, c) appreciate",
            term="Term 1",
        )
    )
    assert provider.calls == 1
    assert plan.title == "Counting up to 100"
    # System prompt is the verbatim ported one — guard against rename.
    assert "KICD" in (provider.last_system or "")
    # Prompt must carry the scheme row context through.
    assert "Grade 2" in (provider.last_prompt or "")
    assert "Whole Numbers" in (provider.last_prompt or "")


def test_generate_lesson_plan_requires_core_fields():
    provider = _FakeProvider(json.dumps(VALID_PLAN))
    with pytest.raises(ValueError):
        asyncio.run(
            generate_lesson_plan(
                provider,
                grade="",
                subject="Mathematics",
                strand="Numbers",
                sub_strand="Whole Numbers",
            )
        )
    assert provider.calls == 0


def test_generate_lesson_plan_passes_through_rate_limit_error():
    provider = _FakeProvider("", raise_exc=RateLimitError("RATE_LIMIT"))
    with pytest.raises(RateLimitError):
        asyncio.run(
            generate_lesson_plan(
                provider,
                grade="Grade 2",
                subject="Mathematics",
                strand="Numbers",
                sub_strand="Whole Numbers",
            )
        )


def test_generate_lesson_plan_converts_429_string_to_rate_limit_error():
    provider = _FakeProvider("", raise_exc=RuntimeError("HTTP 429 rate limit"))
    with pytest.raises(RateLimitError):
        asyncio.run(
            generate_lesson_plan(
                provider,
                grade="Grade 2",
                subject="Mathematics",
                strand="Numbers",
                sub_strand="Whole Numbers",
            )
        )


def test_generate_lesson_plan_surfaces_validation_error_on_bad_shape():
    provider = _FakeProvider(json.dumps({"title": "incomplete"}))
    with pytest.raises(LessonPlanValidationError):
        asyncio.run(
            generate_lesson_plan(
                provider,
                grade="Grade 2",
                subject="Mathematics",
                strand="Numbers",
                sub_strand="Whole Numbers",
            )
        )
