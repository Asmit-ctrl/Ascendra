"""Scheme-of-work generation primitives ported from scheme-scribe-ai.

This subpackage holds the JSON recovery, key normalization, KICD guardrails,
and batched-generation loop that produce the 10-column CBC `SchemeRow` shape
the studio's `SchemePreview` component expects.

The orchestrator that wires these together lives in
`syncsenta_agents.agents.lesson_architect.LessonArchitectAgent.generate_scheme`.

See `Ascendra/.claude/specs/scheme-scribe-merge.md` for the porting plan and
`_inventory/scheme-scribe-ai/supabase/functions/generate-scheme/index.ts` for
the source of truth — guardrail numbering and ordering are preserved.
"""

from .normalize import (
    SchemeRow,
    extract_json_array,
    normalize_row_keys,
)
from .guardrails import (
    enforce_lesson_count,
    enforce_strand_names,
    enforce_week_lesson_numbering,
    ensure_no_empty_fields,
    get_klb_book_title,
    validate_and_fix_experiences,
    validate_and_fix_slo,
    validate_and_sanitize_rows,
    validate_ksa_structure,
    validate_slo_alignment,
)
from .lesson_plan import (
    Differentiation,
    LessonPlan,
    LessonPlanValidationError,
    LessonSection,
    generate_lesson_plan,
    parse_lesson_plan,
)

__all__ = [
    "SchemeRow",
    "extract_json_array",
    "normalize_row_keys",
    "enforce_lesson_count",
    "enforce_strand_names",
    "enforce_week_lesson_numbering",
    "ensure_no_empty_fields",
    "get_klb_book_title",
    "validate_and_fix_experiences",
    "validate_and_fix_slo",
    "validate_and_sanitize_rows",
    "validate_ksa_structure",
    "validate_slo_alignment",
    "LessonPlan",
    "LessonSection",
    "Differentiation",
    "LessonPlanValidationError",
    "generate_lesson_plan",
    "parse_lesson_plan",
]
