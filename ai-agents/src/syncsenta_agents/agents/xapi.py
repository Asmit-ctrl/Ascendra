"""xAPI (Tin Can) statement generation for sandbox telemetry.

Per the MeTTa Phase 1 success criteria in `.kiro/METTA_KEY_INSIGHTS.md`,
every captured student action must produce a valid xAPI 1.0.3 statement
so the behavioural stream can be forwarded to any standard Learning
Record Store later.

We don't run our own LRS — the statements are stored in the
`xapi_statements` Supabase table and forwarded to any external LRS the
deployment chooses to wire up. Keeping the envelope canonical means we
can swap LRSs without re-deriving signals.

Spec reference: https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md

This module is intentionally dependency-free — `uuid`, `datetime`, and
typing only — so a unit test can import it without bringing the rest of
the agent stack.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

# Canonical verb IRIs — a mix of ADL-registered verbs and project-local
# vocabulary for sandbox-specific events that ADL doesn't define
# (`hover`, `erase`, `drag`). Keep this table tight: the LRS rejects
# unknown verbs without prior registration in some implementations.
_VERB_TABLE: Dict[str, Dict[str, Any]] = {
    "click": {
        "id": "https://w3id.org/xapi/dod-isd/verbs/selected",
        "display": {"en-US": "selected"},
    },
    "hover": {
        # No ADL-registered verb for hover; use a project-local IRI so a
        # downstream LRS can still group statements by verb.
        "id": "https://ascendra.ai/xapi/verbs/hovered",
        "display": {"en-US": "hovered over"},
    },
    "drag": {
        "id": "https://ascendra.ai/xapi/verbs/dragged",
        "display": {"en-US": "dragged"},
    },
    "drop": {
        "id": "https://ascendra.ai/xapi/verbs/dropped",
        "display": {"en-US": "dropped"},
    },
    "undo": {
        # ADL has no "undid" verb — use the canonical "voided" semantics
        # for statement voiding, scoped here to a single action.
        "id": "https://ascendra.ai/xapi/verbs/undid",
        "display": {"en-US": "undid"},
    },
    "redo": {
        "id": "https://ascendra.ai/xapi/verbs/redid",
        "display": {"en-US": "redid"},
    },
    "erase": {
        "id": "https://ascendra.ai/xapi/verbs/erased",
        "display": {"en-US": "erased"},
    },
    "input": {
        "id": "http://activitystrea.ms/schema/1.0/update",
        "display": {"en-US": "updated"},
    },
    "submit": {
        "id": "http://adlnet.gov/expapi/verbs/answered",
        "display": {"en-US": "answered"},
    },
    "tool_select": {
        "id": "https://ascendra.ai/xapi/verbs/selected-tool",
        "display": {"en-US": "selected tool"},
    },
    "object_create": {
        "id": "http://activitystrea.ms/schema/1.0/create",
        "display": {"en-US": "created"},
    },
    "object_delete": {
        "id": "http://activitystrea.ms/schema/1.0/delete",
        "display": {"en-US": "deleted"},
    },
    "object_modify": {
        "id": "http://activitystrea.ms/schema/1.0/update",
        "display": {"en-US": "modified"},
    },
}

# Catch-all when we receive an event_type we haven't catalogued yet —
# better than dropping the statement.
_FALLBACK_VERB = {
    "id": "http://adlnet.gov/expapi/verbs/interacted",
    "display": {"en-US": "interacted with"},
}

# Default IRI prefix for activity objects. The frontend tells us
# `activity_type` + `target`; we concatenate them under this namespace so
# objects are stable across sessions for the same activity.
_ACTIVITY_NS = "https://ascendra.ai/xapi/activities"


def _ms_to_iso(ts_ms: float) -> str:
    """Convert millisecond Unix timestamp to ISO-8601 UTC string.

    xAPI requires ISO-8601 with timezone; the frontend sends ms since
    epoch from `Date.now()`. We pin to UTC because the LRS needs a
    deterministic ordering across timezones.
    """
    return (
        datetime.fromtimestamp(ts_ms / 1000.0, tz=timezone.utc)
        .isoformat()
        .replace("+00:00", "Z")
    )


def _resolve_verb(event_type: str) -> Dict[str, Any]:
    return _VERB_TABLE.get(event_type.lower(), _FALLBACK_VERB)


def build_statement(
    *,
    event: Dict[str, Any],
    session_id: str,
    student_id: str,
    activity_type: str,
    competency: Optional[str] = None,
    grade: Optional[str] = None,
    subject: Optional[str] = None,
    registration: Optional[str] = None,
) -> Dict[str, Any]:
    """Build a single xAPI statement envelope from one frontend event.

    `event` is the raw dict the studio's `InteractiveSandbox` POSTs.
    Required fields on it: `timestamp` (ms), `event_type`, `target`.
    Optional fields surface as `result.extensions`.

    The returned dict is a valid xAPI 1.0.3 statement and is also what
    we store verbatim in the `xapi_statements` table.
    """
    event_type = str(event.get("event_type") or "interacted")
    verb = _resolve_verb(event_type)
    target = str(event.get("target") or "unknown")

    # The xAPI statement IDs must be UUIDs; let the caller specify one
    # via metadata.statement_id if they want idempotent writes, else
    # mint a fresh one.
    statement_id = (
        event.get("metadata", {}).get("statement_id")
        if isinstance(event.get("metadata"), dict)
        else None
    )
    statement_id = statement_id or str(uuid.uuid4())

    # Result extensions carry the raw signal — duration, position, etc.
    # We use namespaced IRIs (xAPI requires this for extension keys).
    result_extensions: Dict[str, Any] = {}
    if "duration" in event and event["duration"] is not None:
        # xAPI has a top-level result.duration in ISO-8601 — populated
        # below — but we also keep the raw ms for downstream agents
        # that don't want to parse ISO durations.
        result_extensions["https://ascendra.ai/xapi/ext/duration-ms"] = event["duration"]
    if "position" in event and event["position"] is not None:
        result_extensions["https://ascendra.ai/xapi/ext/position"] = event["position"]
    if event.get("metadata"):
        result_extensions["https://ascendra.ai/xapi/ext/metadata"] = event["metadata"]

    result: Optional[Dict[str, Any]] = None
    if result_extensions or "duration" in event:
        result = {}
        if result_extensions:
            result["extensions"] = result_extensions
        if event.get("duration") is not None:
            # ISO-8601 duration — milliseconds → "PT<sec>S".
            sec = float(event["duration"]) / 1000.0
            result["duration"] = f"PT{sec:.3f}S"

    context_extensions = {
        "https://ascendra.ai/xapi/ext/session-id": session_id,
        "https://ascendra.ai/xapi/ext/activity-type": activity_type,
    }
    if competency:
        context_extensions["https://ascendra.ai/xapi/ext/competency"] = competency
    if grade:
        context_extensions["https://ascendra.ai/xapi/ext/grade"] = grade
    if subject:
        context_extensions["https://ascendra.ai/xapi/ext/subject"] = subject

    statement: Dict[str, Any] = {
        "id": statement_id,
        "actor": {
            "objectType": "Agent",
            "name": student_id,
            "account": {
                "homePage": "https://ascendra.ai/students",
                "name": student_id,
            },
        },
        "verb": verb,
        "object": {
            "objectType": "Activity",
            "id": f"{_ACTIVITY_NS}/{activity_type}/{target}",
            "definition": {
                "name": {"en-US": target},
                "type": f"{_ACTIVITY_NS}/types/{activity_type}",
            },
        },
        "timestamp": _ms_to_iso(float(event.get("timestamp") or 0)),
        "context": {
            "registration": registration or session_id,
            "platform": "ascendra-sandbox",
            "language": "en-US",
            "extensions": context_extensions,
        },
    }
    if result is not None:
        statement["result"] = result

    return statement


def build_statements(
    *,
    events: List[Dict[str, Any]],
    session_id: str,
    student_id: str,
    activity_type: str,
    competency: Optional[str] = None,
    grade: Optional[str] = None,
    subject: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Build xAPI statements for a whole batch of events.

    Uses one `registration` UUID for the session so the LRS can group
    every statement in a sandbox session as a single "attempt".
    """
    registration = str(uuid.uuid4())
    return [
        build_statement(
            event=ev,
            session_id=session_id,
            student_id=student_id,
            activity_type=activity_type,
            competency=competency,
            grade=grade,
            subject=subject,
            registration=registration,
        )
        for ev in events
    ]
