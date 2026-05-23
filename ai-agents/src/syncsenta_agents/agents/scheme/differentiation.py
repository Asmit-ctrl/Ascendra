"""Per-lesson-plan differentiation suggestions.

First-party Tier 2 tool — no scheme-scribe-ai TS source. Composes the Tier 1
lesson-plan artefact: takes a validated :class:`scheme.lesson_plan.LessonPlan`
shape as input and produces three concrete adaptations of its activities
(support / on-grade / extension), each KSA-tagged and each carrying a brief
note for the teacher.

Why three tiers, and why this framing:
- KICD's CBC inclusion guidance (and the KICD-SNE sector handbook) splits
  learners by *access to the same outcome* — not by IEP-style separate
  goals. Every tier targets the same SLO; only the route differs. We
  preserve that by reusing the lesson plan's objectives across tiers and
  varying only the activities + resources + assessment cues.
- Lower-primary classrooms in Kenya rarely have aides; "support" must mean
  things one teacher can actually deliver while the rest of the class works
  on the on-grade tier. The prompt enforces this by banning suggestions
  that require additional adult support.
- "Extension" is *deeper application of the same outcome*, not "do the
  next sub-strand early" — that would break the scheme-of-work cadence.

Conventions match the existing scheme-scribe ports
(:mod:`scheme.lesson_plan`, :mod:`scheme.exam`, :mod:`agents.unpacker`):
- Pydantic models with camelCase field names so the studio renders directly.
- Local :class:`LLMProvider` Protocol (per-module convention).
- :class:`RateLimitError` re-imported from :mod:`scheme.batched` so the
  orchestrator can distinguish "retry" from "broken response".
- Same code-fence stripping + first-``{...}`` JSON recovery as
  :func:`scheme.lesson_plan.parse_lesson_plan`.

The KSA verb lists and lower-primary verb-replacement table embedded in the
prompt are imported from :mod:`scheme.guardrails` rather than duplicated,
matching the unpacker's pattern.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Literal, Optional, Protocol

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


class DifferentiationValidationError(ValueError):
    """Raised when the LLM response can't be coerced into ``Differentiation``."""


# ────────────────────────────────────────────────────────────────────────────
# Output contract — camelCase to match scheme/lesson_plan/exam convention.
# Three tiers, all targeting the same SLO; structure is symmetric across them
# so the studio renderer can switch on tier name without per-tier branches.
# ────────────────────────────────────────────────────────────────────────────
KSACategory = Literal["knowledge", "skills", "attitudes"]


class TierAdaptation(BaseModel):
    """One concrete adaptation of a lesson activity for a tier.

    ``ksa`` ties the adaptation back to the K/S/A category it serves so the
    teacher can see at a glance which dimension of the SLO is being
    differentiated (often Knowledge for support, Skills for on-grade,
    Attitudes/Skills application for extension — but not always).
    """

    activity: str = Field(min_length=1)
    note: str = Field(min_length=1)
    ksa: KSACategory


class DifferentiationTier(BaseModel):
    """All adaptations for one tier (support | onGrade | extension).

    Every tier carries:
    - ``learnerProfile`` — one sentence describing who this tier is for, in
      CBC-SNE language (e.g. "Learners who need additional time and
      multisensory cues to access place-value concepts").
    - ``adaptations`` — concrete reworkings of the lesson's activities.
    - ``resourceSwaps`` — substitutions for the lesson's resources list.
    - ``assessmentCues`` — observable signals the teacher can use to check
      whether the tier worked for that learner.
    """

    learnerProfile: str = Field(min_length=1)
    adaptations: list[TierAdaptation] = Field(min_length=1)
    resourceSwaps: list[str] = Field(default_factory=list)
    assessmentCues: list[str] = Field(min_length=1)


