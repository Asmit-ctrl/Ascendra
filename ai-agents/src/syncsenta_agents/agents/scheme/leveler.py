"""Text leveler for KICD CBC passages.

Generates a grade-appropriate reading passage in English or Kiswahili and
returns KSA-aligned comprehension questions. This is the missing Tier 1
teacher tool: paste/URL input → leveled passage + questions.

The prompt embeds the canonical KSA verb lists from :mod:`agents.scheme.guardrails`
and applies the same lower-primary verb substitution gate used by the other
Tier 1 tools.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Literal, Optional, Protocol

from pydantic import BaseModel, Field, ValidationError

from .batched import RateLimitError
from .guardrails import (
    _ATTITUDE_VERBS_EN,
    _ATTITUDE_VERBS_SW,
    _KNOWLEDGE_VERBS_EN,
    _KNOWLEDGE_VERBS_SW,
    _LANGUAGE_SUBJECTS,
    _LOWER_PRIMARY_REPLACEMENTS_EN,
    _LOWER_PRIMARY_REPLACEMENTS_SW,
    _SKILLS_VERBS_EN,
    _SKILLS_VERBS_SW,
    _grade_num,
)

log = logging.getLogger(__name__)


class LLMProvider(Protocol):
    async def generate(self, prompt: str, *, system: Optional[str] = None) -> str: ...


class TextLevelerValidationError(ValueError):
    """Raised when the LLM response can't be coerced into ``TextLevelerResult``."""


_KSA = Literal["knowledge", "skills", "attitudes"]


class LevelerQuestion(BaseModel):
    type: Literal["short"]
    ksa: _KSA
    question: str
    answer: str
    acceptableKeywords: list[str] = Field(min_length=1)


class TextLevelerResult(BaseModel):
    title: str
    grade: str
    subject: str
    language: str
    passage: str
    questions: list[LevelerQuestion] = Field(min_length=3, max_length=5)
    sourceUrl: Optional[str] = None


_SYSTEM_PROMPT = (
    "You are a KICD Kenya CBC curriculum expert. Return ONLY valid JSON."
)


def _is_lower_primary_non_language(grade: str, subject: str) -> bool:
    return 1 <= _grade_num(grade) <= 3 and subject not in _LANGUAGE_SUBJECTS


def _format_replacement_table(is_sw: bool) -> str:
    table = _LOWER_PRIMARY_REPLACEMENTS_SW if is_sw else _LOWER_PRIMARY_REPLACEMENTS_EN
    lines = []
    for pattern, replacement in table:
        verb = re.sub(r"\\b|\\\(.*?\\\)", "", pattern).strip()
        lines.append(f"  • {verb} → {replacement}")
    return "\n".join(lines)


