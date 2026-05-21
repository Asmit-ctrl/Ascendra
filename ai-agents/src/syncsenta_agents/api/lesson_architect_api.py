"""Lesson Architect API endpoints for scheme and lesson plan management."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..db.supabase_client import get_supabase_client
from ..core.logging import get_logger
from ..agents.lesson_architect import LessonArchitectAgent, SchemeMode

router = APIRouter(prefix="/lesson-architect", tags=["lesson-architect"])
logger = get_logger("lesson_architect_api")


class GenerateSchemeRequest(BaseModel):
    """Request to generate a scheme of work end-to-end (LLM + KSA guardrails)."""
    teacher_id: str
    grade: str
    subject: str
    term: str
    mode: str = "standard"
    language: str = "english"


class SchemeRequest(BaseModel):
    """Request to save a pre-generated scheme.

    Accepts the structured ``SchemeRow[]`` JSON that the scheme-wizard renderer
    consumes. ``content`` is accepted as a legacy fallback for clients that
    still POST a markdown blob — those rows get wrapped in a single placeholder
    entry so the studio can at least display them, but new clients should
    always send ``rows``.
    """

    teacher_id: str
    grade: str
    subject: str
    term: str
    title: str
    rows: Optional[List[Dict[str, Any]]] = None
    content: Optional[str] = None  # legacy markdown fallback
    mode: str = "standard"
    language: str = "english"


class ListSchemesRequest(BaseModel):
    """Request to list schemes."""
    teacher_id: str
    grade: Optional[str] = None
    subject: Optional[str] = None


class GenerateLessonPlanRequest(BaseModel):
    """Request to generate one CBC lesson plan from a SchemeRow.

    The studio passes the selected ``SchemeRow`` directly as ``row`` along with
    grade/subject context. ``scheme_id`` is the legacy fallback (load the row
    from Supabase) and only kicks in when ``row`` is absent.
    """

    teacher_id: str
    week: int
    lesson: int = 1
    scheme_id: Optional[str] = None
    row: Optional[Dict[str, Any]] = None
    grade: Optional[str] = None
    subject: Optional[str] = None
    term: Optional[str] = None
    additional_notes: Optional[str] = None
    language: str = "english"


@router.post("/generate-scheme")
async def generate_scheme(request: GenerateSchemeRequest) -> Dict[str, Any]:
    """Generate a scheme of work and return structured SchemeRow[] JSON.

    Replaces the previous flow that routed scheme generation through the
    generic ``/agents/chat`` endpoint and asked the LLM for markdown — that
    is what produced the prose blob in ``savy.png``. This endpoint invokes
    the ``LessonArchitectAgent`` directly, which already emits the 10-column
    SchemeRow JSON with KSA-validated learning outcomes.
    """

    try:
        try:
            mode_enum = SchemeMode(request.mode)
        except ValueError:
            mode_enum = SchemeMode.STANDARD

        agent = LessonArchitectAgent(supabase_client=get_supabase_client())
        result = await agent.generate_scheme(
            grade=request.grade,
            subject=request.subject,
            term=request.term,
            mode=mode_enum,
            teacher_id=request.teacher_id,
            language=request.language,
        )

        scheme = result.get("scheme", {}) or {}
        rows = scheme.get("rows", []) or []

        return {
            "success": True,
            "scheme_id": scheme.get("scheme_id"),
            "title": scheme.get("title"),
            "grade": request.grade,
            "subject": request.subject,
            "term": request.term,
            "mode": request.mode,
            "language": request.language,
            "total_weeks": scheme.get("total_weeks", len(rows)),
            "lessons_per_week": scheme.get("lessons_per_week", 5),
            "rows": rows,
            "source": "ai-agents",
        }

    except Exception as exc:
        logger.error(
            "Failed to generate scheme",
            error=str(exc),
            error_type=type(exc).__name__,
            grade=request.grade,
            subject=request.subject,
            term=request.term,
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to generate scheme: {exc}"
        )


@router.post("/generate-lesson-plan")
async def generate_lesson_plan(request: GenerateLessonPlanRequest) -> Dict[str, Any]:
    """Generate one CBC lesson plan and return the validated JSON shape.

    Output ``lesson_plan`` matches the contract in
    ``_inventory/scheme-scribe-ai/supabase/functions/generate-lesson-plan/index.ts``:
    ``{title, grade, subject, strand, subStrand, duration, objectives[],
    keyInquiryQuestion, introduction{duration,activities[]}, development{...},
    conclusion{...}, assessment[], differentiation{advanced,struggling},
    resources[], teacherReflection}``.
    """

    try:
        agent = LessonArchitectAgent(supabase_client=get_supabase_client())
        result = await agent.generate_lesson_plan(
            week=request.week,
            lesson=request.lesson,
            teacher_id=request.teacher_id,
            scheme_id=request.scheme_id,
            row=request.row,
            grade=request.grade,
            subject=request.subject,
            term=request.term,
            additional_notes=request.additional_notes,
            language=request.language,
        )

        return {
            "success": True,
            "lesson_plan_id": result.get("lesson_plan_id"),
            "lesson_plan": result.get("lesson_plan", {}),
            "source": "ai-agents",
        }

    except Exception as exc:
        logger.error(
            "Failed to generate lesson plan",
            error=str(exc),
            error_type=type(exc).__name__,
            week=request.week,
            lesson=request.lesson,
            grade=request.grade,
            subject=request.subject,
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to generate lesson plan: {exc}"
        )


@router.post("/schemes")
async def save_scheme(request: SchemeRequest) -> Dict[str, Any]:
    """Save a generated scheme of work to the database."""
    supabase = get_supabase_client()
    
    if not supabase:
        raise HTTPException(
            status_code=503,
            detail="Database not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables."
        )
    
    try:
        from datetime import datetime
        import uuid
        
        scheme_id = f"scheme_{uuid.uuid4().hex[:12]}"
        created_at = datetime.utcnow().isoformat()
        
        logger.info("Saving scheme", scheme_id=scheme_id, teacher_id=request.teacher_id)

        # Prefer structured rows; fall back to the legacy markdown blob only
        # when the caller hasn't migrated yet.
        if request.rows:
            rows_payload = request.rows
        elif request.content:
            rows_payload = [{"content": request.content}]
        else:
            raise HTTPException(
                status_code=400,
                detail="Either 'rows' (SchemeRow[]) or 'content' must be provided",
            )

        total_weeks = max((r.get("week", 0) for r in rows_payload), default=13) or 13

        response = supabase.table("schemes").insert({
            "scheme_id": scheme_id,
            "title": request.title,
            "grade": request.grade,
            "subject": request.subject,
            "term": request.term,
            "mode": request.mode,
            "teacher_id": request.teacher_id,
            "language": request.language,
            "total_weeks": total_weeks,
            "lessons_per_week": 5,  # Standard school week
            "rows": rows_payload,  # JSONB SchemeRow[]
            "created_at": created_at,
        }).execute()
        
        logger.info("Scheme saved successfully", scheme_id=scheme_id)
        
        return {
            "success": True,
            "message": "Scheme saved successfully",
            "scheme_id": scheme_id
        }
        
    except Exception as exc:
        logger.error("Failed to save scheme", error=str(exc), error_type=type(exc).__name__)
        raise HTTPException(status_code=500, detail=f"Failed to save scheme: {str(exc)}")


@router.get("/schemes")
async def list_schemes(
    teacher_id: str,
    grade: Optional[str] = None,
    subject: Optional[str] = None
) -> Dict[str, Any]:
    """List schemes for a teacher."""
    supabase = get_supabase_client()
    
    if not supabase:
        raise HTTPException(
            status_code=503,
            detail="Database not configured"
        )
    
    try:
        query = supabase.table("schemes").select("*").eq("teacher_id", teacher_id)
        
        if grade:
            query = query.eq("grade", grade)
        if subject:
            query = query.eq("subject", subject)
        
        response = query.execute()
        schemes = response.data if response and hasattr(response, 'data') else []
        
        logger.info("Listed schemes", count=len(schemes), teacher_id=teacher_id)
        
        return {
            "success": True,
            "schemes": schemes,
            "count": len(schemes)
        }
        
    except Exception as exc:
        logger.error("Failed to list schemes", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to list schemes: {str(exc)}")


@router.get("/schemes/{scheme_id}")
async def get_scheme(scheme_id: str) -> Dict[str, Any]:
    """Get a specific scheme by ID."""
    supabase = get_supabase_client()
    
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        response = supabase.table("schemes").select("*").eq("scheme_id", scheme_id).execute()
        
        if not response or not hasattr(response, 'data') or not response.data:
            raise HTTPException(status_code=404, detail="Scheme not found")
        
        return {
            "success": True,
            "scheme": response.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to get scheme", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to get scheme: {str(exc)}")
