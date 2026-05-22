"""
Training Data Export API

Endpoints for exporting schemes, worksheets, and lesson plans to Supabase Storage
for RAG model training data collection.
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from supabase import create_client, Client
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/training-export", tags=["training-export"])


class ExportSchemeRequest(BaseModel):
    """Request to export a single scheme to storage"""
    scheme_id: str = Field(..., description="Scheme ID to export")
    teacher_id: str = Field(..., description="Teacher ID making the request")
    include_metadata: bool = Field(default=True, description="Include generation metadata")


class BatchExportRequest(BaseModel):
    """Request to export multiple schemes as training data"""
    teacher_id: str = Field(..., description="Teacher ID making the request")
    export_type: str = Field(default="schemes", description="Type: schemes, worksheets, lesson_plans, full")
    grade_filter: Optional[str] = Field(None, description="Filter by grade (e.g., 'Grade 4')")
    subject_filter: Optional[str] = Field(None, description="Filter by subject")
    term_filter: Optional[str] = Field(None, description="Filter by term")
    limit: Optional[int] = Field(None, description="Max number of items to export")


class ExportResponse(BaseModel):
    """Response from export operation"""
    success: bool
    export_id: Optional[str] = None
    storage_path: Optional[str] = None
    items_exported: int = 0
    file_size_bytes: Optional[int] = None
    message: str


def get_supabase_client() -> Client:
    """Get Supabase client from environment variables"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")  # Use service key for storage operations
    
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
    
    return create_client(url, key)


def generate_storage_path(export_type: str, grade: str, subject: str, term: str, scheme_id: str) -> str:
    """Generate storage path for exported file"""
    # Clean up names for file paths
    grade_clean = grade.lower().replace(" ", "-")
    subject_clean = subject.lower().replace(" ", "-")
    term_clean = term.lower().replace(" ", "-")
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    
    return f"{export_type}/{grade_clean}-{subject_clean}-{term_clean}-{scheme_id}-{timestamp}.json"


