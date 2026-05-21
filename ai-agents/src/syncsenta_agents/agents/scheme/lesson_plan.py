"""Lesson-plan generation ported from scheme-scribe-ai.

Source of truth:
``_inventory/scheme-scribe-ai/supabase/functions/generate-lesson-plan/index.ts``.
The prompt template, JSON contract, and code-fence-stripping recovery are
reproduced here. The TS function calls the Lovable AI gateway with
``google/gemini-2.5-flash``; in Ascendra we route through the same
``LLMProvider`` interface used by :mod:`scheme.batched` so schemes and lesson
plans share Groq credentials and rate-limit handling.

The output shape is the contract the studio's lesson-plan dialog renders
against — every key in :class:`LessonPlan` is required and validated with
Pydantic. Anything missing or off-shape raises ``LessonPlanValidationError``;
the orchestrator decides whether to surface as 422 or retry.
"""

import json
import logging
import re
from typing import Optional, Protocol

from pydantic import BaseModel, Field, ValidationError

from .batched import RateLimitError

log = logging.getLogger(__name__)


# Mirrors batched.LLMProvider — duplicated rather than imported so this module
# can be used standalone without dragging in the batched-scheme machinery.
class LLMProvider(Protocol):
    async def generate(self, prompt: str, *, system: Optional[str] = None) -> str: ...


class LessonPlanValidationError(ValueError):
    """Raised when the LLM response can't be coerced into ``LessonPlan``."""


# ────────────────────────────────────────────────────────────────────────────
# Output contract.  Keys + nesting match generate-lesson-plan/index.ts:44-73
# exactly.  Studio reads these directly — do not rename without coordinating.
# ────────────────────────────────────────────────────────────────────────────
class LessonSection(BaseModel):
    duration: str
    activities: list[str] = Field(min_length=1)


class Differentiation(BaseModel):
    advanced: str
    struggling: str


class LessonPlan(BaseModel):
    title: str
    grade: str
    subject: str
    strand: str
    subStrand: str
    duration: str
    objectives: list[str] = Field(min_length=1)
    keyInquiryQuestion: str
    introduction: LessonSection
    development: LessonSection
    conclusion: LessonSection
    assessment: list[str] = Field(min_length=1)
    differentiation: Differentiation
    resources: list[str] = Field(min_length=1)
    teacherReflection: str


# System message from generate-lesson-plan/index.ts:95.
_SYSTEM_PROMPT = (
    "You are a KICD Kenya CBC curriculum expert. Return ONLY valid JSON."
)


def _build_prompt(
    *,
    grade: str,
    subject: str,
    strand: str,
    sub_strand: str,
    slo: Optional[str],
    learning_experiences: Optional[str],
    key_inquiry_question: Optional[str],
    learning_resources: Optional[str],
    term: Optional[str],
    additional_notes: Optional[str],
) -> str:
    """Build the prompt verbatim from generate-lesson-plan/index.ts:30-84."""
    notes_line = (
        f"\n- Teacher's Additional Notes: {additional_notes}" if additional_notes else ""
    )
    return f"""You are a KICD Kenya CBC curriculum expert. Generate a detailed, practical lesson plan for a Kenyan teacher.

CONTEXT:
- Grade: {grade}
- Subject: {subject}
- Strand: {strand}
- Sub-Strand: {sub_strand}
- Term: {term or "Not specified"}
- Specific Learning Outcomes from Scheme: {slo or "Not provided"}
- Learning Experiences from Scheme: {learning_experiences or "Not provided"}
- Key Inquiry Question: {key_inquiry_question or "Not provided"}
- Available Resources: {learning_resources or "Not provided"}{notes_line}

Generate a comprehensive lesson plan as a JSON object with this EXACT structure:
{{
  "title": "Lesson title (descriptive, specific to the topic)",
  "grade": "{grade}",
  "subject": "{subject}",
  "strand": "{strand}",
  "subStrand": "{sub_strand}",
  "duration": "40 minutes",
  "objectives": ["3-5 specific, measurable learning objectives using action verbs"],
  "keyInquiryQuestion": "The key question that drives this lesson",
  "introduction": {{
    "duration": "5-8 minutes",
    "activities": ["3-4 warm-up/hook activities to engage learners and activate prior knowledge"]
  }},
  "development": {{
    "duration": "20-25 minutes",
    "activities": ["5-7 detailed step-by-step teaching activities covering knowledge, skills, and application"]
  }},
  "conclusion": {{
    "duration": "5-8 minutes",
    "activities": ["3-4 wrap-up activities for consolidation and reflection"]
  }},
  "assessment": ["3-4 specific assessment strategies aligned with objectives"],
  "differentiation": {{
    "advanced": "Activities for advanced/gifted learners",
    "struggling": "Support strategies for struggling learners"
  }},
  "resources": ["5-7 specific teaching and learning resources needed"],
  "teacherReflection": "Guiding questions for teacher self-reflection after the lesson"
}}

REQUIREMENTS:
- Activities must be AGE-APPROPRIATE for {grade} learners
- Use LEARNER-CENTERED pedagogy (group work, pair work, hands-on activities)
- Include INTEGRATION of core competencies (communication, collaboration, critical thinking, creativity, digital literacy, citizenship, learning to learn)
- Include Pertinent and Contemporary Issues (PCIs) where relevant
- Include values integration
- Activities should be SPECIFIC and ACTIONABLE — not vague
- Resources should be REALISTIC for a Kenyan classroom setting

Return ONLY the JSON object, no other text."""


