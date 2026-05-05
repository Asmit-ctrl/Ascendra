"""Telemetry API - Endpoints for behavioral telemetry capture and analysis."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

from ..agents.telemetry import TelemetryAgent
from ..agents.analysis import AnalysisAgent
from ..agents.intervention import InterventionAgent
from ..core.logging import get_logger

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


@router.post("/capture", response_model=Dict[str, Any])
async def capture_telemetry(request: TelemetryBatchRequest):
    """
    Capture and analyze behavioral telemetry.
    
    This endpoint:
    1. Processes raw telemetry events
    2. Generates behavioral profile
    3. Identifies misconceptions
    4. Generates intervention plan
    
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
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(
            f"Telemetry analysis complete for {request.student_id}",
            misconception_count=len(misconceptions),
            intervention_count=len(intervention_plan.interventions),
            priority=intervention_plan.priority
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
