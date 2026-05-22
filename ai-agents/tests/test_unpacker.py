"""Tests for the curriculum/standards unpacker.

Covers:
- ``parse_unpacked_outcome``: happy path, fence stripping, stray-prose
  recovery, missing-key rejection, empty-list rejection, non-JSON rejection.
- ``generate_unpacked_outcome``: happy path, required-field guards,
  RateLimitError pass-through, 429-string conversion, validation surfacing.
- Lower-primary verb-substitution table is included in the prompt when
  ``grade ∈ {Grade 1, Grade 2, Grade 3}`` AND the subject is non-language;
  excluded when the subject is a language subject (matches the
  ``_apply_lower_primary_verb_replacements`` applicability gate).
"""

from __future__ import annotations

import asyncio
import json
from typing import Optional

import pytest

from syncsenta_agents.agents.scheme.batched import RateLimitError
from syncsenta_agents.agents.unpacker import (
    UnpackedOutcome,
    UnpackerValidationError,
    generate_unpacked_outcome,
    parse_unpacked_outcome,
)


VALID_UNPACKED = {
    "outcome": (
        "By the end of the sub-strand, the learner should be able to: "
        "a) count whole numbers up to 100, "
        "b) write numerals 1-100, "
        "c) appreciate the use of numbers in daily life."
    ),
    "grade": "Grade 2",
    "subject": "Mathematics",
    "iCanStatements": [
        {"statement": "I can identify whole numbers up to 100.", "ksa": "knowledge"},
        {"statement": "I can draw numerals 1 to 100 on my slate.", "ksa": "skills"},
        {"statement": "I can appreciate using numbers when I count my pencils.", "ksa": "attitudes"},
    ],
    "successCriteria": [
        {"criterion": "Counts a pile of 100 bottle tops with no errors.", "observable": True},
        {"criterion": "Draws all numerals 1-100 legibly on a slate.", "observable": True},
        {"criterion": "Names two everyday situations where numbers are used.", "observable": True},
    ],
    "coreCompetencies": ["Communication", "Critical thinking"],
    "values": ["Responsibility"],
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


# ── parse_unpacked_outcome ──────────────────────────────────────────────────
def test_parse_unpacked_happy_path():
    out = parse_unpacked_outcome(json.dumps(VALID_UNPACKED))
    assert isinstance(out, UnpackedOutcome)
    assert out.grade == "Grade 2"
    assert len(out.iCanStatements) == 3
    assert out.iCanStatements[0].ksa == "knowledge"
    assert out.iCanStatements[1].statement.startswith("I can")
    assert len(out.successCriteria) == 3
    assert out.successCriteria[0].observable is True


def test_parse_unpacked_strips_markdown_fence():
    raw = "```json\n" + json.dumps(VALID_UNPACKED) + "\n```"
    out = parse_unpacked_outcome(raw)
    assert out.subject == "Mathematics"


def test_parse_unpacked_recovers_from_stray_prose():
    raw = "Here you go:\n" + json.dumps(VALID_UNPACKED) + "\nThanks!"
    out = parse_unpacked_outcome(raw)
    assert out.grade == "Grade 2"


def test_parse_unpacked_rejects_missing_required_keys():
    bad = dict(VALID_UNPACKED)
    del bad["iCanStatements"]
    with pytest.raises(UnpackerValidationError):
        parse_unpacked_outcome(json.dumps(bad))


def test_parse_unpacked_rejects_empty_i_can_statements():
    bad = dict(VALID_UNPACKED)
    bad["iCanStatements"] = []
    with pytest.raises(UnpackerValidationError):
        parse_unpacked_outcome(json.dumps(bad))


def test_parse_unpacked_rejects_empty_success_criteria():
    bad = dict(VALID_UNPACKED)
    bad["successCriteria"] = []
    with pytest.raises(UnpackerValidationError):
        parse_unpacked_outcome(json.dumps(bad))


def test_parse_unpacked_rejects_invalid_ksa_label():
    bad = json.loads(json.dumps(VALID_UNPACKED))
    bad["iCanStatements"][0]["ksa"] = "metacognition"  # not in Literal
    with pytest.raises(UnpackerValidationError):
        parse_unpacked_outcome(json.dumps(bad))


def test_parse_unpacked_rejects_non_json():
    with pytest.raises(UnpackerValidationError):
        parse_unpacked_outcome("not json at all, sorry")


def test_parse_unpacked_defaults_observable_to_true():
    payload = json.loads(json.dumps(VALID_UNPACKED))
    # Drop the observable key — it should default to True.
    for c in payload["successCriteria"]:
        c.pop("observable", None)
    out = parse_unpacked_outcome(json.dumps(payload))
    assert all(c.observable is True for c in out.successCriteria)


# ── generate_unpacked_outcome ───────────────────────────────────────────────
def test_generate_unpacked_happy_path():
    provider = _FakeProvider(json.dumps(VALID_UNPACKED))
    out = asyncio.run(
        generate_unpacked_outcome(
            provider,
            outcome=VALID_UNPACKED["outcome"],
            grade="Grade 2",
            subject="Mathematics",
        )
    )
    assert provider.calls == 1
    assert len(out.iCanStatements) == 3
    # System prompt is the verbatim KICD one — guard against rename.
    assert "KICD" in (provider.last_system or "")
    # User prompt must carry the outcome, grade, and KSA verb instructions.
    assert "Grade 2" in (provider.last_prompt or "")
    assert "Mathematics" in (provider.last_prompt or "")
    assert "KICD KSA VERB LISTS" in (provider.last_prompt or "")


def test_generate_unpacked_requires_outcome():
    provider = _FakeProvider(json.dumps(VALID_UNPACKED))
    with pytest.raises(ValueError):
        asyncio.run(
            generate_unpacked_outcome(
                provider, outcome="", grade="Grade 2", subject="Mathematics"
            )
        )
    assert provider.calls == 0


def test_generate_unpacked_requires_grade():
    provider = _FakeProvider(json.dumps(VALID_UNPACKED))
    with pytest.raises(ValueError):
        asyncio.run(
            generate_unpacked_outcome(
                provider, outcome="x", grade="", subject="Mathematics"
            )
        )


def test_generate_unpacked_passes_through_rate_limit_error():
    provider = _FakeProvider("", raise_exc=RateLimitError("RATE_LIMIT"))
    with pytest.raises(RateLimitError):
        asyncio.run(
            generate_unpacked_outcome(
                provider,
                outcome=VALID_UNPACKED["outcome"],
                grade="Grade 2",
                subject="Mathematics",
            )
        )


def test_generate_unpacked_converts_429_string_to_rate_limit_error():
    provider = _FakeProvider("", raise_exc=RuntimeError("HTTP 429 rate limit"))
    with pytest.raises(RateLimitError):
        asyncio.run(
            generate_unpacked_outcome(
                provider,
                outcome=VALID_UNPACKED["outcome"],
                grade="Grade 2",
                subject="Mathematics",
            )
        )


def test_generate_unpacked_surfaces_validation_error_on_bad_shape():
    provider = _FakeProvider(json.dumps({"outcome": "incomplete"}))
    with pytest.raises(UnpackerValidationError):
        asyncio.run(
            generate_unpacked_outcome(
                provider,
                outcome=VALID_UNPACKED["outcome"],
                grade="Grade 2",
                subject="Mathematics",
            )
        )


# ── Lower-primary verb-substitution prompt logic ────────────────────────────
def test_lower_primary_substitution_present_for_grade2_math():
    provider = _FakeProvider(json.dumps(VALID_UNPACKED))
    asyncio.run(
        generate_unpacked_outcome(
            provider,
            outcome=VALID_UNPACKED["outcome"],
            grade="Grade 2",
            subject="Mathematics",
        )
    )
    prompt = provider.last_prompt or ""
    assert "LOWER-PRIMARY VERB SUBSTITUTIONS" in prompt
    # A few specific entries from the table should appear.
    assert "write → draw" in prompt
    assert "read → observe" in prompt


def test_lower_primary_substitution_absent_for_language_subject():
    provider = _FakeProvider(json.dumps(VALID_UNPACKED))
    asyncio.run(
        generate_unpacked_outcome(
            provider,
            outcome=VALID_UNPACKED["outcome"],
            grade="Grade 2",
            subject="English",  # language subject is exempt
        )
    )
    assert "LOWER-PRIMARY VERB SUBSTITUTIONS" not in (provider.last_prompt or "")


def test_lower_primary_substitution_absent_for_upper_primary():
    provider = _FakeProvider(json.dumps(VALID_UNPACKED))
    asyncio.run(
        generate_unpacked_outcome(
            provider,
            outcome=VALID_UNPACKED["outcome"],
            grade="Grade 5",  # outside lower-primary band
            subject="Mathematics",
        )
    )
    assert "LOWER-PRIMARY VERB SUBSTITUTIONS" not in (provider.last_prompt or "")


def test_kiswahili_language_switches_prompt_verb_lists():
    provider = _FakeProvider(json.dumps(VALID_UNPACKED))
    asyncio.run(
        generate_unpacked_outcome(
            provider,
            outcome=VALID_UNPACKED["outcome"],
            grade="Grade 2",
            subject="Kiswahili",
            language="kiswahili",
        )
    )
    prompt = provider.last_prompt or ""
    # Kiswahili verb stems should appear; English-only knowledge verbs should not.
    assert "kutambua" in prompt or "kutaja" in prompt
    assert "Language: Kiswahili" in prompt
