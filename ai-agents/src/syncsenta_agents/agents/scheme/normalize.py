"""JSON recovery + key normalization for LLM-produced scheme rows.

Ported verbatim from
`_inventory/scheme-scribe-ai/supabase/functions/generate-scheme/index.ts:30-81`
(``extractJsonArray``) and lines 242-281 (``normalizeRowKeys``).

These two helpers cover Guardrail 6 (key normalization) and the
LLM-output-recovery layer that runs *before* the rest of the guardrails. They
are pure and have no I/O — keep them that way.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, TypedDict

log = logging.getLogger(__name__)


class SchemeRow(TypedDict):
    """The 10-column CBC scheme-of-work row shape the studio renderer expects.

    Mirrors the ``SchemeRow`` interface in scheme-scribe-ai's
    ``generate-scheme/index.ts`` and the studio's
    ``Ascendra/studio/src/components/scheme-wizard/scheme-preview.tsx``.
    """

    week: int
    lesson: int
    strand: str
    subStrand: str
    specificLearningOutcome: str
    keyInquiryQuestion: str
    learningExperiences: str
    learningResources: str
    assessmentMethods: str
    reflection: str


# Key-variant → canonical map. Matched after lowercasing and stripping
# ``-``/``_``/whitespace from the raw key, so e.g. ``Specific Learning Outcome``,
# ``specific_learning_outcomes`` and ``specificLearningOutcome`` all resolve.
_KEY_MAP: Dict[str, str] = {
    "specificlearningoutcome": "specificLearningOutcome",
    "specificlearningoutcomes": "specificLearningOutcome",
    "learningoutcome": "specificLearningOutcome",
    "learningoutcomes": "specificLearningOutcome",
    "keyinquiryquestion": "keyInquiryQuestion",
    "keyinquiryquestions": "keyInquiryQuestion",
    "inquiryquestion": "keyInquiryQuestion",
    "learningexperiences": "learningExperiences",
    "learningresources": "learningResources",
    "assessmentmethods": "assessmentMethods",
    "assessment": "assessmentMethods",
    "substrand": "subStrand",
}


def _canon_key(key: str) -> str:
    return re.sub(r"[-_\s]", "", key).lower()


def _sanitize_escape_sequences(text: str) -> str:
    r"""Remove or fix invalid escape sequences that break JSON parsing.
    
    LLMs sometimes generate invalid escape sequences like \x, \a, etc.
    This function fixes them before JSON parsing.
    """
    # Replace invalid escape sequences with escaped backslash
    # Valid JSON escapes are: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
    # Everything else should have the backslash escaped
    def fix_escape(match):
        char = match.group(1)
        # Keep valid JSON escapes
        if char in ('"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u'):
            return match.group(0)
        # Escape the backslash for invalid sequences
        return '\\\\' + char
    
    # Match backslash followed by any character
    return re.sub(r'\\(.)', fix_escape, text)


def extract_json_array(raw: str) -> List[Dict[str, Any]]:
    r"""Parse an LLM response into a list of raw row dicts.

    Mirrors ``extractJsonArray`` from scheme-scribe-ai. Strips ``\`\`\`json``
    fences, then tries a direct parse of the ``[...]`` slice. If that fails
    (truncated response — common when the LLM hits its token budget mid-row),
    walks back to the last complete ``}``, closes the array, scrubs trailing
    commas, and reparses.

    Raises ``ValueError`` if no parseable JSON array can be recovered. The
    caller is expected to retry or partial-return depending on the batch
    policy.
    """
    cleaned = raw.strip()

    # Strip markdown code fences (``` or ```json) at the boundaries.
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned)
    cleaned = cleaned.strip()

    start = cleaned.find("[")
    if start == -1:
        raise ValueError("No JSON array found in response")

    end = cleaned.rfind("]")

    # Happy path: complete array.
    if end > start:
        try:
            # Sanitize escape sequences before parsing
            sanitized = _sanitize_escape_sequences(cleaned[start : end + 1])
            parsed = json.loads(sanitized)
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError as exc:
            log.warning("JSON parse failed on complete array: %s", exc)
            pass  # fall through to recovery

    # Truncated — recover up to the last complete object.
    log.warning("Scheme response appears truncated, attempting recovery")
    partial = cleaned[start:]
    last_brace = partial.rfind("}")
    if last_brace <= 0:
        raise ValueError("No parseable JSON found in response")

    repaired = partial[: last_brace + 1]
    repaired = re.sub(r",\s*$", "", repaired)
    repaired = repaired + "]"
    # Trailing commas inside the last object / array slot.
    repaired = re.sub(r",\s*}", "}", repaired)
    repaired = re.sub(r",\s*]", "]", repaired)

    try:
        # Sanitize escape sequences before parsing
        sanitized = _sanitize_escape_sequences(repaired)
        items = json.loads(sanitized)
    except json.JSONDecodeError as exc:
        raise ValueError("Cannot recover truncated JSON: {}".format(exc)) from exc

    if not isinstance(items, list):
        raise ValueError("Recovered JSON was not an array")

    log.warning("Recovered %d items from truncated response", len(items))
    return items


def normalize_row_keys(raw: Dict[str, Any]) -> SchemeRow:
    """Coerce a raw LLM row dict to the canonical ``SchemeRow`` shape.

    Guardrail 6 from scheme-scribe-ai. Tolerates snake_case, lowercased, and
    plural-form keys that LLMs love to emit. Missing fields default to empty
    strings (later guardrails fill in sensible content); ``reflection`` is
    always reset to ``""`` because the official KICD spec leaves it blank for
    the teacher to write after teaching the lesson.
    """
    normalized: Dict[str, Any] = {}
    for key, value in raw.items():
        canonical = _KEY_MAP.get(_canon_key(key), key)
        normalized[canonical] = value

    def _int(v: Any, default: int) -> int:
        try:
            return int(v)
        except (TypeError, ValueError):
            return default

    def _str(v: Any) -> str:
        if v is None:
            return ""
        return str(v)

    return SchemeRow(
        week=_int(normalized.get("week"), 1),
        lesson=_int(normalized.get("lesson"), 1),
        strand=_str(normalized.get("strand")),
        subStrand=_str(normalized.get("subStrand")),
        specificLearningOutcome=_str(normalized.get("specificLearningOutcome")),
        keyInquiryQuestion=_str(normalized.get("keyInquiryQuestion")),
        learningExperiences=_str(normalized.get("learningExperiences")),
        learningResources=_str(normalized.get("learningResources")),
        assessmentMethods=_str(normalized.get("assessmentMethods")),
        reflection="",
    )
