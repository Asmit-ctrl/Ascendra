"""Curriculum/standards unpacker.

First-party tool (no scheme-scribe-ai TS source). Takes a raw KICD CBC
learning outcome string and produces student-friendly "I can…" statements
plus measurable success criteria — the smallest unblocked Tier 1 item from
the teacher-tools roadmap and an upstream input for several Tier 2 tools
(Differentiation, KSA Rubric Generator) that will consume the unpacked
shape directly.

Conventions match the existing scheme-scribe ports
(:mod:`agents.scheme.lesson_plan`, :mod:`agents.scheme.exam`):
- Pydantic models with camelCase field names so the studio renders them
  without translation.
- Local :class:`LLMProvider` Protocol (per-module convention — each port
  redefines this rather than importing a shared one).
- ``RateLimitError`` re-imported from :mod:`agents.scheme.batched` so the
  orchestrator can distinguish "retry" from "broken response".
- Same code-fence stripping + first-``{...}`` JSON recovery as
  :func:`lesson_plan.parse_lesson_plan`.

The KSA verb lists + lower-primary verb-replacement table embedded in the
prompt are *imported* from :mod:`agents.scheme.guardrails` rather than
duplicated — those tuples are the project's source of truth for which
verbs count as Knowledge / Skills / Attitudes. Underscore-prefixed names
are imported deliberately; treating them as the canonical list avoids drift
when guardrails evolves.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Literal, Optional, Protocol

from pydantic import BaseModel, Field, ValidationError

from .scheme.batched import RateLimitError
from .scheme.guardrails import (
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


class UnpackerValidationError(ValueError):
    """Raised when the LLM response can't be coerced into ``UnpackedOutcome``."""


# ────────────────────────────────────────────────────────────────────────────
# Output contract — camelCase to match scheme/lesson_plan/exam convention.
# ────────────────────────────────────────────────────────────────────────────
class ICanStatement(BaseModel):
    statement: str
    ksa: Literal["knowledge", "skills", "attitudes"]


class SuccessCriterion(BaseModel):
    criterion: str
    observable: bool = True


class UnpackedOutcome(BaseModel):
    outcome: str
    grade: str
    subject: str
    iCanStatements: list[ICanStatement] = Field(min_length=1)
    successCriteria: list[SuccessCriterion] = Field(min_length=1)
    coreCompetencies: list[str] = Field(default_factory=list)
    values: list[str] = Field(default_factory=list)


_SYSTEM_PROMPT = (
    "You are a KICD Kenya CBC curriculum expert. Return ONLY valid JSON."
)


def _is_lower_primary_non_language(grade: str, subject: str) -> bool:
    """Mirror ``_apply_lower_primary_verb_replacements`` applicability check.

    The lower-primary verb substitution table (guardrails.py:585-594) only
    fires for Grades 1-3 *AND* a non-language subject. We use the same gate
    here so the prompt-side instruction matches the scheme-side enforcement.
    """
    grade_num = _grade_num(grade)
    return 1 <= grade_num <= 3 and subject not in _LANGUAGE_SUBJECTS


def _format_replacement_table(is_sw: bool) -> str:
    """Render the lower-primary verb-replacement table as a prompt block.

    The raw tuples use regex word-boundary patterns (e.g. ``\\bwrite\\b``);
    strip those for human-readable display in the prompt.
    """
    table = _LOWER_PRIMARY_REPLACEMENTS_SW if is_sw else _LOWER_PRIMARY_REPLACEMENTS_EN
    lines = []
    for pattern, replacement in table:
        verb = re.sub(r"\\b|\\\(.*?\\\)", "", pattern).strip()
        lines.append(f"  • {verb} → {replacement}")
    return "\n".join(lines)


