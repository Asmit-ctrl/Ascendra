"""Worksheet generation — single sub-strand, KSA-balanced item mix.

First-party tool (no scheme-scribe-ai equivalent). Generates a printable
worksheet for one ``SchemeRow``'s sub-strand: a teacher who just generated
a scheme can produce a homework/classwork sheet for any row.

Item model is a discriminated union by ``type`` (mirrors the exam module's
``MCQ | ShortQ | LongQ`` pattern) but with KSA semantics layered on top —
every item carries a ``ksa`` tag so downstream tools (Tier 2 differentiation,
rubric) can compose without re-deriving the K/S/A balance.

Worksheet item-type mix (KSA-balanced, fixed counts per worksheet so renderer
layout is predictable):

- 4 Knowledge items: ``fill_blank`` or ``short_answer``, ksa="knowledge"
  (recall, define, identify, name…)
- 5 Skills items: ``short_answer`` or ``problem_solving``, ksa="skills"
  (calculate, solve, draw, demonstrate, sort…)
- 2 Attitudes items: ``reflect`` (open prompt), ksa="attitudes"
  (appreciate, show, value, respect…)
- 1 Matching set: ksa="knowledge" — pairs of (left, right), 4-6 pairs

Reuses the same verb lists, lower-primary substitution gate, ``LLMProvider``
Protocol, ``RateLimitError`` pass-through, and JSON-recovery utilities as
:mod:`agents.scheme.lesson_plan` and :mod:`agents.scheme.exam`.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Literal, Optional, Protocol, Union

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


class WorksheetValidationError(ValueError):
    """Raised when the LLM response can't be coerced into ``Worksheet``."""


# ────────────────────────────────────────────────────────────────────────────
# Item discriminated union — KSA tag is mandatory on every item.
# ────────────────────────────────────────────────────────────────────────────
_KSA = Literal["knowledge", "skills", "attitudes"]


class FillBlank(BaseModel):
    type: Literal["fill_blank"]
    ksa: _KSA
    prompt: str  # e.g. "The number after 47 is _____."
    answer: str  # e.g. "48"


class ShortAnswer(BaseModel):
    type: Literal["short_answer"]
    ksa: _KSA
    prompt: str
    answer: str


class ProblemSolving(BaseModel):
    type: Literal["problem_solving"]
    ksa: _KSA
    prompt: str
    answer: str
    workingHint: Optional[str] = None  # one-line scaffold for struggling learners


class MatchingPair(BaseModel):
    left: str
    right: str


class Matching(BaseModel):
    type: Literal["matching"]
    ksa: _KSA
    prompt: str  # instruction line, e.g. "Match each number to its name."
    pairs: List[MatchingPair] = Field(min_length=3, max_length=8)


class Reflect(BaseModel):
    type: Literal["reflect"]
    ksa: _KSA
    prompt: str  # open-ended; no single correct answer
    sampleResponse: Optional[str] = None  # for teacher's marking guide


WorksheetItem = Union[FillBlank, ShortAnswer, ProblemSolving, Matching, Reflect]


class Worksheet(BaseModel):
    title: str
    grade: str
    subject: str
    strand: str
    subStrand: str
    duration: str  # e.g. "30 minutes"
    instructions: str  # one paragraph, learner-facing
    items: List[WorksheetItem] = Field(min_length=6)
    extensionChallenge: Optional[str] = None
    answerKey: str  # consolidated key, teacher-facing


_SYSTEM_PROMPT = (
    "You are a KICD Kenya CBC curriculum expert. Return ONLY valid JSON."
)


# ────────────────────────────────────────────────────────────────────────────
# Lower-primary substitution gate — identical to unpacker.py and the
# scheme-side _apply_lower_primary_verb_replacements applicability check.
# ────────────────────────────────────────────────────────────────────────────
def _is_lower_primary_non_language(grade: str, subject: str) -> bool:
    return 1 <= _grade_num(grade) <= 3 and subject not in _LANGUAGE_SUBJECTS


def _format_replacement_table(is_sw: bool) -> str:
    table = _LOWER_PRIMARY_REPLACEMENTS_SW if is_sw else _LOWER_PRIMARY_REPLACEMENTS_EN
    lines = []
    for pattern, replacement in table:
        verb = re.sub(r"\\b|\\\(.*?\\\)", "", pattern).strip()
        lines.append(f"  • {verb} → {replacement}")
    return "\n".join(lines)


def _pick(row: Dict[str, Any], *keys: str) -> Any:
    """Pull a value from a SchemeRow accepting both camelCase and snake_case.

    The post-Phase-1 SchemeRow uses camelCase (``subStrand``,
    ``specificLearningOutcome``); older saved rows used snake_case. The
    lesson-plan port already handles this — same helper here.
    """
    for k in keys:
        v = row.get(k)
        if v not in (None, "", []):
            return v
    return None


