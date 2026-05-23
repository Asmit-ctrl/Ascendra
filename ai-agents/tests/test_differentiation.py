"""Tests for the three-tier differentiation generator.

Covers:
- ``parse_differentiation``: happy path, fence stripping, stray-prose
  recovery, missing-key rejection, empty-tier rejection, invalid-KSA
  rejection, non-JSON rejection.
- ``generate_differentiation``: happy path, required-lesson-plan-key guard,
  RateLimitError pass-through, 429-string conversion, validation-error
  surfacing.
- Lower-primary verb-substitution table is included in the prompt when
  ``grade ∈ {Grade 1, Grade 2, Grade 3}`` AND the lesson plan's subject is
  non-language; excluded for language subjects and upper-primary grades.
- Kiswahili language switch surfaces the Kiswahili verb lists.

Mirrors the structure of ``tests/test_unpacker.py`` and
``tests/test_lesson_plan.py``.
"""

from __future__ import annotations

import asyncio
import json
from typing import Optional

import pytest

from syncsenta_agents.agents.scheme.batched import RateLimitError
from syncsenta_agents.agents.scheme.differentiation import (
    Differentiation,
    DifferentiationValidationError,
    generate_differentiation,
    parse_differentiation,
)


VALID_LESSON_PLAN = {
    "title": "Counting up to 100",
    "grade": "Grade 2",
    "subject": "Mathematics",
    "strand": "Numbers",
    "subStrand": "Whole Numbers",
    "duration": "40 minutes",
    "objectives": [
        "count objects up to 100",
        "write numerals 1-100",
        "appreciate counting in daily life",
    ],
    "keyInquiryQuestion": "How do we count and write numbers up to 100?",
    "introduction": {
        "duration": "5-8 minutes",
        "activities": ["Sing the counting song", "Quick mental count to 20"],
    },
    "development": {
        "duration": "20-25 minutes",
        "activities": [
            "Pair learners and give each pair 100 bottle tops",
            "Count bottle tops in groups of ten",
            "Write each numeral on a slate",
        ],
    },
    "conclusion": {
        "duration": "5-8 minutes",
        "activities": ["Recap key counting rules", "Exit ticket: write any number 1-100"],
    },
    "assessment": ["Observation during pair work", "Exit ticket numerals"],
    "differentiation": {"advanced": "stretch", "struggling": "support"},
    "resources": ["Bottle tops", "Slates", "Number cards"],
    "teacherReflection": "Which pairs struggled with tens?",
}


def _tier(profile: str, *, ksa: str = "skills") -> dict:
    return {
        "learnerProfile": profile,
        "adaptations": [
            {
                "activity": "Count bottle tops in groups of ten using a tens frame",
                "note": "Concrete representation supports place-value access.",
                "ksa": ksa,
            },
            {
                "activity": "Draw numerals on a slate after counting each group",
                "note": "Multisensory cue reinforces the verbal-to-symbol link.",
                "ksa": "knowledge",
            },
        ],
        "resourceSwaps": ["Bottle tops grouped in ten-cups instead of loose piles"],
        "assessmentCues": [
            "Counts a pile of 30 bottle tops with no errors.",
            "Draws numerals 1-30 legibly on slate.",
        ],
    }