class Differentiation(BaseModel):
    """Three-tier differentiation block for one lesson plan.

    The lesson plan's ``objectives`` are echoed back at the top so the
    studio can render "all three tiers target the same outcome" without
    having to look up the source plan. ``coreCompetencies`` and
    ``inclusionStrategies`` are optional CBC dimensions; ``values`` is
    deliberately omitted because differentiation doesn't change the
    target values, only the route to them.
    """

    title: str
    grade: str
    subject: str
    strand: str
    subStrand: str
    objectives: list[str] = Field(min_length=1)
    support: DifferentiationTier
    onGrade: DifferentiationTier
    extension: DifferentiationTier
    inclusionStrategies: list[str] = Field(default_factory=list)
    coreCompetencies: list[str] = Field(default_factory=list)


# System prompt mirrors lesson_plan / unpacker convention.
_SYSTEM_PROMPT = (
    "You are a KICD Kenya CBC curriculum expert. Return ONLY valid JSON."
)


def _is_lower_primary_non_language(grade: str, subject: str) -> bool:
    """Mirror ``_apply_lower_primary_verb_replacements`` applicability check.

    Same gate as :func:`agents.unpacker._is_lower_primary_non_language` —
    duplicated rather than imported so the per-module-Protocol convention
    holds (each port owns its prompt-construction helpers).
    """
    grade_num = _grade_num(grade)
    return 1 <= grade_num <= 3 and subject not in _LANGUAGE_SUBJECTS


def _format_replacement_table(is_sw: bool) -> str:
    """Render the lower-primary verb-replacement table for prompt embedding."""
    table = _LOWER_PRIMARY_REPLACEMENTS_SW if is_sw else _LOWER_PRIMARY_REPLACEMENTS_EN
    lines = []
    for pattern, replacement in table:
        verb = re.sub(r"\\b|\\\(.*?\\\)", "", pattern).strip()
        lines.append(f"  • {verb} → {replacement}")
    return "\n".join(lines)


def _summarize_activities(lesson_plan: dict[str, Any]) -> str:
    """Pull the lesson plan's activities into a compact bulleted block.

    The prompt needs the activities verbatim so adaptations can reference
    them ("re-do step 3 with bottle tops instead of slates"). We do NOT
    forward the whole lesson-plan JSON — that bloats the prompt and tempts
    the model to regenerate the plan instead of adapting it.
    """
    sections = []
    for key in ("introduction", "development", "conclusion"):
        section = lesson_plan.get(key) or {}
        activities = section.get("activities") or []
        if activities:
            joined = "\n".join(f"    - {a}" for a in activities)
            sections.append(f"  {key.capitalize()} ({section.get('duration', '')}):\n{joined}")
    return "\n".join(sections) if sections else "  (lesson plan provided no activity sections)"


