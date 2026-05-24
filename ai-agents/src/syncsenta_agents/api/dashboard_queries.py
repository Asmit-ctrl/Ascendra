"""Supabase queries for the teacher dashboard.

Reads from the Phase 1 telemetry tables (student_sessions, telemetry_events,
behavioral_profiles, misconceptions, interventions, xapi_statements). All
queries return plain dicts/lists; route handlers in `dashboard.py` shape them
into Pydantic models.

Every function is best-effort — if Supabase isn't configured or a query fails,
the function returns an empty result rather than raising. Callers should
degrade gracefully (e.g. show "no recent activity").
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from ..core.logging import get_logger
from ..db.supabase_client import try_get_supabase_client

logger = get_logger("dashboard_queries")

# How recently a session must have ended (or had its profile written) to count
# as "active". The student_sessions row is upserted at the end of a batch, so
# this is effectively "session finished within the last N minutes".
ACTIVE_WINDOW_MINUTES = 30
# How long an unresolved high-urgency profile counts as a live alert.
ALERT_WINDOW_MINUTES = 60


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _iso_minutes_ago(minutes: int) -> str:
    return (_now_utc() - timedelta(minutes=minutes)).isoformat()


def get_active_students(limit: int = 50) -> List[Dict[str, Any]]:
    """Sessions that have ended within ACTIVE_WINDOW_MINUTES, with profile.

    Returns one row per *student* (most recent session wins) so the dashboard
    can render a single card per student rather than one per session.
    """
    supabase = try_get_supabase_client()
    if supabase is None:
        return []

    cutoff = _iso_minutes_ago(ACTIVE_WINDOW_MINUTES)

    try:
        sessions_resp = (
            supabase.table("student_sessions")
            .select("session_id, student_id, activity_type, competency, grade, subject, started_at, ended_at, created_at")
            .gte("created_at", cutoff)
            .order("created_at", desc=True)
            .limit(limit * 4)  # over-fetch so we can de-dup by student
            .execute()
        )
        sessions = sessions_resp.data or []
    except Exception as e:
        logger.warning(f"active_students: student_sessions query failed: {e}")
        return []

    if not sessions:
        return []

    # Pull behavioral profiles for these sessions (one query, then map by id).
    session_ids = list({s["session_id"] for s in sessions})
    profiles_by_session: Dict[str, Dict[str, Any]] = {}
    try:
        profiles_resp = (
            supabase.table("behavioral_profiles")
            .select("session_id, primary_pattern, engagement_score, mastery_indicator, intervention_needed, intervention_urgency")
            .in_("session_id", session_ids)
            .execute()
        )
        for p in profiles_resp.data or []:
            profiles_by_session[p["session_id"]] = p
    except Exception as e:
        logger.warning(f"active_students: behavioral_profiles query failed: {e}")

    # Keep only the most recent session per student.
    seen_students: set[str] = set()
    rows: List[Dict[str, Any]] = []
    now = _now_utc()
    for s in sessions:
        sid = s["student_id"]
        if sid in seen_students:
            continue
        seen_students.add(sid)

        profile = profiles_by_session.get(s["session_id"]) or {}
        status = _derive_status(profile)

        ended_at = _parse_iso(s.get("ended_at") or s.get("created_at"))
        duration_min = 0
        if s.get("started_at") and s.get("ended_at"):
            started = _parse_iso(s["started_at"])
            if started and ended_at:
                duration_min = max(0, int((ended_at - started).total_seconds() // 60))

        rows.append(
            {
                "student_id": sid,
                "student_name": sid,  # we don't have a learners table yet (Tier 3)
                "status": status,
                "current_subject": s.get("subject"),
                "current_topic": s.get("activity_type"),
                "current_agent": "telemetry",
                "duration_minutes": duration_min,
                "last_activity": (ended_at or now).isoformat(),
                "mastery_indicator": profile.get("mastery_indicator"),
                "engagement_score": profile.get("engagement_score"),
                "primary_pattern": profile.get("primary_pattern"),
            }
        )
        if len(rows) >= limit:
            break

    return rows


def _derive_status(profile: Dict[str, Any]) -> str:
    """Map a behavioral profile to a coarse status the frontend can colour-code."""
    if not profile:
        return "idle"
    if profile.get("intervention_needed"):
        urgency = (profile.get("intervention_urgency") or "").lower()
        if urgency in {"high", "critical"}:
            return "struggling"
        return "active"
    mastery = profile.get("mastery_indicator")
    if mastery is not None and mastery < 0.3:
        return "struggling"
    return "active"


def get_student_progress(student_id: str, limit: int = 25) -> List[Dict[str, Any]]:
    """One row per recent (session × competency) for this student."""
    supabase = try_get_supabase_client()
    if supabase is None:
        return []

    try:
        sessions_resp = (
            supabase.table("student_sessions")
            .select("session_id, subject, activity_type, competency, started_at, ended_at, created_at")
            .eq("student_id", student_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        sessions = sessions_resp.data or []
    except Exception as e:
        logger.warning(f"student_progress: sessions query failed: {e}")
        return []

    if not sessions:
        return []

    session_ids = [s["session_id"] for s in sessions]
    profiles_by_session: Dict[str, Dict[str, Any]] = {}
    try:
        profiles_resp = (
            supabase.table("behavioral_profiles")
            .select("session_id, mastery_indicator, engagement_score, primary_pattern, intervention_urgency")
            .in_("session_id", session_ids)
            .execute()
        )
        for p in profiles_resp.data or []:
            profiles_by_session[p["session_id"]] = p
    except Exception as e:
        logger.warning(f"student_progress: profiles query failed: {e}")

    rows: List[Dict[str, Any]] = []
    for s in sessions:
        profile = profiles_by_session.get(s["session_id"]) or {}
        started = _parse_iso(s.get("started_at"))
        ended = _parse_iso(s.get("ended_at") or s.get("created_at"))
        time_spent = 0
        if started and ended:
            time_spent = max(0, int((ended - started).total_seconds() // 60))
        rows.append(
            {
                "student_id": student_id,
                "subject": s.get("subject") or "",
                "topic": s.get("activity_type") or "",
                "competency": s.get("competency"),
                "mastery_level": profile.get("mastery_indicator") or 0.0,
                "engagement_score": profile.get("engagement_score"),
                "primary_pattern": profile.get("primary_pattern"),
                "time_spent_minutes": time_spent,
                "session_id": s["session_id"],
                "last_activity": (ended or _now_utc()).isoformat(),
            }
        )

    return rows


def get_student_misconceptions(student_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Recent misconceptions for one student, newest first.

    Includes all rows (does not group by type) so the frontend can show the
    full timeline — the per-type grouping happens in `get_misconception_summary`.
    """
    supabase = try_get_supabase_client()
    if supabase is None:
        return []

    try:
        resp = (
            supabase.table("misconceptions")
            .select("misconception_id, session_id, competency, misconception_type, description, confidence, severity, payload, created_at")
            .eq("student_id", student_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return resp.data or []
    except Exception as e:
        logger.warning(f"student_misconceptions query failed: {e}")
        return []


def get_misconception_summary(student_id: str) -> List[Dict[str, Any]]:
    """Misconceptions grouped by type for one student.

    Aggregates count + max severity + most recent confidence per type, so the
    dashboard can show "this kid has hit 'confuses_numerator_denominator' 4
    times" without rendering all 4 rows.
    """
    rows = get_student_misconceptions(student_id, limit=200)
    if not rows:
        return []

    severity_order = {"low": 0, "medium": 1, "high": 2, "critical": 3}
    by_type: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        mtype = r.get("misconception_type") or "unknown"
        bucket = by_type.setdefault(
            mtype,
            {
                "misconception_type": mtype,
                "count": 0,
                "competencies": set(),
                "max_severity": "low",
                "latest_confidence": 0.0,
                "latest_description": "",
                "latest_seen": None,
            },
        )
        bucket["count"] += 1
        if r.get("competency"):
            bucket["competencies"].add(r["competency"])
        # Highest severity wins.
        if severity_order.get(r.get("severity") or "low", 0) > severity_order.get(bucket["max_severity"], 0):
            bucket["max_severity"] = r["severity"]
        # Most recent is the first row we see (already sorted DESC).
        if bucket["latest_seen"] is None:
            bucket["latest_seen"] = r.get("created_at")
            bucket["latest_confidence"] = r.get("confidence") or 0.0
            bucket["latest_description"] = r.get("description") or ""

    return [
        {**b, "competencies": sorted(b["competencies"])}
        for b in sorted(by_type.values(), key=lambda b: (-b["count"], -severity_order.get(b["max_severity"], 0)))
    ]


def get_student_interventions(student_id: str, limit: int = 25) -> List[Dict[str, Any]]:
    """Most recent interventions generated for one student."""
    supabase = try_get_supabase_client()
    if supabase is None:
        return []

    try:
        resp = (
            supabase.table("interventions")
            .select("intervention_id, plan_id, session_id, intervention_type, difficulty_level, title, objective, duration_minutes, priority, payload, created_at")
            .eq("student_id", student_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return resp.data or []
    except Exception as e:
        logger.warning(f"student_interventions query failed: {e}")
        return []


def get_student_timeline(student_id: str, limit: int = 30) -> List[Dict[str, Any]]:
    """Unified session-level view for one student.

    One row per session, with embedded misconception/intervention counts.
    Powers the per-learner detail page.
    """
    supabase = try_get_supabase_client()
    if supabase is None:
        return []

    sessions = get_student_progress(student_id, limit=limit)
    if not sessions:
        return []

    session_ids = [s["session_id"] for s in sessions]

    counts_misc: Counter[str] = Counter()
    counts_intv: Counter[str] = Counter()
    try:
        misc_resp = (
            supabase.table("misconceptions")
            .select("session_id")
            .in_("session_id", session_ids)
            .execute()
        )
        for row in misc_resp.data or []:
            counts_misc[row["session_id"]] += 1
    except Exception as e:
        logger.warning(f"timeline: misconceptions count query failed: {e}")

    try:
        intv_resp = (
            supabase.table("interventions")
            .select("session_id")
            .in_("session_id", session_ids)
            .execute()
        )
        for row in intv_resp.data or []:
            counts_intv[row["session_id"]] += 1
    except Exception as e:
        logger.warning(f"timeline: interventions count query failed: {e}")

    for s in sessions:
        s["misconception_count"] = counts_misc.get(s["session_id"], 0)
        s["intervention_count"] = counts_intv.get(s["session_id"], 0)

    return sessions


def get_competency_summary(limit: int = 50) -> List[Dict[str, Any]]:
    """List every competency the system has seen, with cohort-level counts."""
    supabase = try_get_supabase_client()
    if supabase is None:
        return []

    try:
        sessions_resp = (
            supabase.table("student_sessions")
            .select("competency, student_id")
            .not_.is_("competency", "null")
            .limit(2000)
            .execute()
        )
        sessions = sessions_resp.data or []
    except Exception as e:
        logger.warning(f"competency_summary: sessions query failed: {e}")
        return []

    if not sessions:
        return []

    by_comp: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"learners": set(), "sessions": 0})
    for s in sessions:
        c = s["competency"]
        by_comp[c]["sessions"] += 1
        by_comp[c]["learners"].add(s["student_id"])

    competencies = list(by_comp.keys())

    misc_counts: Counter[str] = Counter()
    try:
        misc_resp = (
            supabase.table("misconceptions")
            .select("competency")
            .in_("competency", competencies)
            .execute()
        )
        for row in misc_resp.data or []:
            misc_counts[row["competency"]] += 1
    except Exception as e:
        logger.warning(f"competency_summary: misconceptions count failed: {e}")

    rows = [
        {
            "competency": c,
            "session_count": d["sessions"],
            "learner_count": len(d["learners"]),
            "misconception_count": misc_counts.get(c, 0),
        }
        for c, d in by_comp.items()
    ]
    rows.sort(key=lambda r: (-r["misconception_count"], -r["session_count"]))
    return rows[:limit]


def get_competency_trends(competency: str) -> Dict[str, Any]:
    """Cohort-level trends for one competency: which misconceptions fire most,
    severity mix, average mastery indicator."""
    supabase = try_get_supabase_client()
    if supabase is None:
        return {"competency": competency, "misconceptions": [], "severity_distribution": {}, "mastery_buckets": {}}

    try:
        misc_resp = (
            supabase.table("misconceptions")
            .select("misconception_type, severity, confidence, student_id, created_at")
            .eq("competency", competency)
            .order("created_at", desc=True)
            .limit(500)
            .execute()
        )
        misc_rows = misc_resp.data or []
    except Exception as e:
        logger.warning(f"competency_trends: misconceptions query failed: {e}")
        misc_rows = []

    by_type: Dict[str, Dict[str, Any]] = {}
    severity_dist: Counter[str] = Counter()
    for m in misc_rows:
        mtype = m.get("misconception_type") or "unknown"
        bucket = by_type.setdefault(
            mtype,
            {"misconception_type": mtype, "count": 0, "learners": set(), "avg_confidence": 0.0, "_conf_sum": 0.0},
        )
        bucket["count"] += 1
        bucket["learners"].add(m.get("student_id"))
        bucket["_conf_sum"] += m.get("confidence") or 0.0
        severity_dist[(m.get("severity") or "low")] += 1

    misconception_rows = []
    for b in by_type.values():
        misconception_rows.append(
            {
                "misconception_type": b["misconception_type"],
                "count": b["count"],
                "learner_count": len(b["learners"]),
                "avg_confidence": (b["_conf_sum"] / b["count"]) if b["count"] else 0.0,
            }
        )
    misconception_rows.sort(key=lambda r: -r["count"])

    # Mastery indicator buckets across all sessions for this competency.
    mastery_buckets: Dict[str, int] = {"low_0_30": 0, "mid_30_70": 0, "high_70_100": 0}
    avg_mastery = 0.0
    try:
        sess_resp = (
            supabase.table("student_sessions")
            .select("session_id")
            .eq("competency", competency)
            .limit(500)
            .execute()
        )
        session_ids = [s["session_id"] for s in (sess_resp.data or [])]
        if session_ids:
            prof_resp = (
                supabase.table("behavioral_profiles")
                .select("mastery_indicator")
                .in_("session_id", session_ids)
                .execute()
            )
            masteries = [p.get("mastery_indicator") for p in (prof_resp.data or []) if p.get("mastery_indicator") is not None]
            if masteries:
                avg_mastery = sum(masteries) / len(masteries)
                for m in masteries:
                    if m < 0.3:
                        mastery_buckets["low_0_30"] += 1
                    elif m < 0.7:
                        mastery_buckets["mid_30_70"] += 1
                    else:
                        mastery_buckets["high_70_100"] += 1
    except Exception as e:
        logger.warning(f"competency_trends: mastery aggregation failed: {e}")

    return {
        "competency": competency,
        "misconceptions": misconception_rows,
        "severity_distribution": dict(severity_dist),
        "mastery_buckets": mastery_buckets,
        "avg_mastery_indicator": avg_mastery,
        "total_misconceptions": len(misc_rows),
    }


def get_alerts(acknowledged: bool = False, limit: int = 50) -> List[Dict[str, Any]]:
    """Live alerts derived from recent behavioral_profiles where intervention is needed.

    We don't have a separate `alerts` table yet (would gate on Tier 3 roster).
    Instead we synthesize alerts from profiles flagged as needing intervention
    within the last ALERT_WINDOW_MINUTES. `acknowledged` is currently a no-op
    placeholder — kept in the signature for forward compatibility.
    """
    if acknowledged:
        return []  # we can't yet distinguish acked from open

    supabase = try_get_supabase_client()
    if supabase is None:
        return []

    cutoff = _iso_minutes_ago(ALERT_WINDOW_MINUTES)
    try:
        resp = (
            supabase.table("behavioral_profiles")
            .select("session_id, student_id, primary_pattern, intervention_urgency, mastery_indicator, created_at")
            .eq("intervention_needed", True)
            .gte("created_at", cutoff)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        rows = resp.data or []
    except Exception as e:
        logger.warning(f"alerts query failed: {e}")
        return []

    severity_map = {"critical": "high", "high": "high", "medium": "medium", "low": "low"}
    alerts: List[Dict[str, Any]] = []
    for i, r in enumerate(rows):
        urgency = (r.get("intervention_urgency") or "medium").lower()
        alerts.append(
            {
                "id": i + 1,
                "alert_type": r.get("primary_pattern") or "intervention_needed",
                "severity": severity_map.get(urgency, "medium"),
                "student_id": r["student_id"],
                "student_name": r["student_id"],
                "session_id": r["session_id"],
                "message": _alert_message(r),
                "created_at": r.get("created_at"),
                "acknowledged": False,
            }
        )
    return alerts


def _alert_message(profile_row: Dict[str, Any]) -> str:
    pattern = profile_row.get("primary_pattern") or "unknown pattern"
    mastery = profile_row.get("mastery_indicator")
    urgency = profile_row.get("intervention_urgency") or "medium"
    if mastery is not None:
        return f"{pattern} pattern, mastery {mastery:.2f} ({urgency} urgency)"
    return f"{pattern} pattern needs review ({urgency} urgency)"


def _parse_iso(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        # Supabase returns ISO 8601 with offset (+00:00) or with `Z`.
        s = value.replace("Z", "+00:00") if isinstance(value, str) else value
        return datetime.fromisoformat(s)
    except (ValueError, TypeError):
        return None