VALID_DIFFERENTIATION = {
    "title": "Counting up to 100",
    "grade": "Grade 2",
    "subject": "Mathematics",
    "strand": "Numbers",
    "subStrand": "Whole Numbers",
    "objectives": [
        "count objects up to 100",
        "write numerals 1-100",
        "appreciate counting in daily life",
    ],
    "support": _tier(
        "Learners who need additional time and multisensory cues to access place-value concepts.",
        ksa="knowledge",
    ),
    "onGrade": _tier(
        "Learners pacing with the lesson's stated objectives.",
        ksa="skills",
    ),
    "extension": _tier(
        "Learners ready to apply counting to real-world transfer tasks.",
        ksa="attitudes",
    ),
    "inclusionStrategies": ["Flexible seating", "Visual schedule"],
    "coreCompetencies": ["Communication", "Critical thinking"],
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


# ── parse_differentiation ──────────────────────────────────────────────────
def test_parse_differentiation_happy_path():
    diff = parse_differentiation(json.dumps(VALID_DIFFERENTIATION))
    assert isinstance(diff, Differentiation)
    assert diff.grade == "Grade 2"
    assert len(diff.support.adaptations) == 2
    assert diff.support.adaptations[0].ksa == "knowledge"
    assert len(diff.onGrade.adaptations) == 2
    assert diff.extension.adaptations[0].ksa == "attitudes"
    assert len(diff.support.assessmentCues) == 2


def test_parse_differentiation_strips_markdown_fence():
    raw = "```json\n" + json.dumps(VALID_DIFFERENTIATION) + "\n```"
    diff = parse_differentiation(raw)
    assert diff.subject == "Mathematics"


def test_parse_differentiation_recovers_from_stray_prose():
    raw = "Sure, here's the differentiation:\n" + json.dumps(VALID_DIFFERENTIATION) + "\nLet me know!"
    diff = parse_differentiation(raw)
    assert diff.grade == "Grade 2"


def test_parse_differentiation_rejects_missing_tier():
    bad = dict(VALID_DIFFERENTIATION)
    del bad["extension"]
    with pytest.raises(DifferentiationValidationError):
        parse_differentiation(json.dumps(bad))


def test_parse_differentiation_rejects_empty_adaptations():
    bad = json.loads(json.dumps(VALID_DIFFERENTIATION))
    bad["support"]["adaptations"] = []
    with pytest.raises(DifferentiationValidationError):
        parse_differentiation(json.dumps(bad))


def test_parse_differentiation_rejects_empty_assessment_cues():
    bad = json.loads(json.dumps(VALID_DIFFERENTIATION))
    bad["onGrade"]["assessmentCues"] = []
    with pytest.raises(DifferentiationValidationError):
        parse_differentiation(json.dumps(bad))


def test_parse_differentiation_rejects_invalid_ksa_label():
    bad = json.loads(json.dumps(VALID_DIFFERENTIATION))
    bad["support"]["adaptations"][0]["ksa"] = "metacognition"  # not in Literal
    with pytest.raises(DifferentiationValidationError):
        parse_differentiation(json.dumps(bad))


def test_parse_differentiation_rejects_empty_objectives():
    bad = dict(VALID_DIFFERENTIATION)
    bad["objectives"] = []
    with pytest.raises(DifferentiationValidationError):
        parse_differentiation(json.dumps(bad))


def test_parse_differentiation_rejects_non_json():
    with pytest.raises(DifferentiationValidationError):
        parse_differentiation("definitely not json")


def test_parse_differentiation_allows_empty_resource_swaps():
    payload = json.loads(json.dumps(VALID_DIFFERENTIATION))
    payload["support"]["resourceSwaps"] = []  # optional — should still validate
    diff = parse_differentiation(json.dumps(payload))
    assert diff.support.resourceSwaps == []


# ── generate_differentiation ───────────────────────────────────────────────
def test_generate_differentiation_happy_path():
    provider = _FakeProvider(json.dumps(VALID_DIFFERENTIATION))
    diff = asyncio.run(
        generate_differentiation(provider, lesson_plan=VALID_LESSON_PLAN)
    )
    assert provider.calls == 1
    assert diff.title == "Counting up to 100"
    assert "KICD" in (provider.last_system or "")
    prompt = provider.last_prompt or ""
    # Prompt must carry the lesson plan's curricular context.
    assert "Grade 2" in prompt
    assert "Whole Numbers" in prompt
    # Prompt must carry the lesson plan's activities verbatim so the model
    # adapts them rather than regenerates.
    assert "bottle tops" in prompt
    # Tier definitions must be in the prompt.
    assert "SUPPORT" in prompt and "EXTENSION" in prompt
    # KSA verb lists must be embedded.
    assert "KICD KSA VERB LISTS" in prompt


def test_generate_differentiation_requires_grade_in_lesson_plan():
    bad_plan = dict(VALID_LESSON_PLAN)
    bad_plan["grade"] = ""
    provider = _FakeProvider(json.dumps(VALID_DIFFERENTIATION))
    with pytest.raises(ValueError):
        asyncio.run(generate_differentiation(provider, lesson_plan=bad_plan))
    assert provider.calls == 0


def test_generate_differentiation_requires_objectives_in_lesson_plan():
    bad_plan = dict(VALID_LESSON_PLAN)
    bad_plan["objectives"] = []
    provider = _FakeProvider(json.dumps(VALID_DIFFERENTIATION))
    with pytest.raises(ValueError):
        asyncio.run(generate_differentiation(provider, lesson_plan=bad_plan))
    assert provider.calls == 0


def test_generate_differentiation_passes_through_rate_limit_error():
    provider = _FakeProvider("", raise_exc=RateLimitError("RATE_LIMIT"))
    with pytest.raises(RateLimitError):
        asyncio.run(
            generate_differentiation(provider, lesson_plan=VALID_LESSON_PLAN)
        )


def test_generate_differentiation_converts_429_string_to_rate_limit_error():
    provider = _FakeProvider("", raise_exc=RuntimeError("HTTP 429 too many requests"))
    with pytest.raises(RateLimitError):
        asyncio.run(
            generate_differentiation(provider, lesson_plan=VALID_LESSON_PLAN)
        )


def test_generate_differentiation_surfaces_validation_error_on_bad_shape():
    provider = _FakeProvider(json.dumps({"title": "incomplete"}))
    with pytest.raises(DifferentiationValidationError):
        asyncio.run(
            generate_differentiation(provider, lesson_plan=VALID_LESSON_PLAN)
        )


# ── Lower-primary verb-substitution prompt logic ───────────────────────────
def test_lower_primary_substitution_present_for_grade2_math():
    provider = _FakeProvider(json.dumps(VALID_DIFFERENTIATION))
    asyncio.run(generate_differentiation(provider, lesson_plan=VALID_LESSON_PLAN))
    prompt = provider.last_prompt or ""
    assert "LOWER-PRIMARY VERB SUBSTITUTIONS" in prompt
    # A couple of representative entries from the table.
    assert "write → draw" in prompt
    assert "read → observe" in prompt


def test_lower_primary_substitution_absent_for_language_subject():
    lp = dict(VALID_LESSON_PLAN)
    lp["subject"] = "English"  # language subject is exempt
    provider = _FakeProvider(json.dumps(VALID_DIFFERENTIATION))
    asyncio.run(generate_differentiation(provider, lesson_plan=lp))
    assert "LOWER-PRIMARY VERB SUBSTITUTIONS" not in (provider.last_prompt or "")


def test_lower_primary_substitution_absent_for_upper_primary():
    lp = dict(VALID_LESSON_PLAN)
    lp["grade"] = "Grade 5"  # outside lower-primary band
    provider = _FakeProvider(json.dumps(VALID_DIFFERENTIATION))
    asyncio.run(generate_differentiation(provider, lesson_plan=lp))
    assert "LOWER-PRIMARY VERB SUBSTITUTIONS" not in (provider.last_prompt or "")


def test_kiswahili_language_switches_verb_lists():
    provider = _FakeProvider(json.dumps(VALID_DIFFERENTIATION))
    asyncio.run(
        generate_differentiation(
            provider, lesson_plan=VALID_LESSON_PLAN, language="kiswahili"
        )
    )
    prompt = provider.last_prompt or ""
    assert "Kiswahili" in prompt
    # The Kiswahili Knowledge verb list starts with "taja" (name) — guard
    # against accidentally serving the English list when Kiswahili was
    # requested.
    assert "taja" in prompt


# ── Edge: tier-banned content guard (prompt-level, not validator-level) ────
def test_prompt_includes_banned_extension_framings():
    """The prompt must include the explicit 'no skipping ahead' guard for
    the extension tier — it's the most common LLM failure mode and is
    enforced at the prompt level, not by the parser."""
    provider = _FakeProvider(json.dumps(VALID_DIFFERENTIATION))
    asyncio.run(generate_differentiation(provider, lesson_plan=VALID_LESSON_PLAN))
    prompt = provider.last_prompt or ""
    assert "introduce next week's sub-strand" in prompt
    assert "skip to Grade N+1" in prompt
