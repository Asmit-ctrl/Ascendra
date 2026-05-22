"""FastAPI HTTP wrapper exposing the Assessment Agent to the student frontend.

Run:
    PYTHONPATH=src venv/bin/uvicorn syncsenta_agents.api.server:app --port 8001 --reload

Endpoints:
    GET  /healthz
    POST /agents/assessment/quiz   -> Quiz JSON
    POST /agents/assessment/grade  -> GradedSubmission JSON
"""

from __future__ import annotations

import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ..agents.assessment import AssessmentAgent
from ..core.exceptions import AgentError
from ..core.logging import get_logger
from ..core.models import AgentRequest, Quiz, QuizSubmission
from ..db.supabase_client import try_get_supabase_client
from ..orchestrator.main import SyncSentaOrchestrator
from .dashboard import router as dashboard_router
from .websocket import handle_student_activity, handle_agent_interaction

logger = get_logger("api.server")


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class QuizRequest(BaseModel):
    grade: str = "g4"
    subject: str = "Mathematics"
    competency: str = "fractions"
    num_questions: int = Field(default=5, ge=1, le=20)
    language: str = "english"
    question_types: Optional[List[str]] = None


class GradeRequest(BaseModel):
    quiz: Dict[str, Any]
    submission: Dict[str, Any]


class ChatRequest(BaseModel):
    """Student message routed through the Teacher_Agent orchestrator."""
    message: str
    user_id: str = "anonymous"
    session_id: Optional[str] = None
    grade: Optional[str] = None
    subject: Optional[str] = None
    language: str = "english"
    role: str = "student"


# ---------------------------------------------------------------------------
# App + agent (singleton)
# ---------------------------------------------------------------------------