def _as_text(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, (list, tuple)):
        return "; ".join(str(v) for v in value if v)
    return str(value)


def _row_context_block(row: Dict[str, Any]) -> str:
    """Render the SchemeRow as a compact context block for the prompt."""
    strand = _pick(row, "strand", "Strand") or ""
    sub_strand = _pick(row, "subStrand", "sub_strand", "SubStrand") or ""
    slo = _as_text(
        _pick(
            row,
            "specificLearningOutcome",
            "specific_learning_outcomes",
            "specific_learning_outcome",
        )
    )
    kiq = _as_text(
        _pick(
            row, "keyInquiryQuestion", "key_inquiry_questions", "key_inquiry_question"
        )
    )
    experiences = _as_text(
        _pick(row, "learningExperiences", "learning_experiences")
    )
    resources = _as_text(
        _pick(row, "learningResources", "learning_resources", "resources")
    )

    return (
        f"- Strand: {strand}\n"
        f"- Sub-Strand: {sub_strand}\n"
        f"- Specific Learning Outcomes: {slo or 'Not provided'}\n"
        f"- Key Inquiry Question: {kiq or 'Not provided'}\n"
        f"- Learning Experiences: {experiences or 'Not provided'}\n"
        f"- Available Resources: {resources or 'Not provided'}"
    )


def _build_prompt(
    *,
    row: Dict[str, Any],
    grade: str,
    subject: str,
    language: str,
    duration_minutes: int,
) -> str:
    is_sw = language.lower() in {"kiswahili", "sw"}
    lang_label = "Kiswahili" if is_sw else "English"

    knowledge_verbs = _KNOWLEDGE_VERBS_SW if is_sw else _KNOWLEDGE_VERBS_EN
    skills_verbs = _SKILLS_VERBS_SW if is_sw else _SKILLS_VERBS_EN
    attitude_verbs = _ATTITUDE_VERBS_SW if is_sw else _ATTITUDE_VERBS_EN

    lower_primary_block = ""
    if _is_lower_primary_non_language(grade, subject):
        lower_primary_block = (
            f"\n═══ LOWER-PRIMARY VERB SUBSTITUTIONS (MANDATORY for {grade}) ═══\n"
            "Apply these substitutions in all item prompts and answers:\n"
            f"{_format_replacement_table(is_sw)}\n"
        )

    return f"""You are a KICD Kenya CBC curriculum expert. Generate a printable worksheet for a single sub-strand.

CONTEXT:
- Grade: {grade}
- Subject: {subject}
- Language: {lang_label}
- Target duration: {duration_minutes} minutes
{_row_context_block(row)}

═══ KSA-BALANCED ITEM MIX (STRICT) ═══
Produce EXACTLY these 12 items in this order:
1-4.  Knowledge items (ksa="knowledge"): fill_blank or short_answer.
      Use verbs from: {", ".join(knowledge_verbs)}
5-9.  Skills items (ksa="skills"): short_answer or problem_solving.
      Use verbs from: {", ".join(skills_verbs)}
10.   Matching set (ksa="knowledge"): 4-6 pairs.
11-12. Reflect items (ksa="attitudes"): open prompt, optional sampleResponse.
      Use verbs from: {", ".join(attitude_verbs)}

Do NOT use banned framings: "know", "understand", "be aware", "learn to", "have a positive attitude".
{lower_primary_block}
═══ AGE-APPROPRIATENESS ═══
- All prompts must be answerable by a typical {grade} learner.
- Use simple {lang_label} vocabulary; no double negatives, no trick wording.
- For Mathematics: keep numbers within the sub-strand's taught range (inferred from the Specific Learning Outcomes above).
- For language subjects: the worksheet may include short reading passages, but every passage must be self-contained on the printed page (no external images/audio).

═══ TEXT-ONLY (NO PRACTICAL TASKS) ═══
This worksheet is printed on A4 paper. Items must NOT require: drawing
elaborate figures, singing, role-play, measuring real objects, group work,
using physical manipulatives. Assess the underlying KNOWLEDGE in writing
instead. (Simple labelled diagrams in the answer are fine; activities
requiring the learner to *produce* a drawing are not.)

═══ ANSWER COMPLETENESS (MANDATORY) ═══
- Every fill_blank, short_answer, problem_solving item MUST include a non-empty `answer` containing the actual content (numbers, names, facts) — not a paraphrase of the prompt.
- problem_solving items SHOULD include a one-line `workingHint` that scaffolds the method (e.g. "Use the number line.").
- matching pairs MUST be 1-to-1 correct mappings; no duplicate `left` values.
- reflect items MAY include a `sampleResponse` for the teacher's marking guide. The `answer` field is not required for reflect.

═══ OUTPUT JSON SHAPE (EXACT) ═══
{{
  "title": "Worksheet title (descriptive, specific to the sub-strand)",
  "grade": "{grade}",
  "subject": "{subject}",
  "strand": "<copy from context>",
  "subStrand": "<copy from context>",
  "duration": "{duration_minutes} minutes",
  "instructions": "One paragraph, learner-facing, in {lang_label}.",
  "items": [
    {{ "type": "fill_blank", "ksa": "knowledge", "prompt": "...", "answer": "..." }},
    {{ "type": "short_answer", "ksa": "knowledge", "prompt": "...", "answer": "..." }},
    {{ "type": "short_answer", "ksa": "knowledge", "prompt": "...", "answer": "..." }},
    {{ "type": "short_answer", "ksa": "knowledge", "prompt": "...", "answer": "..." }},
    {{ "type": "problem_solving", "ksa": "skills", "prompt": "...", "answer": "...", "workingHint": "..." }},
    {{ "type": "problem_solving", "ksa": "skills", "prompt": "...", "answer": "...", "workingHint": "..." }},
    {{ "type": "short_answer", "ksa": "skills", "prompt": "...", "answer": "..." }},
    {{ "type": "short_answer", "ksa": "skills", "prompt": "...", "answer": "..." }},
    {{ "type": "problem_solving", "ksa": "skills", "prompt": "...", "answer": "...", "workingHint": "..." }},
    {{ "type": "matching", "ksa": "knowledge", "prompt": "Match each ... to its ...",
       "pairs": [{{"left": "...", "right": "..."}}, ...] }},
    {{ "type": "reflect", "ksa": "attitudes", "prompt": "...", "sampleResponse": "..." }},
    {{ "type": "reflect", "ksa": "attitudes", "prompt": "...", "sampleResponse": "..." }}
  ],
  "extensionChallenge": "One extension item for advanced learners (optional but recommended).",
  "answerKey": "Consolidated teacher-facing key. Numbered to match item order. Plain text."
}}

Return ONLY the JSON object. No prose, no markdown fences, no commentary."""