def _build_prompt(
    *,
    outcome: str,
    grade: str,
    subject: str,
    language: str,
) -> str:
    """Build the unpacker prompt.

    Embeds the KSA verb lists so the LLM picks verbs from the project's
    canonical set, and the lower-primary substitution table when applicable.
    """
    is_sw = language.lower() in {"kiswahili", "sw", "kiswahili"}
    lang_label = "Kiswahili" if is_sw else "English"

    knowledge_verbs = _KNOWLEDGE_VERBS_SW if is_sw else _KNOWLEDGE_VERBS_EN
    skills_verbs = _SKILLS_VERBS_SW if is_sw else _SKILLS_VERBS_EN
    attitude_verbs = _ATTITUDE_VERBS_SW if is_sw else _ATTITUDE_VERBS_EN

    lower_primary_block = ""
    if _is_lower_primary_non_language(grade, subject):
        lower_primary_block = (
            f"\n═══ LOWER-PRIMARY VERB SUBSTITUTIONS (MANDATORY for {grade}) ═══\n"
            "Apply these substitutions when phrasing 'I can…' statements and success criteria:\n"
            f"{_format_replacement_table(is_sw)}\n"
            "Reason: these verbs are developmentally appropriate for Grades 1-3 "
            "non-language learners; the originals on the left are reserved for "
            "upper grades.\n"
        )

    return f"""You are a KICD Kenya CBC curriculum expert. Unpack the learning outcome below into student-friendly "I can…" statements and measurable success criteria.

CONTEXT:
- Grade: {grade}
- Subject: {subject}
- Language: {lang_label}

RAW LEARNING OUTCOME:
\"\"\"
{outcome}
\"\"\"

═══ KICD KSA VERB LISTS (use ONLY these) ═══
- Knowledge verbs: {", ".join(knowledge_verbs)}
- Skills verbs: {", ".join(skills_verbs)}
- Attitudes verbs: {", ".join(attitude_verbs)}
Do NOT use banned framings: "know", "understand", "be aware", "learn to", "have a positive attitude".
{lower_primary_block}
═══ OUTPUT JSON SHAPE (EXACT) ═══
{{
  "outcome": "<the raw outcome, echoed back verbatim>",
  "grade": "{grade}",
  "subject": "{subject}",
  "iCanStatements": [
    {{ "statement": "I can <verb from list> <object>", "ksa": "knowledge" | "skills" | "attitudes" }}
  ],
  "successCriteria": [
    {{ "criterion": "<observable behaviour a teacher can tick>", "observable": true }}
  ],
  "coreCompetencies": ["<0-3 KICD core competencies, e.g. Communication, Critical thinking>"],
  "values": ["<0-3 KICD values, e.g. Responsibility, Respect>"]
}}

═══ REQUIREMENTS ═══
- One "I can…" statement per K/S/A clause in the raw outcome (typically 3 — a/b/c). If the outcome has more or fewer clauses, match that count.
- Every "I can…" statement MUST start with "I can " (or the {lang_label} equivalent) followed by a verb from the lists above.
- Each statement MUST be tagged with its ksa category (knowledge | skills | attitudes).
- Success criteria are OBSERVABLE behaviours — what a teacher would see/hear/check, NOT what the learner thinks. Examples:
    GOOD: "Counts a pile of 100 objects with no errors."
    BAD:  "Understands counting." (not observable)
- 3-6 success criteria total. Cover all three K/S/A categories.
- Core competencies and values are optional — only include ones that genuinely fit the outcome. Empty arrays are fine.

Return ONLY the JSON object. No prose, no markdown fences, no commentary."""


_FENCE_RE = re.compile(r"^```(?:json)?\n?|\n?```$", re.IGNORECASE)


def _strip_code_fence(raw: str) -> str:
    s = raw.strip()
    if s.startswith("```"):
        s = _FENCE_RE.sub("", s).strip()
    return s


def parse_unpacked_outcome(raw: str) -> UnpackedOutcome:
    """Coerce an LLM response string into a validated :class:`UnpackedOutcome`.

    Strips ``` fences then attempts ``json.loads``. Falls back to extracting
    the first ``{...}`` blob (defensive — Llama-class models occasionally
    prepend a stray sentence even when asked for JSON-only). Raises
    :class:`UnpackerValidationError` on any parse or schema mismatch.
    """
    cleaned = _strip_code_fence(raw)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            log.error("Unpacker: no JSON object found (preview=%s)", cleaned[:200])
            raise UnpackerValidationError("LLM did not return JSON")
        try:
            data = json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            log.error("Unpacker: JSON parse failed (preview=%s)", cleaned[:200])
            raise UnpackerValidationError(f"Invalid JSON: {exc}") from exc

    try:
        return UnpackedOutcome.model_validate(data)
    except ValidationError as exc:
        log.error("Unpacker: schema validation failed", extra={"errors": exc.errors()})
        raise UnpackerValidationError(str(exc)) from exc


async def generate_unpacked_outcome(
    provider: LLMProvider,
    *,
    outcome: str,
    grade: str,
    subject: str,
    language: str = "english",
) -> UnpackedOutcome:
    """Unpack one KICD learning outcome into "I can…" + success criteria.

    Propagates :class:`scheme.batched.RateLimitError` so the orchestrator can
    distinguish "try again" from "broken response" without parsing strings.
    """
    if not (outcome and grade and subject):
        raise ValueError("outcome, grade, subject are required")

    prompt = _build_prompt(
        outcome=outcome,
        grade=grade,
        subject=subject,
        language=language,
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

    return parse_unpacked_outcome(raw)


__all__ = [
    "ICanStatement",
    "LLMProvider",
    "SuccessCriterion",
    "UnpackedOutcome",
    "UnpackerValidationError",
    "generate_unpacked_outcome",
    "parse_unpacked_outcome",
]
