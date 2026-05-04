"""Teacher Dashboard API endpoints."""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import asyncio

from .websocket import manager, handle_teacher_intervention
from ..core.logging import AgentLogger

router = APIRouter(prefix="/dashboard", tags=["teacher-dashboard"])
logger = AgentLogger("dashboard_api")


# Request/Response Models
class StudentActivitySummary(BaseModel):
    student_id: str
    student_name: str
    status: str  # 'active', 'idle', 'struggling', 'offline'
    current_subject: Optional[str] = None
    current_topic: Optional[str] = None
    current_agent: Optional[str] = None
    duration_minutes: int
    last_activity: datetime


class AgentUsageStats(BaseModel):
    agent_type: str
    request_count: int
    avg_response_time_ms: float
    success_rate: float
    total_tokens: int


class StudentProgressDetail(BaseModel):
    student_id: str
    subject: str
    topic: str
    mastery_level: float
    time_spent_minutes: int
    quiz_scores: List[float]
    last_activity: datetime


class TeacherIntervention(BaseModel):
    student_id: str
    intervention_type: str  # 'message', 'assignment', 'flag', 'redirect'
    content: str
    priority: str = 'normal'


# WebSocket endpoint for real-time updates
@router.websocket("/ws/teacher")
async def teacher_websocket(websocket: WebSocket):
    """WebSocket connection for teacher dashboard real-time updates."""
    await manager.connect(websocket, "teachers")
    
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_json()
            
            # Handle teacher actions
            if data.get("type") == "intervention":
                await handle_teacher_intervention(data.get("data", {}))
            
            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, "teachers")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, "teachers")


@router.websocket("/ws/student/{student_id}")
async def student_websocket(websocket: WebSocket, student_id: str):
    """WebSocket connection for student to receive teacher interventions."""
    await manager.connect(websocket, "students")
    
    try:
        while True:
            data = await websocket.receive_json()
            
            # Handle student heartbeat/activity
            if data.get("type") == "heartbeat":
                # Update student session status
                pass
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, "students")
    except Exception as e:
        logger.error(f"Student WebSocket error: {e}")
        manager.disconnect(websocket, "students")


@router.get("/students/active", response_model=List[StudentActivitySummary])
async def get_active_students():
    """Get list of currently active students."""
    # TODO: Query database for active sessions
    # For now, return mock data
    return [
        StudentActivitySummary(
            student_id="student_1",
            student_name="John Kamau",
            status="active",
            current_subject="Mathematics",
            current_topic="Fractions",
            current_agent="tutor",
            duration_minutes=15,
            last_activity=datetime.utcnow()
        ),
        StudentActivitySummary(
            student_id="student_2",
            student_name="Mary Wanjiku",
            status="struggling",
            current_subject="Science",
            current_topic="Plants",
            current_agent="assessment",
            duration_minutes=22,
            last_activity=datetime.utcnow() - timedelta(minutes=2)
        )
    ]


@router.get("/agents/stats", response_model=List[AgentUsageStats])
async def get_agent_stats(hours: int = 1):
    """Get AI agent usage statistics."""
    # TODO: Query database for agent interactions
    return [
        AgentUsageStats(
            agent_type="tutor",
            request_count=45,
            avg_response_time_ms=2300,
            success_rate=0.98,
            total_tokens=15000
        ),
        AgentUsageStats(
            agent_type="assessment",
            request_count=12,
            avg_response_time_ms=1800,
            success_rate=1.0,
            total_tokens=4500
        )
    ]


@router.get("/students/{student_id}/progress", response_model=List[StudentProgressDetail])
async def get_student_progress(student_id: str):
    """Get detailed progress for a specific student."""
    # TODO: Query database for student progress
    return [
        StudentProgressDetail(
            student_id=student_id,
            subject="Mathematics",
            topic="Fractions",
            mastery_level=0.75,
            time_spent_minutes=45,
            quiz_scores=[0.8, 0.85, 0.9],
            last_activity=datetime.utcnow()
        )
    ]


@router.post("/interventions")
async def create_intervention(intervention: TeacherIntervention):
    """Create a teacher intervention for a student."""
    try:
        # TODO: Save to database
        
        # Send to student via WebSocket
        await handle_teacher_intervention({
            "student_id": intervention.student_id,
            "intervention_type": intervention.intervention_type,
            "content": intervention.content,
            "teacher_name": "Teacher"  # TODO: Get from auth
        })
        
        return {"success": True, "message": "Intervention sent"}
    
    except Exception as e:
        logger.error(f"Failed to create intervention: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts")
async def get_alerts(acknowledged: bool = False):
    """Get dashboard alerts."""
    # TODO: Query database for alerts
    return [
        {
            "id": 1,
            "alert_type": "idle",
            "severity": "medium",
            "student_id": "student_3",
            "student_name": "Jane Akinyi",
            "message": "Student has been idle for 15 minutes",
            "created_at": datetime.utcnow() - timedelta(minutes=5),
            "acknowledged": False
        }
    ]


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: int):
    """Mark an alert as acknowledged."""
    # TODO: Update database
    return {"success": True}
