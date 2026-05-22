"""
Validation API endpoints.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging

from ..curriculum import (
    CurriculumValidator,
    ValidationResult,
    ContentType,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/validation", tags=["validation"])


class ValidationRequest(BaseModel):
    """Request model for content validation."""
    content: str = Field(..., description="Content text to validate")
    grade: str = Field(..., description="Target grade level (e.g., 'Grade 2', 'PP1')")
    subject: str = Field(..., description="Subject name")
    content_type: str = Field(..., description="Type of content (lesson, conversation, scheme)")
    teacher_id: Optional[str] = Field(None, description="Teacher ID for logging")


class ValidationResponse(BaseModel):
    """Response model for validation results."""
    status: str
    alignment_score: float
    grade: str
    subject: str
    content_type: str
    topics_found: List[Dict[str, Any]]
    aligned_topics: List[Dict[str, Any]]
    misaligned_topics: List[Dict[str, Any]]
    alternative_suggestions: List[Dict[str, Any]]
    processing_time_ms: float
    error_message: Optional[str] = None


class BatchValidationRequest(BaseModel):
    """Request model for batch validation."""
    items: List[ValidationRequest]


class BatchValidationResponse(BaseModel):
    """Response model for batch validation."""
    results: List[ValidationResponse]


class TopicGradeLevelResponse(BaseModel):
    """Response model for topic grade level lookup."""
    topic: str
    subject: str
    grade_level: Optional[str]
    found: bool


@router.post("/validate-content", response_model=ValidationResponse)
async def validate_content(
    request: ValidationRequest,
    validator: CurriculumValidator = Depends(lambda: get_validator()),
):
    """
    Validate educational content against CBC curriculum.
    
    Args:
        request: Validation request with content and metadata
        validator: CurriculumValidator instance (injected)
        
    Returns:
        ValidationResponse with complete analysis
    """
    try:
        # Parse content type
        try:
            content_type = ContentType(request.content_type)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid content_type: {request.content_type}. Must be one of: lesson, conversation, scheme"
            )
        
        # Validate content
        result = await validator.validate_content(
            content=request.content,
            grade=request.grade,
            subject=request.subject,
            content_type=content_type,
        )
        
        # Convert to response model
        result_dict = result.to_dict()
        
        return ValidationResponse(
            status=result_dict["status"],
            alignment_score=result_dict["alignment_score"],
            grade=result_dict["grade"],
            subject=result_dict["subject"],
            content_type=result_dict["content_type"],
            topics_found=result_dict["topics_found"],
            aligned_topics=result_dict["aligned_topics"],
            misaligned_topics=result_dict["misaligned_topics"],
            alternative_suggestions=result_dict["alternative_suggestions"],
            processing_time_ms=result_dict["processing_time_ms"],
            error_message=result_dict.get("error_message"),
        )
        
    except Exception as e:
        logger.error(f"Validation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate-batch", response_model=BatchValidationResponse)
async def validate_batch(
    request: BatchValidationRequest,
    validator: CurriculumValidator = Depends(lambda: get_validator()),
):
    """
    Validate multiple content items in batch.
    
    Args:
        request: Batch validation request
        validator: CurriculumValidator instance (injected)
        
    Returns:
        BatchValidationResponse with all results
    """
    import asyncio
    
    try:
        # Validate all items concurrently
        tasks = []
        for item in request.items:
            try:
                content_type = ContentType(item.content_type)
            except ValueError:
                continue
            
            task = validator.validate_content(
                content=item.content,
                grade=item.grade,
                subject=item.subject,
                content_type=content_type,
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Convert to response models
        responses = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Batch validation error: {result}")
                continue
            
            result_dict = result.to_dict()
            responses.append(ValidationResponse(
                status=result_dict["status"],
                alignment_score=result_dict["alignment_score"],
                grade=result_dict["grade"],
                subject=result_dict["subject"],
                content_type=result_dict["content_type"],
                topics_found=result_dict["topics_found"],
                aligned_topics=result_dict["aligned_topics"],
                misaligned_topics=result_dict["misaligned_topics"],
                alternative_suggestions=result_dict["alternative_suggestions"],
                processing_time_ms=result_dict["processing_time_ms"],
                error_message=result_dict.get("error_message"),
            ))
        
        return BatchValidationResponse(results=responses)
        
    except Exception as e:
        logger.error(f"Batch validation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/topic-grade-level/{subject}/{topic}", response_model=TopicGradeLevelResponse)
async def get_topic_grade_level(
    subject: str,
    topic: str,
    validator: CurriculumValidator = Depends(lambda: get_validator()),
):
    """
    Get the earliest grade level where a topic appears.
    
    Args:
        subject: Subject name
        topic: Topic name
        validator: CurriculumValidator instance (injected)
        
    Returns:
        TopicGradeLevelResponse with grade level information
    """
    try:
        grade_level = validator.get_topic_grade_level(topic, subject)
        
        return TopicGradeLevelResponse(
            topic=topic,
            subject=subject,
            grade_level=grade_level,
            found=grade_level is not None,
        )
        
    except Exception as e:
        logger.error(f"Topic lookup error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Dependency injection helper
_validator_instance = None

def get_validator() -> CurriculumValidator:
    """Get or create validator instance."""
    global _validator_instance
    
    if _validator_instance is None:
        from ..curriculum import CurriculumCache
        from ..curriculum.config import config
        
        # Initialize cache and validator
        cache = CurriculumCache(config.curriculum_dir)
        cache.load_curriculum()
        
        _validator_instance = CurriculumValidator(
            cache=cache,
            alignment_threshold=config.alignment_threshold,
            timeout_seconds=config.timeout_seconds,
        )
    
    return _validator_instance
