"""Tests for the Text Leveler tool.

Covers parse + generate semantics, JSON recovery, prompt context, lower-primary
verb substitution gating, and RateLimitError passthrough.
"""

from __future__ import annotations

import asyncio
import json
from typing import Optional

import pytest

from syncsenta_agents.agents.scheme.batched import RateLimitError
from syncsenta_agents.agents.scheme.leveler import (
    LevelerQuestion,
    TextLevelerResult,
    TextLevelerValidationError,
    generate_text_leveler,
    parse_text_leveler,
)


VALID_LEVELER = {
    "title": "Counting in the Market",
    "grade": "Grade 3",
    "subject": "Mathematics",
    "language": "English",
    "passage": "At the market, children learn to count the fruits and vegetables. They add the totals and choose the right number of items.",
    "questions": [
        {
            "type": "short",
            "ksa": "knowledge",
            "question": "What do the children count at the market?",
            "answer": "Fruits and vegetables",
            "acceptableKeywords": ["fruits", "vegetables"],
        },
        {
            "type": "short",
            "ksa": "skills",
            "question": "How do the children find the total number of items?",
            "answer": "They add the numbers together.",
            "acceptableKeywords": ["add", "total"],
        },
        {
            "type": "short",
            "ksa": "knowledge",
            "question": "What should they choose when they know the number of items?",
            "answer": "The right number of items.",
            "acceptableKeywords": ["right number", "items"],
        },
        {
            "type": "short",
            "ksa": "attitudes",
            "question": "Why is it important to count carefully at the market?",
            "answer": "So they can pay the correct amount and not waste money.",
            "acceptableKeywords": ["correct amount", "money"],
        },
    ],
    "sourceUrl": "",
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


def test_parse_text_leveler_happy_path():
    result = parse_text_leveler(json.dumps(VALID_LEVELER))
    assert isinstance(result, TextLevelerResult)
    assert result.grade == "Grade 3"
    assert len(result.questions) == 4
    assert all(isinstance(q, LevelerQuestion) for q in result.questions)


def test_parse_text_leveler_strips_markdown_fence():
    raw = "```json\n" + json.dumps(VALID_LEVELER) + "\n```"
    result = parse_text_leveler(raw)
    assert result.subject == "Mathematics"


def test_parse_text_leveler_recovers_from_stray_prose():
    raw = "Here is the output:\n" + json.dumps(VALID_LEVELER) + "\nThank you."
    result = parse_text_leveler(raw)
    assert result.language == "English"


def test_parse_text_leveler_rejects_missing_required_keys():
    bad = dict(VALID_LEVELER)
    del bad["passage"]
    with pytest.raises(TextLevelerValidationError):
        parse_text_leveler(json.dumps(bad))


def test_generate_text_leveler_happy_path():
    provider = _FakeProvider(json.dumps(VALID_LEVELER))
    result = asyncio.run(
        generate_text_leveler(
            provider,
            grade="Grade 3",
            subject="Mathematics",
            language="english",
            input_text="A short paragraph about counting fruit.",
        )
    )
    assert provider.calls == 1
    assert isinstance(result, TextLevelerResult)
    assert "KICD" in (provider.last_system or "")
    assert "Grade 3" in (provider.last_prompt or "")
    assert "Mathematics" in (provider.last_prompt or "")
    assert "KSA VERB LISTS" in (provider.last_prompt or "")
    assert "counting fruit" in (provider.last_prompt or "")


def test_generate_text_leveler_requires_input_text_or_source_url():
    provider = _FakeProvider(json.dumps(VALID_LEVELER))
    with pytest.raises(ValueError):
        asyncio.run(
            generate_text_leveler(
                provider,
                grade="Grade 4",
                subject="English",
                language="english",
            )
        )


def test_generate_text_leveler_passes_through_rate_limit_error():
    provider = _FakeProvider("", raise_exc=RateLimitError("RATE_LIMIT"))
    with pytest.raises(RateLimitError):
        asyncio.run(
            generate_text_leveler(
                provider,
                grade="Grade 3",
                subject="Mathematics",
                language="english",
                input_text="Count the mangoes.",
            )
        )


def test_generate_text_leveler_includes_lower_primary_block_for_grade_2_math():
    provider = _FakeProvider(json.dumps(VALID_LEVELER))
    asyncio.run(
        generate_text_leveler(
            provider,
            grade="Grade 2",
            subject="Mathematics",
            language="english",
            input_text="A short paragraph about counting goats.",
        )
    )
    assert "LOWER-PRIMARY VERB SUBSTITUTIONS" in (provider.last_prompt or "")
    assert "write → draw" in (provider.last_prompt or "")


def test_generate_text_leveler_does_not_include_lower_primary_for_english():
    provider = _FakeProvider(json.dumps(VALID_LEVELER))
    asyncio.run(
        generate_text_leveler(
            provider,
            grade="Grade 2",
            subject="English",
            language="english",
            input_text="A short paragraph about reading.",
        )
    )
    assert "LOWER-PRIMARY VERB SUBSTITUTIONS" not in (provider.last_prompt or "")