@router.post("/export-scheme", response_model=ExportResponse)
async def export_scheme(request: ExportSchemeRequest):
    """
    Export a single scheme to Supabase Storage for training data.
    
    The scheme JSON will be stored in the 'training-data' bucket with path:
    schemes/{grade}-{subject}-{term}-{scheme_id}-{timestamp}.json
    """
    try:
        supabase = get_supabase_client()
        
        # Fetch scheme from database
        result = supabase.table("schemes").select("*").eq("scheme_id", request.scheme_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail=f"Scheme {request.scheme_id} not found")
        
        scheme = result.data[0]
        
        # Prepare export data
        export_data = {
            "scheme_id": scheme["scheme_id"],
            "title": scheme["title"],
            "grade": scheme["grade"],
            "subject": scheme["subject"],
            "term": scheme["term"],
            "mode": scheme["mode"],
            "language": scheme.get("language", "english"),
            "total_weeks": scheme["total_weeks"],
            "lessons_per_week": scheme["lessons_per_week"],
            "rows": scheme["rows"],
            "created_at": scheme["created_at"],
        }
        
        if request.include_metadata:
            export_data["metadata"] = {
                "teacher_id": scheme["teacher_id"],
                "exported_at": datetime.now().isoformat(),
                "exported_by": request.teacher_id,
                "export_version": "1.0",
            }
        
        # Convert to JSON
        json_content = json.dumps(export_data, indent=2, ensure_ascii=False)
        json_bytes = json_content.encode("utf-8")
        
        # Generate storage path
        storage_path = generate_storage_path(
            "schemes",
            scheme["grade"],
            scheme["subject"],
            scheme["term"],
            scheme["scheme_id"]
        )
        
        # Upload to Supabase Storage
        bucket_name = "training-data"
        
        # Create bucket if it doesn't exist (idempotent)
        try:
            supabase.storage.create_bucket(bucket_name, {"public": False})
        except Exception as e:
            # Bucket might already exist, that's fine
            logger.debug(f"Bucket creation note: {e}")
        
        # Upload file
        upload_result = supabase.storage.from_(bucket_name).upload(
            storage_path,
            json_bytes,
            {"content-type": "application/json"}
        )
        
        # Update scheme record with storage path
        supabase.table("schemes").update({
            "storage_path": storage_path,
            "exported_at": datetime.now().isoformat(),
            "is_training_data": True,
            "updated_at": datetime.now().isoformat(),
        }).eq("scheme_id", request.scheme_id).execute()
        
        return ExportResponse(
            success=True,
            export_id=request.scheme_id,
            storage_path=storage_path,
            items_exported=1,
            file_size_bytes=len(json_bytes),
            message=f"Scheme exported successfully to {storage_path}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Export scheme error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.post("/batch-export", response_model=ExportResponse)
async def batch_export(request: BatchExportRequest):
    """
    Export multiple schemes as a batch for training data.
    
    Creates a single JSON file containing all matching schemes.
    Useful for creating training datasets for RAG models.
    """
    try:
        supabase = get_supabase_client()
        
        # Build query with filters
        query = supabase.table("schemes").select("*")
        
        if request.grade_filter:
            query = query.eq("grade", request.grade_filter)
        if request.subject_filter:
            query = query.eq("subject", request.subject_filter)
        if request.term_filter:
            query = query.eq("term", request.term_filter)
        
        if request.limit:
            query = query.limit(request.limit)
        
        # Execute query
        result = query.execute()
        
        if not result.data or len(result.data) == 0:
            return ExportResponse(
                success=False,
                items_exported=0,
                message="No schemes found matching filters"
            )
        
        schemes = result.data
        
        # Prepare batch export data
        export_data = {
            "export_type": request.export_type,
            "exported_at": datetime.now().isoformat(),
            "exported_by": request.teacher_id,
            "filters": {
                "grade": request.grade_filter,
                "subject": request.subject_filter,
                "term": request.term_filter,
            },
            "total_schemes": len(schemes),
            "schemes": schemes,
        }
        
        # Convert to JSON
        json_content = json.dumps(export_data, indent=2, ensure_ascii=False)
        json_bytes = json_content.encode("utf-8")
        
        # Generate export ID and storage path
        export_id = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        filters_str = f"{request.grade_filter or 'all'}_{request.subject_filter or 'all'}_{request.term_filter or 'all'}"
        storage_path = f"batches/{filters_str}_{export_id}.json"
        
        # Upload to Supabase Storage
        bucket_name = "training-data"
        
        try:
            supabase.storage.create_bucket(bucket_name, {"public": False})
        except Exception as e:
            logger.debug(f"Bucket creation note: {e}")
        
        upload_result = supabase.storage.from_(bucket_name).upload(
            storage_path,
            json_bytes,
            {"content-type": "application/json"}
        )
        
        # Record export in training_exports table
        supabase.table("training_exports").insert({
            "export_id": export_id,
            "export_type": request.export_type,
            "bucket_name": bucket_name,
            "storage_path": storage_path,
            "scheme_count": len(schemes),
            "total_items": len(schemes),
            "file_size_bytes": len(json_bytes),
            "metadata": {
                "filters": {
                    "grade": request.grade_filter,
                    "subject": request.subject_filter,
                    "term": request.term_filter,
                },
            },
            "status": "completed",
            "created_by": request.teacher_id,
            "completed_at": datetime.now().isoformat(),
        }).execute()
        
        # Mark all exported schemes
        scheme_ids = [s["scheme_id"] for s in schemes]
        for scheme_id in scheme_ids:
            supabase.table("schemes").update({
                "is_training_data": True,
                "exported_at": datetime.now().isoformat(),
            }).eq("scheme_id", scheme_id).execute()
        
        return ExportResponse(
            success=True,
            export_id=export_id,
            storage_path=storage_path,
            items_exported=len(schemes),
            file_size_bytes=len(json_bytes),
            message=f"Batch export completed: {len(schemes)} schemes exported to {storage_path}"
        )
        
    except Exception as e:
        logger.error(f"Batch export error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch export failed: {str(e)}")


@router.get("/stats")
async def get_export_stats():
    """Get statistics about training data exports"""
    try:
        supabase = get_supabase_client()
        
        # Call the database function
        result = supabase.rpc("get_training_data_stats").execute()
        
        if result.data and len(result.data) > 0:
            stats = result.data[0]
            return {
                "success": True,
                "stats": stats
            }
        
        return {
            "success": True,
            "stats": {
                "total_schemes": 0,
                "exported_schemes": 0,
                "total_worksheets": 0,
                "total_lesson_plans": 0,
                "total_exports": 0,
                "last_export_date": None,
            }
        }
        
    except Exception as e:
        logger.error(f"Get stats error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@router.get("/exportable-schemes")
async def get_exportable_schemes():
    """Get list of schemes that haven't been exported yet or have been updated since last export"""
    try:
        supabase = get_supabase_client()
        
        # Call the database function
        result = supabase.rpc("get_exportable_schemes").execute()
        
        return {
            "success": True,
            "schemes": result.data or [],
            "count": len(result.data) if result.data else 0,
        }
        
    except Exception as e:
        logger.error(f"Get exportable schemes error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get exportable schemes: {str(e)}")