def _build_prompt(
    *,
    lesson_plan: dict[str, Any],
    language: str,
) -> str:
    """Build the differentiation prompt.

    Embeds the KSA verb lists so adaptations stay tethered to the project's
    canonical set, the lower-primary substitution table when applicable,
    and the lesson plan's activities verbatim so adaptations *adapt* rather
    than regenerate.
    """
    is_sw = language.lower() in {"kiswahili", "sw"}
    lang_label = "Kiswahili" if is_sw else "English"

    grade = lesson_plan.get("grade", "")
    subject = lesson_plan.get("subject", "")
    strand = lesson_plan.get("strand", "")
    sub_strand = lesson_plan.get("subStrand") or lesson_plan.get("sub_strand", "")
    title = lesson_plan.get("title", "")
    objectives = lesson_plan.get("objectives") or []
    resources = lesson_plan.get("resources") or []
    kiq = lesson_plan.get("keyInquiryQuestion") or lesson_plan.get("key_inquiry_question") or ""

    knowledge_verbs = _KNOWLEDGE_VERBS_SW if is_sw else _KNOWLEDGE_VERBS_EN
    skills_verbs = _SKILLS_VERBS_SW if is_sw else _SKILLS_VERBS_EN
    attitude_verbs = _ATTITUDE_VERBS_SW if is_sw else _ATTITUDE_VERBS_EN

    lower_primary_block = ""
    if _is_lower_primary_non_language(grade, subject):
        lower_primary_block = (
            f"\n═══ LOWER-PRIMARY VERB SUBSTITUTIONS (MANDATORY for {grade}) ═══\n"
            "Apply these substitutions in all adaptation activities and assessment cues:\n"
            f"{_format_replacement_table(is_sw)}\n"
            "Reason: these verbs are developmentally appropriate for Grades 1-3 "
            "non-language learners.\n"
        )

    objectives_block = "\n".join(f"  - {o}" for o in objectives) if objectives else "  (none provided)"
    resources_block = ", ".join(resources) if resources else "(none provided)"
    activities_block = _summarize_activities(lesson_plan)

    return f"""You are a KICD Kenya CBC curriculum expert. Generate three-tier differentiation suggestions for the lesson plan below. All three tiers MUST target the SAME learning outcome — only the route differs.

LESSON CONTEXT:
- Title: {title}
- Grade: {grade}
- Subject: {subject}
- Strand: {strand}
- Sub-Strand: {sub_strand}
- Key Inquiry Question: {kiq}
- Language: {lang_label}

LESSON OBJECTIVES (every tier serves these):
{objectives_block}

LESSON ACTIVITIES (adapt these — do NOT replace with unrelated tasks):
{activities_block}

LESSON RESOURCES (suggest swaps per tier from realistic Kenyan-classroom alternatives): {resources_block}

═══ KICD KSA VERB LISTS (use ONLY these for adaptation verbs) ═══
- Knowledge verbs: {", ".join(knowledge_verbs)}
- Skills verbs: {", ".join(skills_verbs)}
- Attitudes verbs: {", ".join(attitude_verbs)}
Do NOT use banned framings: "know", "understand", "be aware", "learn to", "have a positive attitude".
{lower_primary_block}
═══ TIER DEFINITIONS (CBC inclusion framing — NOT US IEP) ═══
- SUPPORT: learners who need additional time, scaffolding, or multisensory cues to access the SAME outcome. Adaptations MUST be deliverable by ONE teacher with no aide. Banned: "pair with an aide", "request a special-needs assistant", "send home for parent help".
- ON-GRADE: the activities as written, with one concrete pacing or grouping refinement per activity. Not a copy of the lesson plan — a refinement of it.
- EXTENSION: deeper application of the SAME outcome. Banned: "introduce next week's sub-strand", "skip to Grade N+1 content". Use real-world transfer, peer-teaching, or KICD-values integration instead.

═══ OUTPUT JSON SHAPE (EXACT) ═══
{{
  "title": "{title}",
  "grade": "{grade}",
  "subject": "{subject}",
  "strand": "{strand}",
  "subStrand": "{sub_strand}",
  "objectives": {json.dumps(objectives)},
  "support": {{
    "learnerProfile": "<one sentence in CBC-SNE language describing who this tier is for>",
    "adaptations": [
      {{
        "activity": "<concrete reworking of one of the lesson activities above>",
        "note": "<why this works for this tier — one sentence>",
        "ksa": "knowledge" | "skills" | "attitudes"
      }}
    ],
    "resourceSwaps": ["<realistic Kenyan-classroom substitution, e.g. 'bottle tops instead of base-ten blocks'>"],
    "assessmentCues": ["<observable signal the teacher can tick — see/hear/check>"]
  }},
  "onGrade": {{ ... same shape ... }},
  "extension": {{ ... same shape ... }},
  "inclusionStrategies": ["<0-3 KICD-SNE inclusion strategies that span all three tiers, e.g. 'flexible seating', 'visual schedule'>"],
  "coreCompetencies": ["<0-3 KICD core competencies that the differentiation surfaces>"]
}}

═══ REQUIREMENTS ═══
- 2-4 adaptations per tier. More than 4 dilutes the teacher's attention; fewer than 2 isn't differentiation.
- Every adaptation MUST reference (or clearly derive from) one of the activities listed above. No new sub-strands, no off-topic enrichment.
- Every adaptation MUST start with a verb from the KSA lists above and be tagged with its ksa category.
- 2-4 assessment cues per tier. Cues are OBSERVABLE behaviours — "Counts a pile of 20 bottle tops with no errors", NOT "Understands counting".
- Resource swaps are optional per tier (empty array OK) but if present must be realistic for a Kenyan classroom.
- inclusionStrategies and coreCompetencies are optional — only include ones that genuinely apply.

Return ONLY the JSON object. No prose, no markdown fences, no commentary."""


