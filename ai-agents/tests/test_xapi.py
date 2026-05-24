"""Tests for the xAPI statement generator.

These are intentionally dependency-light — the xapi module only needs
``uuid`` and ``datetime``, so we can run these without poetry-install
of the full agent stack.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

from syncsenta_agents.agents.xapi import (
    build_statement,
    build_statements,
    _VERB_TABLE,
)


def _sample_event(**overrides):
    base = {
        "timestamp": 1715000000000.0,
        "event_type": "click",
        "target": "fraction_1_2",
        "position": [120.5, 88.0],
        "duration": 1500.0,
        "metadata": {"tool": "drag"},
    }
    base.update(overrides)
    return base


def test_build_statement_required_envelope_fields():
    s = build_statement(
        event=_sample_event(),
        session_id="sess_42",
        student_id="stu_001",
        activity_type="fraction_sandbox",
        competency="MATH.G4.FRACTIONS",
        grade="Grade 4",
        subject="Mathematics",
    )
    # Statement IDs must be RFC 4122 UUIDs.
    assert re.match(
        r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
        s["id"],
    )
    assert s["actor"]["objectType"] == "Agent"
    assert s["actor"]["account"]["name"] == "stu_001"
    assert s["verb"]["id"] == _VERB_TABLE["click"]["id"]
    assert s["object"]["objectType"] == "Activity"
    assert "fraction_sandbox/fraction_1_2" in s["object"]["id"]
    # ISO-8601 UTC timestamp.
    assert s["timestamp"].endswith("Z")
    assert s["context"]["registration"] == "sess_42"
    assert s["context"]["platform"] == "ascendra-sandbox"


def test_timestamp_round_trips_to_utc_iso():
    s = build_statement(
        event=_sample_event(timestamp=1715000000000.0),
        session_id="s",
        student_id="u",
        activity_type="a",
    )
    parsed = datetime.fromisoformat(s["timestamp"].replace("Z", "+00:00"))
    assert parsed.tzinfo == timezone.utc
    # 1715000000000 ms == 2024-05-06T14:53:20Z
    assert parsed.year == 2024 and parsed.month == 5


def test_result_includes_iso_duration_and_extensions():
    s = build_statement(
        event=_sample_event(duration=2500.0),
        session_id="s",
        student_id="u",
        activity_type="a",
    )
    assert s["result"]["duration"] == "PT2.500S"
    ext = s["result"]["extensions"]
    assert ext["https://ascendra.ai/xapi/ext/duration-ms"] == 2500.0
    assert ext["https://ascendra.ai/xapi/ext/position"] == [120.5, 88.0]
    assert ext["https://ascendra.ai/xapi/ext/metadata"] == {"tool": "drag"}


def test_no_result_when_no_signal():
    s = build_statement(
        event={"timestamp": 1, "event_type": "click", "target": "btn"},
        session_id="s",
        student_id="u",
        activity_type="a",
    )
    assert "result" not in s


def test_context_extensions_carry_curriculum_keys():
    s = build_statement(
        event=_sample_event(),
        session_id="s",
        student_id="u",
        activity_type="a",
        competency="MATH.G4.FRACTIONS",
        grade="Grade 4",
        subject="Mathematics",
    )
    ext = s["context"]["extensions"]
    assert ext["https://ascendra.ai/xapi/ext/competency"] == "MATH.G4.FRACTIONS"
    assert ext["https://ascendra.ai/xapi/ext/grade"] == "Grade 4"
    assert ext["https://ascendra.ai/xapi/ext/subject"] == "Mathematics"


def test_unknown_event_type_falls_back_to_interacted():
    s = build_statement(
        event={"timestamp": 1, "event_type": "teleported", "target": "x"},
        session_id="s",
        student_id="u",
        activity_type="a",
    )
    assert s["verb"]["id"] == "http://adlnet.gov/expapi/verbs/interacted"


def test_known_event_types_have_canonical_verbs():
    for event_type, verb in _VERB_TABLE.items():
        s = build_statement(
            event={"timestamp": 1, "event_type": event_type, "target": "x"},
            session_id="s",
            student_id="u",
            activity_type="a",
        )
        assert s["verb"]["id"] == verb["id"], event_type


def test_metadata_statement_id_round_trip():
    fixed = "00000000-0000-0000-0000-000000000abc"
    s = build_statement(
        event={
            "timestamp": 1,
            "event_type": "click",
            "target": "x",
            "metadata": {"statement_id": fixed},
        },
        session_id="s",
        student_id="u",
        activity_type="a",
    )
    assert s["id"] == fixed


def test_build_statements_shares_one_registration_per_batch():
    events = [
        {"timestamp": 1, "event_type": "click", "target": "a"},
        {"timestamp": 2, "event_type": "hover", "target": "b", "duration": 300},
        {"timestamp": 3, "event_type": "submit", "target": "submit_btn"},
    ]
    out = build_statements(
        events=events,
        session_id="s",
        student_id="u",
        activity_type="a",
    )
    assert len(out) == 3
    regs = {s["context"]["registration"] for s in out}
    assert len(regs) == 1, "all statements in a batch share one registration UUID"
    # IDs are unique.
    ids = {s["id"] for s in out}
    assert len(ids) == 3


def test_build_statements_empty_input():
    assert build_statements(
        events=[], session_id="s", student_id="u", activity_type="a"
    ) == []


def test_object_id_namespacing_is_deterministic():
    s1 = build_statement(
        event={"timestamp": 1, "event_type": "click", "target": "shape_circle"},
        session_id="s",
        student_id="u",
        activity_type="shapes",
    )
    s2 = build_statement(
        event={"timestamp": 2, "event_type": "click", "target": "shape_circle"},
        session_id="s",
        student_id="u",
        activity_type="shapes",
    )
    # Two statements for the same target → same object IRI.
    assert s1["object"]["id"] == s2["object"]["id"]
    assert s1["object"]["id"].endswith("/shapes/shape_circle")