app = FastAPI(title="SyncSenta AI Agents API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://sentastudio.vercel.app",
        "https://sentastudio-git-main-dans-projects-5f474b51.vercel.app",
        os.getenv("FRONTEND_URL", "https://sentastudio.vercel.app"),
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include teacher dashboard routes
app.include_router(dashboard_router)

# Include telemetry routes
from .telemetry_api import router as telemetry_router
app.include_router(telemetry_router)

# Include lesson architect routes
from .lesson_architect_api import router as lesson_architect_router
app.include_router(lesson_architect_router)

# Include curriculum-validation routes
from .validation_api import router as validation_router
app.include_router(validation_router)

# Include training export routes
from .training_export_api import router as training_export_router
app.include_router(training_export_router)


def _build_agent() -> AssessmentAgent:
    """Build the agent. If SYNCSENTA_OFFLINE_DEMO=1, use a deterministic stub
    so the student site can be tested without a running Ollama server."""
    if os.environ.get("SYNCSENTA_OFFLINE_DEMO") == "1":
        from .demo_stub import DemoStubLLM

        return AssessmentAgent(llm_provider=DemoStubLLM())
    return AssessmentAgent()


_agent: Optional[AssessmentAgent] = None
_orchestrator: Optional[SyncSentaOrchestrator] = None


def get_agent() -> AssessmentAgent:
    global _agent
    if _agent is None:
        _agent = _build_agent()
    return _agent


async def get_orchestrator() -> SyncSentaOrchestrator:
    """Return the multi-agent orchestrator (Teacher_Agent + 7 specialists).

    Normally initialized on FastAPI startup; falls back to lazy init for tests
    or direct ASGI mounting that skips the lifespan event.
    """
    global _orchestrator
    if _orchestrator is None:
        orch = SyncSentaOrchestrator()
        await orch.initialize()
        _orchestrator = orch
    return _orchestrator


@app.on_event("startup")
async def _warm_orchestrator() -> None:
    # Pay the LangGraph + agent-registry boot cost once at server start so
    # the first /agents/chat request doesn't take the hit.
    try:
        await get_orchestrator()
    except Exception:
        # Don't block server startup on orchestrator init — get_orchestrator
        # will retry lazily on first request and surface the error there.
        pass


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------


def _ensure_session(
    supabase,
    session_id: Optional[str],
    user_id: str,
    subject: Optional[str],
    grade: Optional[str],
) -> Optional[str]:
    """Ensure chat session exists in database.
    
    Args:
        supabase: Supabase client
        session_id: Optional session ID from request
        user_id: User ID
        subject: Subject being discussed
        grade: Student's grade level
        
    Returns:
        Session ID (existing or newly created), or None if database unavailable
    """
    if not supabase:
        return session_id
    
    try:
        # Validate session_id format if provided
        if session_id:
            try:
                uuid.UUID(session_id)
            except (ValueError, AttributeError):
                logger.warning(f"Invalid session_id format: {session_id}, creating new session")
                session_id = None
        
        # Check if session exists
        if session_id:
            result = supabase.table("chat_sessions").select("id").eq("id", session_id).execute()
            if result.data:
                # Update last_message_at
                supabase.table("chat_sessions").update({
                    "last_message_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", session_id).execute()
                logger.info(f"Updated existing session: {session_id}")
                return session_id
        
        # Create new session
        new_session_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        session_data = {
            "id": new_session_id,
            "user_id": user_id,
            "subject": subject or "general",
            "grade": grade or "unknown",
            "mode": "socratic",
            "started_at": now,
            "last_message_at": now,
            "message_count": 0,
            "status": "active",
        }
        supabase.table("chat_sessions").insert(session_data).execute()
        logger.info(f"Created new session: {new_session_id}")
        return new_session_id
        
    except Exception as exc:
        logger.error(f"Failed to ensure session: {exc}")
        return session_id  # Return original session_id to allow chat to continue


def _save_message(
    supabase,
    session_id: Optional[str],
    user_id: str,
    role: str,
    content: str,
    model: Optional[str] = None,
    latency_ms: Optional[int] = None,
) -> None:
    """Save a chat message to database.
    
    Args:
        supabase: Supabase client
        session_id: Chat session ID
        user_id: User ID
        role: Message role ('user' or 'assistant')
        content: Message content
        model: AI model used (for assistant messages)
        latency_ms: Response latency in milliseconds
    """
    if not supabase or not session_id:
        return
    
    try:
        message_data = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "user_id": user_id,
            "role": role,
            "content": content,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        
        if model:
            message_data["model"] = model
        if latency_ms is not None:
            message_data["latency_ms"] = latency_ms
        
        supabase.table("chat_messages").insert(message_data).execute()
        logger.info(f"Saved {role} message to session {session_id}")
        
    except Exception as exc:
        logger.error(f"Failed to save message: {exc}")


def _update_session_stats(
    supabase,
    session_id: Optional[str],
    message_increment: int = 2,
) -> None:
    """Update session statistics after messages are saved.
    
    Args:
        supabase: Supabase client
        session_id: Chat session ID
        message_increment: Number of messages to add to count (default 2: user + assistant)
    """
    if not supabase or not session_id:
        return
    
    try:
        # Get current message count
        result = supabase.table("chat_sessions").select("message_count").eq("id", session_id).execute()
        if not result.data:
            return
        
        current_count = result.data[0].get("message_count", 0)
        new_count = current_count + message_increment
        
        # Update session
        supabase.table("chat_sessions").update({
            "message_count": new_count,
            "last_message_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", session_id).execute()
        
        logger.info(f"Updated session {session_id} stats: message_count={new_count}")
        
    except Exception as exc:
        logger.error(f"Failed to update session stats: {exc}")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/healthz")
async def healthz() -> Dict[str, Any]:
    return {
        "status": "ok",
        "offline_demo": os.environ.get("SYNCSENTA_OFFLINE_DEMO") == "1",
    }


@app.post("/agents/assessment/quiz")
async def generate_quiz(req: QuizRequest) -> Dict[str, Any]:
    try:
        quiz = await get_agent().generate_quiz(
            grade=req.grade,
            subject=req.subject,
            competency=req.competency,
            num_questions=req.num_questions,
            language=req.language,
            question_types=req.question_types,
        )
        return quiz.model_dump(mode="json")
    except AgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/agents/chat")
async def agent_chat(req: ChatRequest) -> Dict[str, Any]:
    """Route a student message through Teacher_Agent → specialist agent.

    Returns the synthesized response plus which agents participated, so the
    Rust backend can broadcast both the message and the agent activity over
    WebSocket to the teacher dashboard.
    
    Also persists the conversation to Supabase if available:
    - Ensures chat session exists (creates if needed)
    - Saves student message
    - Saves AI response
    - Updates session statistics
    """
    start_time = time.time()
    
    try:
        # Get Supabase client (may be None if not configured)
        supabase = try_get_supabase_client()
        
        # Ensure session exists and get session_id
        session_id = _ensure_session(
            supabase,
            req.session_id,
            req.user_id,
            req.subject,
            req.grade,
        )
        
        # Save student message to database
        _save_message(
            supabase,
            session_id,
            req.user_id,
            role="user",
            content=req.message,
        )
        
        # Process the request through orchestrator
        orch = await get_orchestrator()
        agent_req = AgentRequest(
            message=req.message,
            user_id=req.user_id,
            session_id=session_id,  # Use the ensured session_id
            grade=req.grade,
            subject=req.subject,
            role=req.role,
            context={"language": req.language},
        )
        resp = await orch.process_request(agent_req)
        
        # Calculate latency
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Save AI response to database
        if resp.success and resp.response:
            _save_message(
                supabase,
                session_id,
                req.user_id,
                role="assistant",
                content=resp.response,
                model=resp.primary_agent,  # Use primary agent as model identifier
                latency_ms=latency_ms,
            )
            
            # Update session statistics
            _update_session_stats(supabase, session_id, message_increment=2)
        
        # Return response with session_id included
        return {
            "success": resp.success,
            "response": resp.response,
            "session_id": session_id,  # Include session_id in response
            "primary_agent": resp.primary_agent,
            "agents_used": resp.agents_used,
            "response_time_ms": resp.response_time_ms,
            "fallback_used": resp.fallback_used,
            "error": resp.error,
        }
    except AgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/agents/assessment/grade")
async def grade_submission(req: GradeRequest) -> Dict[str, Any]:
    try:
        quiz = Quiz(**req.quiz)
        submission = QuizSubmission(**req.submission)
        graded = await get_agent().grade_submission(quiz, submission)
        return graded.model_dump(mode="json")
    except AgentError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except (KeyError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {exc}") from exc
