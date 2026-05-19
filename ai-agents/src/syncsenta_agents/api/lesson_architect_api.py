"""Lesson Architect API endpoints for scheme and lesson plan management."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..db.supabase_client import get_supabase_client
from ..core.logging import get_logger

router = APIRouter(prefix="/lesson-architect", tags=["lesson-architect"])
logger = get_logger("lesson_architect_api")


class SchemeRequest(BaseModel):
    """Request to save a generated scheme."""
    teacher_id: str
    grade: str
    subject: str
    term: str
    title: str
    content: str  # The generated scheme text
    mode: str = "standard"
    language: str = "english"


class ListSchemesRequest(BaseModel):
    """Request to list schemes."""
    teacher_id: str
    grade: Optional[str] = None
    subject: Optional[str] = None


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
        
        # Store the scheme with the content as a single row
        response = supabase.table("schemes").insert({
            "scheme_id": scheme_id,
            "title": request.title,
            "grade": request.grade,
            "subject": request.subject,
            "term": request.term,
            "mode": request.mode,
            "teacher_id": request.teacher_id,
            "language": request.language,
            "total_weeks": 13,  # Standard CBC term
            "lessons_per_week": 5,  # Standard school week
            "rows": [{"content": request.content}],  # Store as JSONB
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
