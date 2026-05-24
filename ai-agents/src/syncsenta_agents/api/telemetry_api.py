"""Telemetry API - Endpoints for behavioral telemetry capture and analysis.

Phase 1 of the MeTTa roadmap (see ``.kiro/METTA_KEY_INSIGHTS.md``)
requires that every captured student action is (a) analysed into a
behavioural profile + misconceptions + interventions, (b) emitted as a
valid xAPI 1.0.3 statement, and (c) persisted in Supabase so the
downstream dashboard / Analysis Agent has data to read.

This module wires all three together as best-effort side-effects of
``POST /telemetry/capture``. Persistence failures are logged but never
raised — the student must not be blocked by a backend hiccup.
"""

import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

from ..agents.telemetry import TelemetryAgent
from ..agents.analysis import AnalysisAgent
from ..agents.intervention import InterventionAgent
from ..agents.xapi import build_statements
from ..core.logging import get_logger

# Supabase client is best-effort — the module loads in any environment,
# even one without supabase-py installed, so tests pass without the dep.
try:
    from ..db.supabase_client import try_get_supabase_client
except Exception:  # pragma: no cover - defensive
    def try_get_supabase_client():  # type: ignore[no-redef]
        return None

logger = get_logger("telemetry_api")

router = APIRouter(prefix="/telemetry", tags=["telemetry"])

# Initialize agents
telemetry_agent = TelemetryAgent()
analysis_agent = AnalysisAgent()
intervention_agent = InterventionAgent()


class TelemetryEventRequest(BaseModel):
    """Request model for telemetry events."""
    timestamp: float = Field(..., description="Unix timestamp in milliseconds")
    event_type: str = Field(..., description="Event type (click, hover, drag, etc.)")
    target: str = Field(..., description="Target element")
    position: Optional[List[float]] = Field(None, description="[x, y] coordinates")
    duration: Optional[float] = Field(None, description="Duration in milliseconds")
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TelemetryBatchRequest(BaseModel):
    """Request model for batch telemetry processing."""
    session_id: str
    student_id: str
    activity_type: str
    competency: str
    grade: str
    subject: str
    events: List[TelemetryEventRequest]
    activity_data: Optional[Dict[str, Any]] = None


class BehavioralProfileResponse(BaseModel):
    """Response model for behavioral profile."""
    session_id: str
    student_id: str
    activity_type: str
    duration_seconds: float
    primary_pattern: str
    secondary_patterns: List[str]
    engagement_score: float
    mastery_indicator: float
    intervention_needed: bool
    intervention_urgency: str
    pathing: Dict[str, Any]
    dwell: Dict[str, Any]
    erasure: Dict[str, Any]
    velocity: Dict[str, Any]
    tool_usage: Dict[str, Any]


class MisconceptionResponse(BaseModel):
    """Response model for misconception."""
    misconception_id: str
    student_id: str
    competency: str
    misconception_type: str
    description: str
    confidence: float
    severity: str
    suggested_intervention: str
    evidence: List[Dict[str, Any]]


class InterventionResponse(BaseModel):
    """Response model for intervention."""
    intervention_id: str
    student_id: str
    intervention_type: str
    difficulty_level: str
    title: str
    objective: str
    duration_minutes: int
    materials_needed: List[str]
    content: str
    visual_aids: List[str]
    activities: List[Dict[str, str]]
    assessment: str
    cbc_alignment: str
    differentiation_notes: str
    teacher_notes: str


class InterventionPlanResponse(BaseModel):
    """Response model for intervention plan."""
    plan_id: str
    student_id: str
    interventions: List[InterventionResponse]
    sequence: List[str]
    estimated_total_time: int
    priority: str
    teacher_summary: str