_FENCE_RE = re.compile(r"^```(?:json)?\n?|\n?```$", re.IGNORECASE)


def _strip_code_fence(raw: str) -> str:
    """Mirror the TS fence-stripping at generate-lesson-plan/index.ts:113-115."""
    s = raw.strip()
    if s.startswith("```"):
        s = _FENCE_RE.sub("", s).strip()
    return s


def parse_lesson_plan(raw: str) -> LessonPlan:
    """Coerce an LLM response string into a validated :class:`LessonPlan`.

    Strips ``` fences then attempts ``json.loads``. On failure, falls back to
    extracting the first ``{...}`` blob (defensive — the TS source does not do
    this, but Llama-class models sometimes prepend a stray sentence even when
    asked for JSON-only). Raises :class:`LessonPlanValidationError` on any
    parse or schema mismatch.
    """
    cleaned = _strip_code_fence(raw)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            log.error("Lesson plan: no JSON object found in response (preview=%s)", cleaned[:200])
            raise LessonPlanValidationError("LLM did not return JSON")
        try:
            data = json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            log.error("Lesson plan: JSON parse failed (preview=%s)", cleaned[:200])
            raise LessonPlanValidationError(f"Invalid JSON: {exc}") from exc

    try:
        return LessonPlan.model_validate(data)
    except ValidationError as exc:
        log.error("Lesson plan: schema validation failed", extra={"errors": exc.errors()})
        raise LessonPlanValidationError(str(exc)) from exc


async def generate_lesson_plan(
    provider: LLMProvider,
    *,
    grade: str,
    subject: str,
    strand: str,
    sub_strand: str,
    slo: Optional[str] = None,
    learning_experiences: Optional[str] = None,
    key_inquiry_question: Optional[str] = None,
    learning_resources: Optional[str] = None,
    term: Optional[str] = None,
    additional_notes: Optional[str] = None,
) -> LessonPlan:
    """Generate one lesson plan as a validated :class:`LessonPlan`.

    Required: ``grade``, ``subject``, ``strand``, ``sub_strand`` (mirrors the
    TS ``Missing required fields`` 400 at line 23). Optional context fields
    come straight from the parent ``SchemeRow`` — the caller (typically
    ``LessonArchitectAgent.generate_lesson_plan``) is responsible for pulling
    them out of the row dict.

    Propagates :class:`scheme.batched.RateLimitError` so the orchestrator can
    distinguish "try again" from "broken response" without parsing strings.
    """
    if not (grade and subject and strand and sub_strand):
        raise ValueError("grade, subject, strand, sub_strand are required")

    prompt = _build_prompt(
        grade=grade,
        subject=subject,
        strand=strand,
        sub_strand=sub_strand,
        slo=slo,
        learning_experiences=learning_experiences,
        key_inquiry_question=key_inquiry_question,
        learning_resources=learning_resources,
        term=term,
        additional_notes=additional_notes,
    )

    try:
        raw = await provider.generate(prompt, system=_SYSTEM_PROMPT)
    except RateLimitError:
        raise
    except Exception as exc:
        msg = str(exc).lower()
        if "rate" in msg and "limit" in msg or "429" in msg:
            raise RateLimitError("RATE_LIMIT") from exc
        raise

    return parse_lesson_plan(raw)


__all__ = [
    "LessonPlan",
    "LessonSection",
    "Differentiation",
    "LessonPlanValidationError",
    "generate_lesson_plan",
    "parse_lesson_plan",
]