_FENCE_RE = re.compile(r"^```(?:json)?\n?|\n?```$", re.IGNORECASE)


def _strip_code_fence(raw: str) -> str:
    """Mirror the same fence-stripping used in lesson_plan / unpacker."""
    s = raw.strip()
    if s.startswith("```"):
        s = _FENCE_RE.sub("", s).strip()
    return s


def parse_differentiation(raw: str) -> Differentiation:
    """Coerce an LLM response string into a validated :class:`Differentiation`.

    Strips ``` fences then attempts ``json.loads``. Falls back to extracting
    the first ``{...}`` blob (defensive — Llama-class models occasionally
    prepend a stray sentence even when asked for JSON-only). Raises
    :class:`DifferentiationValidationError` on any parse or schema mismatch.
    """
    cleaned = _strip_code_fence(raw)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            log.error("Differentiation: no JSON object found (preview=%s)", cleaned[:200])
            raise DifferentiationValidationError("LLM did not return JSON")
        try:
            data = json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            log.error("Differentiation: JSON parse failed (preview=%s)", cleaned[:200])
            raise DifferentiationValidationError(f"Invalid JSON: {exc}") from exc

    try:
        return Differentiation.model_validate(data)
    except ValidationError as exc:
        log.error("Differentiation: schema validation failed", extra={"errors": exc.errors()})
        raise DifferentiationValidationError(str(exc)) from exc


def _required_lesson_plan_keys(lesson_plan: dict[str, Any]) -> Optional[str]:
    """Return name of the first missing required key, or None if all present.

    Caller passes the lesson-plan dict directly (typically straight from
    Tier 1's ``generate_lesson_plan`` output). We require the same minimal
    set the LessonPlan model requires for the studio renderer to function.
    """
    for key in ("grade", "subject", "strand", "subStrand", "objectives"):
        if not lesson_plan.get(key):
            return key
    return None


async def generate_differentiation(
    provider: LLMProvider,
    *,
    lesson_plan: dict[str, Any],
    language: str = "english",
) -> Differentiation:
    """Generate three-tier differentiation for one lesson plan.

    The ``lesson_plan`` dict should be the output of
    :func:`scheme.lesson_plan.generate_lesson_plan` (or
    :meth:`pydantic.BaseModel.model_dump` thereof). Strictly speaking we
    only require ``grade``, ``subject``, ``strand``, ``subStrand``, and
    ``objectives``; the rest is consumed opportunistically.

    Propagates :class:`scheme.batched.RateLimitError` so the orchestrator
    can distinguish "try again" from "broken response" without parsing
    strings.
    """
    missing = _required_lesson_plan_keys(lesson_plan)
    if missing:
        raise ValueError(f"lesson_plan is missing required key: {missing}")

    prompt = _build_prompt(lesson_plan=lesson_plan, language=language)

    try:
        raw = await provider.generate(prompt, system=_SYSTEM_PROMPT)
    except RateLimitError:
        raise
    except Exception as exc:
        msg = str(exc).lower()
        if ("rate" in msg and "limit" in msg) or "429" in msg:
            raise RateLimitError("RATE_LIMIT") from exc
        raise

    return parse_differentiation(raw)


__all__ = [
    "Differentiation",
    "DifferentiationTier",
    "DifferentiationValidationError",
    "KSACategory",
    "LLMProvider",
    "TierAdaptation",
    "generate_differentiation",
    "parse_differentiation",
]