def _persist_telemetry_batch(
    *,
    request: "TelemetryBatchRequest",
    events_dict: List[Dict[str, Any]],
    behavioral_profile: Any,
    misconceptions: List[Any],
    intervention_plan: Any,
    xapi_statements: List[Dict[str, Any]],
) -> None:
    """Best-effort write of one telemetry batch to Supabase.

    Each table write is wrapped in its own try/except so a single
    schema mismatch can't lose the rest of the batch. We deliberately
    swallow all exceptions and log — see module docstring.
    """
    supabase = try_get_supabase_client()
    if supabase is None:
        logger.debug("Supabase not configured — skipping telemetry persistence")
        return

    # 1. Session envelope.
    try:
        started_at = (
            datetime.utcfromtimestamp(events_dict[0]["timestamp"] / 1000.0).isoformat()
            if events_dict
            else None
        )
        ended_at = (
            datetime.utcfromtimestamp(events_dict[-1]["timestamp"] / 1000.0).isoformat()
            if events_dict
            else None
        )
        supabase.table("student_sessions").upsert(
            {
                "session_id": request.session_id,
                "student_id": request.student_id,
                "activity_type": request.activity_type,
                "competency": request.competency,
                "grade": request.grade,
                "subject": request.subject,
                "activity_data": request.activity_data or {},
                "event_count": len(events_dict),
                "started_at": started_at,
                "ended_at": ended_at,
            },
            on_conflict="session_id",
        ).execute()
    except Exception as e:  # pragma: no cover - persistence is best-effort
        logger.warning(f"student_sessions upsert failed: {e}")

    # 2. Raw events — one row each.
    try:
        rows = [
            {
                "session_id": request.session_id,
                "student_id": request.student_id,
                "event_index": idx,
                "event_type": ev.get("event_type"),
                "target": ev.get("target"),
                "event_ts": int(ev.get("timestamp") or 0),
                "payload": ev,
            }
            for idx, ev in enumerate(events_dict)
        ]
        if rows:
            supabase.table("telemetry_events").insert(rows).execute()
    except Exception as e:  # pragma: no cover
        logger.warning(f"telemetry_events insert failed: {e}")

    # 3. Behavioural profile.
    try:
        profile_dict = behavioral_profile.to_dict()
        supabase.table("behavioral_profiles").upsert(
            {
                "session_id": request.session_id,
                "student_id": request.student_id,
                "activity_type": request.activity_type,
                "primary_pattern": profile_dict.get("primary_pattern"),
                "engagement_score": profile_dict.get("engagement_score"),
                "mastery_indicator": profile_dict.get("mastery_indicator"),
                "intervention_needed": profile_dict.get("intervention_needed", False),
                "intervention_urgency": profile_dict.get("intervention_urgency"),
                "payload": profile_dict,
            },
            on_conflict="session_id",
        ).execute()
    except Exception as e:  # pragma: no cover
        logger.warning(f"behavioral_profiles upsert failed: {e}")

    # 4. Misconceptions.
    try:
        rows = []
        for m in misconceptions:
            d = m.to_dict()
            rows.append(
                {
                    "misconception_id": d.get("misconception_id") or str(uuid.uuid4()),
                    "session_id": request.session_id,
                    "student_id": request.student_id,
                    "competency": d.get("competency") or request.competency,
                    "misconception_type": d.get("misconception_type"),
                    "description": d.get("description"),
                    "confidence": d.get("confidence"),
                    "severity": d.get("severity"),
                    "payload": d,
                }
            )
        if rows:
            supabase.table("misconceptions").insert(rows).execute()
    except Exception as e:  # pragma: no cover
        logger.warning(f"misconceptions insert failed: {e}")

    # 5. Interventions — flattened per intervention so the dashboard can
    # query "most recent N for student X" cheaply.
    try:
        rows = []
        for itv in intervention_plan.interventions:
            d = itv.to_dict()
            rows.append(
                {
                    "intervention_id": d.get("intervention_id") or str(uuid.uuid4()),
                    "plan_id": intervention_plan.plan_id,
                    "session_id": request.session_id,
                    "student_id": request.student_id,
                    "intervention_type": d.get("intervention_type"),
                    "difficulty_level": d.get("difficulty_level"),
                    "title": d.get("title"),
                    "objective": d.get("objective"),
                    "duration_minutes": d.get("duration_minutes"),
                    "priority": intervention_plan.priority,
                    "payload": d,
                }
            )
        if rows:
            supabase.table("interventions").insert(rows).execute()
    except Exception as e:  # pragma: no cover
        logger.warning(f"interventions insert failed: {e}")

    # 6. xAPI statements.
    try:
        rows = [
            {
                "statement_id": s["id"],
                "session_id": request.session_id,
                "student_id": request.student_id,
                "verb_id": s["verb"]["id"],
                "object_id": s["object"]["id"],
                "statement": s,
            }
            for s in xapi_statements
        ]
        if rows:
            supabase.table("xapi_statements").insert(rows).execute()
    except Exception as e:  # pragma: no cover
        logger.warning(f"xapi_statements insert failed: {e}")