# ────────────────────────────────────────────────────────────────────────────
# JSON recovery — same pattern as lesson_plan / exam / unpacker.
# ────────────────────────────────────────────────────────────────────────────
_FENCE_RE = re.compile(r"^```(?:json)?\n?|\n?```$", re.IGNORECASE)


def _strip_code_fence(raw: str) -> str:
    s = raw.strip()
    if s.startswith("```"):
        s = _FENCE_RE.sub("", s).strip()
    return s


def parse_worksheet(raw: str) -> Worksheet:
    """Coerce an LLM response into a validated :class:`Worksheet`.

    Strips ``` fences, attempts ``json.loads``, falls back to extracting the
    first ``{...}`` blob on stray prose. Raises
    :class:`WorksheetValidationError` on any parse or schema mismatch.
    """
    cleaned = _strip_code_fence(raw)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            log.error("Worksheet: no JSON object found (preview=%s)", cleaned[:200])
            raise WorksheetValidationError("LLM did not return JSON")
        try:
            data = json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            log.error("Worksheet: JSON parse failed (preview=%s)", cleaned[:200])
            raise WorksheetValidationError(f"Invalid JSON: {exc}") from exc

    try:
        return Worksheet.model_validate(data)
    except ValidationError as exc:
        log.error("Worksheet: schema validation failed", extra={"errors": exc.errors()})
        raise WorksheetValidationError(str(exc)) from exc


async def generate_worksheet(
    provider: LLMProvider,
    *,
    row: Dict[str, Any],
    grade: str,
    subject: str,
    language: str = "english",
    duration_minutes: int = 30,
) -> Worksheet:
    """Generate one worksheet for the given ``SchemeRow``.

    ``row`` accepts either the post-Phase-1 camelCase SchemeRow keys or the
    legacy snake_case keys — :func:`_pick` handles both. Required fields:
    ``grade``, ``subject``, and a ``row`` with at least ``strand`` +
    ``subStrand``/``sub_strand``.

    Propagates :class:`scheme.batched.RateLimitError`.
    """
    if not (grade and subject):
        raise ValueError("grade and subject are required")
    if not row or not _pick(row, "subStrand", "sub_strand", "SubStrand"):
        raise ValueError("row must include strand and subStrand")

    prompt = _build_prompt(
        row=row,
        grade=grade,
        subject=subject,
        language=language,
        duration_minutes=duration_minutes,
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

    return parse_worksheet(raw)


__all__ = [
    "FillBlank",
    "LLMProvider",
    "Matching",
    "MatchingPair",
    "ProblemSolving",
    "Reflect",
    "ShortAnswer",
    "Worksheet",
    "WorksheetItem",
    "WorksheetValidationError",
    "generate_worksheet",
    "parse_worksheet",
]