def _build_prompt(
    *,
    grade: str,
    subject: str,
    language: str,
    input_text: Optional[str],
    source_url: Optional[str],
) -> str:
    is_sw = language.lower() in {"kiswahili", "sw"}
    lang_label = "Kiswahili" if is_sw else "English"

    knowledge_verbs = _KNOWLEDGE_VERBS_SW if is_sw else _KNOWLEDGE_VERBS_EN
    skills_verbs = _SKILLS_VERBS_SW if is_sw else _SKILLS_VERBS_EN
    attitude_verbs = _ATTITUDE_VERBS_SW if is_sw else _ATTITUDE_VERBS_EN

    source_block = ""
    if input_text:
        source_block = (
            "SOURCE TEXT:\n" + input_text.strip() + "\n"
        )
    elif source_url:
        source_block = (
            f"SOURCE URL: {source_url}\n"
            "If the URL is not directly available, imagine a typical Grade-appropriate passage\n"
            "for the subject and theme implied by the link."
        )

    lower_primary_block = ""
    if _is_lower_primary_non_language(grade, subject):
        lower_primary_block = (
            f"\n═══ LOWER-PRIMARY VERB SUBSTITUTIONS (MANDATORY for {grade}) ═══\n"
            "Apply these substitutions when phrasing questions and answers:\n"
            f"{_format_replacement_table(is_sw)}\n"
            "Use the verb on the right for Grades 1-3 non-language subjects.\n"
        )

    return f"""You are a KICD Kenya CBC curriculum expert. Generate a grade-appropriate reading passage and KSA-aligned comprehension questions.

CONTEXT:
- Grade: {grade}
- Subject: {subject}
- Language: {lang_label}
- Target passage length: 120-180 words
{source_block}

═══ LEVELED PASSAGE REQUIREMENTS ═══
- Rewrite the source text as a clear, age-appropriate passage for {grade} learners.
- Preserve the original meaning where possible.
- Use vocabulary and sentence structure appropriate for the grade band.
- For Kiswahili, use standard CBC classroom language.
- Keep the passage self-contained on one page.

═══ COMPREHENSION QUESTIONS (STRICT) ═══
- Generate exactly 4 questions.
- At least 2 questions must be tagged ksa="knowledge".
- At least 1 question must be tagged ksa="skills".
- At least 1 question must be tagged ksa="attitudes".
- All questions must be answerable in short written responses.
- Use the KSA verb lists below when wording questions and answers.

KICD KSA VERB LISTS:
- Knowledge verbs: {', '.join(knowledge_verbs)}
- Skills verbs: {', '.join(skills_verbs)}
- Attitudes verbs: {', '.join(attitude_verbs)}
Do NOT use banned framings: "know", "understand", "be aware", "learn to", "have a positive attitude".
{lower_primary_block}

═══ OUTPUT JSON SHAPE (EXACT) ═══
{{
  "title": "<descriptive passage title>",
  "grade": "{grade}",
  "subject": "{subject}",
  "language": "{lang_label}",
  "passage": "<leveled passage text>",
  "questions": [
    {{
      "type": "short",
      "ksa": "knowledge" | "skills" | "attitudes",
      "question": "<question text>",
      "answer": "<correct answer text>",
      "acceptableKeywords": ["<keyword1>", "<keyword2>"]
    }}
  ],
  "sourceUrl": "{source_url or ''}"
}}

REQUIREMENTS:
- Questions must be specific and unambiguous.
- acceptableKeywords should be 2-4 lowercase keywords from the real answer.
- Return ONLY valid JSON. No markdown fences, no commentary, no extra text."""


_FENCE_RE = re.compile(r"^```(?:json)?\n?|\n?```$", re.IGNORECASE)


def _strip_code_fence(raw: str) -> str:
    s = raw.strip()
    if s.startswith("```"):
        s = _FENCE_RE.sub("", s).strip()
    return s


def parse_text_leveler(raw: str) -> TextLevelerResult:
    cleaned = _strip_code_fence(raw)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            log.error("Text leveler: no JSON object found (preview=%s)", cleaned[:200])
            raise TextLevelerValidationError("LLM did not return JSON")
        try:
            data = json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            log.error("Text leveler: JSON parse failed (preview=%s)", cleaned[:200])
            raise TextLevelerValidationError(f"Invalid JSON: {exc}") from exc

    try:
        return TextLevelerResult.model_validate(data)
    except ValidationError as exc:
        log.error("Text leveler: schema validation failed", extra={"errors": exc.errors()})
        raise TextLevelerValidationError(str(exc)) from exc


async def generate_text_leveler(
    provider: LLMProvider,
    *,
    grade: str,
    subject: str,
    language: str = "english",
    input_text: Optional[str] = None,
    source_url: Optional[str] = None,
) -> TextLevelerResult:
    if not (grade and subject):
        raise ValueError("grade and subject are required")
    if not input_text and not source_url:
        raise ValueError("input_text or source_url is required")

    prompt = _build_prompt(
        grade=grade,
        subject=subject,
        language=language,
        input_text=input_text,
        source_url=source_url,
    )

    try:
        raw = await provider.generate(prompt, system=_SYSTEM_PROMPT)
    except RateLimitError:
        raise
    except Exception as exc:
        msg = str(exc).lower()
        if ("rate" in msg and "limit" in msg) or "429" in msg:
            raise RateLimitError("RATE_LIMIT") from exc
        raise

    return parse_text_leveler(raw)


__all__ = [
    "LevelerQuestion",
    "LLMProvider",
    "TextLevelerResult",
    "TextLevelerValidationError",
    "generate_text_leveler",
    "parse_text_leveler",
]