@router.post("/capture", response_model=Dict[str, Any])
async def capture_telemetry(request: TelemetryBatchRequest):
    """
    Capture and analyze behavioral telemetry.

    This endpoint:
    1. Processes raw telemetry events
    2. Generates behavioral profile
    3. Identifies misconceptions
    4. Generates intervention plan
    5. Emits one xAPI statement per event
    6. Persists everything to Supabase (best-effort)

    Returns complete analysis and recommendations.
    """
    try:
        logger.info(
            f"Processing telemetry batch for {request.student_id}",
            session_id=request.session_id,
            event_count=len(request.events)
        )

        # Convert events to dict format
        events_dict = [event.model_dump() for event in request.events]

        # Step 1: Analyze behavioral patterns
        behavioral_profile = await telemetry_agent.process_events(
            events=events_dict,
            session_id=request.session_id,
            student_id=request.student_id,
            activity_type=request.activity_type
        )

        # Step 2: Identify misconceptions
        misconceptions = await analysis_agent.analyze_misconceptions(
            behavioral_profile=behavioral_profile,
            competency=request.competency,
            activity_data=request.activity_data
        )

        # Step 3: Generate intervention plan
        intervention_plan = await intervention_agent.generate_intervention_plan(
            misconceptions=misconceptions,
            behavioral_profile=behavioral_profile,
            grade=request.grade,
            subject=request.subject
        )

        # Step 4: One xAPI statement per raw event so the LRS reflects
        # every action, not just the aggregate profile.
        xapi_statements = build_statements(
            events=events_dict,
            session_id=request.session_id,
            student_id=request.student_id,
            activity_type=request.activity_type,
            competency=request.competency,
            grade=request.grade,
            subject=request.subject,
        )

        # Step 5: Persist everything best-effort. Never let DB problems
        # block the response — the student is waiting on this call.
        _persist_telemetry_batch(
            request=request,
            events_dict=events_dict,
            behavioral_profile=behavioral_profile,
            misconceptions=misconceptions,
            intervention_plan=intervention_plan,
            xapi_statements=xapi_statements,
        )

        # Build response
        response = {
            "success": True,
            "session_id": request.session_id,
            "student_id": request.student_id,
            "behavioral_profile": behavioral_profile.to_dict(),
            "misconceptions": [m.to_dict() for m in misconceptions],
            "intervention_plan": {
                "plan_id": intervention_plan.plan_id,
                "interventions": [i.to_dict() for i in intervention_plan.interventions],
                "sequence": intervention_plan.sequence,
                "estimated_total_time": intervention_plan.estimated_total_time,
                "priority": intervention_plan.priority,
                "teacher_summary": intervention_plan.teacher_summary
            },
            "xapi_statements": xapi_statements,
            "timestamp": datetime.now().isoformat()
        }

        logger.info(
            f"Telemetry analysis complete for {request.student_id}",
            misconception_count=len(misconceptions),
            intervention_count=len(intervention_plan.interventions),
            priority=intervention_plan.priority,
            xapi_count=len(xapi_statements),
        )

        return response

    except Exception as e:
        logger.error(f"Telemetry processing failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profile/{session_id}", response_model=BehavioralProfileResponse)
async def get_behavioral_profile(session_id: str):
    """Get behavioral profile for a session."""
    # TODO: Retrieve from database
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/misconceptions/{student_id}", response_model=List[MisconceptionResponse])
async def get_student_misconceptions(student_id: str, limit: int = 10):
    """Get recent misconceptions for a student."""
    # TODO: Retrieve from database
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/interventions/{student_id}", response_model=List[InterventionResponse])
async def get_student_interventions(student_id: str, limit: int = 10):
    """Get recent interventions for a student."""
    # TODO: Retrieve from database
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/test", response_model=Dict[str, Any])
async def test_telemetry_system():
    """
    Test endpoint with sample data.
    
    Useful for testing the telemetry system without frontend.
    """
    # Sample telemetry events
    sample_events = [
        {
            "timestamp": 1000.0,
            "event_type": "hover",
            "target": "fraction_1_2",
            "duration": 2500.0
        },
        {
            "timestamp": 3500.0,
            "event_type": "click",
            "target": "fraction_1_2",
            "position": [100, 200]
        },
        {
            "timestamp": 4000.0,
            "event_type": "drag",
            "target": "fraction_1_2",
            "position": [150, 250]
        },
        {
            "timestamp": 5000.0,
            "event_type": "drop",
            "target": "answer_box_1",
            "position": [200, 300]
        },
        {
            "timestamp": 6000.0,
            "event_type": "undo",
            "target": "answer_box_1"
        },
        {
            "timestamp": 7000.0,
            "event_type": "hover",
            "target": "fraction_1_4",
            "duration": 4000.0
        },
        {
            "timestamp": 11000.0,
            "event_type": "click",
            "target": "fraction_1_4",
            "position": [100, 300]
        },
        {
            "timestamp": 12000.0,
            "event_type": "drag",
            "target": "fraction_1_4",
            "position": [150, 350]
        },
        {
            "timestamp": 13000.0,
            "event_type": "drop",
            "target": "answer_box_1",
            "position": [200, 300]
        },
        {
            "timestamp": 14000.0,
            "event_type": "submit",
            "target": "submit_button"
        }
    ]
    
    request = TelemetryBatchRequest(
        session_id="test_session_001",
        student_id="test_student_001",
        activity_type="fraction_sandbox",
        competency="MATH.G4.FRACTIONS",
        grade="Grade 4",
        subject="Mathematics",
        events=[TelemetryEventRequest(**e) for e in sample_events],
        activity_data={
            "question": "Add 1/2 + 1/4",
            "correct_answer": "3/4",
            "student_answer": "1/4"
        }
    )
    
    return await capture_telemetry(request)
