"""Tests for dashboard_queries.py — pure logic only.

The Supabase-touching paths short-circuit to `[]` / `{}` when no client is
configured, so we exercise them with the env unset. The interesting logic
to test is the in-Python aggregation/derivation (`_derive_status`,
`_alert_message`, `get_misconception_summary`, `_parse_iso`).
"""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import patch

import pytest

from syncsenta_agents.api import dashboard_queries as dq


# ---------------------------------------------------------------------------
# _derive_status
# ---------------------------------------------------------------------------

def test_derive_status_empty_profile_is_idle():
    assert dq._derive_status({}) == "idle"


def test_derive_status_high_urgency_intervention_is_struggling():
    assert dq._derive_status({
        "intervention_needed": True,
        "intervention_urgency": "high",
    }) == "struggling"


def test_derive_status_critical_urgency_intervention_is_struggling():
    assert dq._derive_status({
        "intervention_needed": True,
        "intervention_urgency": "critical",
    }) == "struggling"


def test_derive_status_low_urgency_intervention_is_active_not_struggling():
    # Intervention flagged but not urgent — still "active", just observed.
    assert dq._derive_status({
        "intervention_needed": True,
        "intervention_urgency": "low",
    }) == "active"


def test_derive_status_low_mastery_no_intervention_is_struggling():
    assert dq._derive_status({"mastery_indicator": 0.15}) == "struggling"


def test_derive_status_high_mastery_is_active():
    assert dq._derive_status({"mastery_indicator": 0.85}) == "active"


# ---------------------------------------------------------------------------
# _alert_message
# ---------------------------------------------------------------------------

def test_alert_message_includes_pattern_mastery_urgency():
    msg = dq._alert_message({
        "primary_pattern": "stuck",
        "mastery_indicator": 0.23,
        "intervention_urgency": "high",
    })
    assert "stuck" in msg
    assert "0.23" in msg
    assert "high" in msg


def test_alert_message_handles_missing_mastery():
    msg = dq._alert_message({"primary_pattern": "exploratory", "intervention_urgency": "medium"})
    assert "exploratory" in msg
    assert "medium" in msg


def test_alert_message_falls_back_when_pattern_missing():
    msg = dq._alert_message({})
    # Should not raise and should produce something readable.
    assert isinstance(msg, str) and msg


# ---------------------------------------------------------------------------
# _parse_iso
# ---------------------------------------------------------------------------

def test_parse_iso_handles_z_suffix():
    parsed = dq._parse_iso("2026-05-23T20:04:56Z")
    assert parsed is not None
    assert parsed.tzinfo is not None


def test_parse_iso_handles_offset():
    parsed = dq._parse_iso("2026-05-23T20:04:56+00:00")
    assert parsed is not None


def test_parse_iso_passes_through_datetime():
    now = datetime.now(timezone.utc)
    assert dq._parse_iso(now) is now


def test_parse_iso_returns_none_for_garbage():
    assert dq._parse_iso("not a date") is None
    assert dq._parse_iso(None) is None
    assert dq._parse_iso("") is None


# ---------------------------------------------------------------------------
# get_misconception_summary aggregation
# ---------------------------------------------------------------------------

def _mk_misc(mtype: str, severity: str = "medium", confidence: float = 0.7,
             competency: str = "MATH.G4.FRACTIONS", description: str = "",
             created_at: str = "2026-05-23T12:00:00Z"):
    return {
        "misconception_type": mtype,
        "severity": severity,
        "confidence": confidence,
        "competency": competency,
        "description": description,
        "created_at": created_at,
    }


def test_misconception_summary_empty_when_no_rows():
    with patch.object(dq, "get_student_misconceptions", return_value=[]):
        assert dq.get_misconception_summary("alice") == []


def test_misconception_summary_groups_by_type():
    rows = [
        _mk_misc("confuses_num_denom", severity="medium", confidence=0.8,
                 description="latest", created_at="2026-05-23T15:00:00Z"),
        _mk_misc("confuses_num_denom", severity="high", confidence=0.6,
                 created_at="2026-05-23T10:00:00Z"),
        _mk_misc("conceptual_gap", severity="low", confidence=0.5,
                 created_at="2026-05-23T11:00:00Z"),
    ]
    with patch.object(dq, "get_student_misconceptions", return_value=rows):
        out = dq.get_misconception_summary("alice")

    by_type = {r["misconception_type"]: r for r in out}
    assert by_type["confuses_num_denom"]["count"] == 2
    assert by_type["confuses_num_denom"]["max_severity"] == "high"  # max wins
    # Rows arrive newest-first (caller pre-sorts), so latest = first seen.
    assert by_type["confuses_num_denom"]["latest_description"] == "latest"
    assert by_type["confuses_num_denom"]["latest_confidence"] == 0.8
    assert by_type["conceptual_gap"]["count"] == 1


def test_misconception_summary_sorted_by_count_then_severity():
    rows = [
        _mk_misc("a", severity="low"),
        _mk_misc("b", severity="critical"),
        _mk_misc("a", severity="low"),
        _mk_misc("a", severity="low"),
    ]
    with patch.object(dq, "get_student_misconceptions", return_value=rows):
        out = dq.get_misconception_summary("alice")
    # 'a' has higher count, comes first.
    assert out[0]["misconception_type"] == "a"
    assert out[0]["count"] == 3
    assert out[1]["misconception_type"] == "b"


def test_misconception_summary_dedups_competencies():
    rows = [
        _mk_misc("x", competency="MATH.G2.COUNTING"),
        _mk_misc("x", competency="MATH.G2.COUNTING"),
        _mk_misc("x", competency="MATH.G3.FRACTIONS"),
    ]
    with patch.object(dq, "get_student_misconceptions", return_value=rows):
        out = dq.get_misconception_summary("alice")
    assert sorted(out[0]["competencies"]) == ["MATH.G2.COUNTING", "MATH.G3.FRACTIONS"]


# ---------------------------------------------------------------------------
# DB-touching paths short-circuit when Supabase isn't configured
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("fn,args", [
    (dq.get_active_students, ()),
    (dq.get_student_progress, ("alice",)),
    (dq.get_student_misconceptions, ("alice",)),
    (dq.get_student_interventions, ("alice",)),
    (dq.get_student_timeline, ("alice",)),
    (dq.get_competency_summary, ()),
    (dq.get_alerts, ()),
])
def test_no_supabase_returns_empty(fn, args):
    with patch.object(dq, "try_get_supabase_client", return_value=None):
        result = fn(*args)
    assert result == [] or result == {}


def test_competency_trends_no_supabase_returns_empty_shape():
    with patch.object(dq, "try_get_supabase_client", return_value=None):
        result = dq.get_competency_trends("MATH.G4.FRACTIONS")
    assert result["competency"] == "MATH.G4.FRACTIONS"
    assert result["misconceptions"] == []
    assert result["severity_distribution"] == {}
    assert result["mastery_buckets"] == {}
