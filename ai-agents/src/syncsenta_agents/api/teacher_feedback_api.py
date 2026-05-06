"""Teacher Feedback API - Enables self-learning pedagogical intelligence.

This API allows teachers to:
1. View AI decisions made for their students
2. Provide feedback on AI decisions (helpful/not helpful)
3. Propose new pedagogical rules
4. Vote on community-proposed rules
5. View learned rules and cultural patterns
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID, uuid4

from ..core.logging import AgentLogger

router = APIRouter(prefix="/teacher-feedback", tags=["teacher-feedback"])
logger = AgentLogger("teacher_feedback_api")


# ============================================================================
# Request/Response Models
# ============================================================================

class AIDecisionResponse(BaseModel):
    """AI decision with context for teacher review."""
    id: str
    decision_id: str
    student_id: str
    competency: str
    grade: str
    subject: str
    
    decision_type: str
    ai_action: str
    ai_reasoning: Optional[str]
    ai_response: str
    
    fired_rules: Optional[List[Dict[str, Any]]]
    scaffolding_level: Optional[str]
    examples_used: Optional[List[str]]
    
    student_telemetry: Optional[Dict[str, Any]]
    
    teacher_feedback: Optional[str]
    teacher_comment: Optional[str]
    
    created_at: datetime


class TeacherFeedbackRequest(BaseModel):
    """Teacher feedback on an AI decision."""
    decision_id: str
    feedback: str = Field(..., pattern="^(helpful|not_helpful|needs_improvement)$")
    comment: Optional[str] = None
    suggested_alternative: Optional[str] = None


class RuleProposalRequest(BaseModel):
    """Teacher proposes a new pedagogical rule."""
    rule_name: str = Field(..., min_length=5, max_length=200)
    rule_description: str = Field(..., min_length=20)
    conditions: Dict[str, Any]
    action: str = Field(..., min_length=10)
    
    teacher_reasoning: str = Field(..., min_length=50)
    example_scenarios: Optional[str] = None
    
    applicable_regions: Optional[List[str]] = None
    applicable_grades: Optional[List[str]] = None
    applicable_subjects: Optional[List[str]] = None
    
    based_on_decision_id: Optional[str] = None


class RuleProposalResponse(BaseModel):
    """Rule proposal with voting stats."""
    id: str
    teacher_id: str
    teacher_name: Optional[str]
    
    proposed_rule_name: str
    proposed_rule_description: str
    proposed_conditions: Dict[str, Any]
    proposed_action: str
    
    teacher_reasoning: str
    example_scenarios: Optional[str]
    
    upvotes: int
    downvotes: int
    status: str
    
    created_at: datetime


class RuleVoteRequest(BaseModel):
    """Vote on a rule proposal."""
    proposal_id: str
    vote: str = Field(..., pattern="^(upvote|downvote)$")
    comment: Optional[str] = None


class LearnedRuleResponse(BaseModel):
    """A learned pedagogical rule."""
    rule_id: str
    rule_name: str
    rule_description: str
    conditions: Dict[str, Any]
    action: str
    scaffolding_level: Optional[str]
    
    confidence: float
    times_applied: int
    times_helpful: int
    times_not_helpful: int
    success_rate: float
    
    applicable_regions: Optional[List[str]]
    applicable_grades: Optional[List[str]]
    applicable_subjects: Optional[List[str]]
    
    status: str
    created_at: datetime


class CulturalPatternResponse(BaseModel):
    """A discovered cultural pattern."""
    pattern_name: str
    pattern_type: str
    region: Optional[str]
    grade: Optional[str]
    subject: Optional[str]
    
    pattern_data: Dict[str, Any]
    occurrence_count: int
    success_rate: Optional[float]
    confidence: float


class FeedbackSummaryResponse(BaseModel):
    """Teacher's feedback summary statistics."""
    total_decisions: int
    feedback_given: int
    helpful_count: int
    not_helpful_count: int
    feedback_rate: float
    
    top_competencies: List[Dict[str, Any]]
    recent_decisions: List[AIDecisionResponse]


# ============================================================================
# Dependency: Get Supabase Client
# ============================================================================

async def get_supabase():
    """Get Supabase client."""
    from ..db.supabase_client import get_supabase_client
    try:
        return get_supabase_client()
    except ValueError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Supabase not configured: {str(e)}"
        )


# ============================================================================
# Endpoints: AI Decisions & Feedback
# ============================================================================

@router.get("/decisions", response_model=List[AIDecisionResponse])
async def get_teacher_decisions(
    teacher_id: str,
    limit: int = 50,
    offset: int = 0,
    competency: Optional[str] = None,
    feedback_status: Optional[str] = None,
    supabase = Depends(get_supabase)
):
    """Get AI decisions for teacher's students.
    
    Args:
        teacher_id: Teacher UUID
        limit: Max results to return
        offset: Pagination offset
        competency: Filter by competency (e.g., "MATH.G4.FRACTIONS")
        feedback_status: Filter by feedback status (pending, given)
    """
    try:
        query = supabase.table("ai_decisions").select("*").eq("teacher_id", teacher_id)
        
        if competency:
            query = query.eq("competency", competency)
        
        if feedback_status == "pending":
            query = query.is_("teacher_feedback", "null")
        elif feedback_status == "given":
            query = query.not_.is_("teacher_feedback", "null")
        
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        
        response = query.execute()
        
        return [AIDecisionResponse(**row) for row in response.data]
        
    except Exception as e:
        logger.error(f"Failed to fetch decisions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/feedback")
async def submit_teacher_feedback(
    feedback: TeacherFeedbackRequest,
    teacher_id: str,
    supabase = Depends(get_supabase)
):
    """Submit teacher feedback on an AI decision.
    
    This is the core of the self-learning loop.
    """
    try:
        # Update the decision with feedback
        update_data = {
            "teacher_feedback": feedback.feedback,
            "teacher_comment": feedback.comment,
            "teacher_suggested_alternative": feedback.suggested_alternative,
            "feedback_received_at": datetime.now().isoformat()
        }
        
        response = supabase.table("ai_decisions").update(update_data).eq(
            "decision_id", feedback.decision_id
        ).eq("teacher_id", teacher_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Decision not found")
        
        # Update rule statistics if rules were fired
        decision = response.data[0]
        if decision.get("fired_rules"):
            await _update_rule_statistics(
                supabase,
                decision["fired_rules"],
                feedback.feedback == "helpful"
            )
        
        logger.info(
            f"Teacher feedback recorded",
            decision_id=feedback.decision_id,
            feedback=feedback.feedback
        )
        
        return {"success": True, "message": "Feedback recorded"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to submit feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary", response_model=FeedbackSummaryResponse)
async def get_feedback_summary(
    teacher_id: str,
    supabase = Depends(get_supabase)
):
    """Get teacher's feedback summary and statistics."""
    try:
        # Call database function for summary stats
        summary_response = supabase.rpc(
            "get_teacher_feedback_summary",
            {"teacher_uuid": teacher_id}
        ).execute()
        
        if not summary_response.data:
            raise HTTPException(status_code=404, detail="No data found")
        
        summary = summary_response.data[0]
        
        # Get top competencies
        competencies_response = supabase.table("ai_decisions").select(
            "competency"
        ).eq("teacher_id", teacher_id).execute()
        
        # Count competencies
        competency_counts: Dict[str, int] = {}
        for row in competencies_response.data:
            comp = row["competency"]
            competency_counts[comp] = competency_counts.get(comp, 0) + 1
        
        top_competencies = [
            {"competency": comp, "count": count}
            for comp, count in sorted(
                competency_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[:5]
        ]
        
        # Get recent decisions
        recent_response = supabase.table("ai_decisions").select("*").eq(
            "teacher_id", teacher_id
        ).order("created_at", desc=True).limit(10).execute()
        
        recent_decisions = [
            AIDecisionResponse(**row) for row in recent_response.data
        ]
        
        return FeedbackSummaryResponse(
            total_decisions=summary["total_decisions"],
            feedback_given=summary["feedback_given"],
            helpful_count=summary["helpful_count"],
            not_helpful_count=summary["not_helpful_count"],
            feedback_rate=summary["feedback_rate"],
            top_competencies=top_competencies,
            recent_decisions=recent_decisions
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Endpoints: Rule Proposals
# ============================================================================

@router.post("/propose-rule", response_model=RuleProposalResponse)
async def propose_rule(
    proposal: RuleProposalRequest,
    teacher_id: str,
    teacher_name: Optional[str] = None,
    supabase = Depends(get_supabase)
):
    """Teacher proposes a new pedagogical rule."""
    try:
        proposal_data = {
            "teacher_id": teacher_id,
            "teacher_name": teacher_name,
            "proposed_rule_name": proposal.rule_name,
            "proposed_rule_description": proposal.rule_description,
            "proposed_conditions": proposal.conditions,
            "proposed_action": proposal.action,
            "teacher_reasoning": proposal.teacher_reasoning,
            "example_scenarios": proposal.example_scenarios,
            "applicable_context": {
                "regions": proposal.applicable_regions,
                "grades": proposal.applicable_grades,
                "subjects": proposal.applicable_subjects
            },
            "based_on_decision_id": proposal.based_on_decision_id
        }
        
        response = supabase.table("teacher_rule_proposals").insert(
            proposal_data
        ).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create proposal")
        
        logger.info(
            f"Rule proposal created",
            teacher_id=teacher_id,
            rule_name=proposal.rule_name
        )
        
        return RuleProposalResponse(**response.data[0])
        
    except Exception as e:
        logger.error(f"Failed to create proposal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/proposals", response_model=List[RuleProposalResponse])
async def get_rule_proposals(
    status: Optional[str] = None,
    limit: int = 50,
    supabase = Depends(get_supabase)
):
    """Get all rule proposals (for community review)."""
    try:
        query = supabase.table("teacher_rule_proposals").select("*")
        
        if status:
            query = query.eq("status", status)
        
        query = query.order("created_at", desc=True).limit(limit)
        
        response = query.execute()
        
        return [RuleProposalResponse(**row) for row in response.data]
        
    except Exception as e:
        logger.error(f"Failed to fetch proposals: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/vote")
async def vote_on_proposal(
    vote: RuleVoteRequest,
    teacher_id: str,
    supabase = Depends(get_supabase)
):
    """Vote on a rule proposal."""
    try:
        # Insert vote
        vote_data = {
            "proposal_id": vote.proposal_id,
            "teacher_id": teacher_id,
            "vote": vote.vote,
            "comment": vote.comment
        }
        
        response = supabase.table("rule_votes").insert(vote_data).execute()
        
        # Update proposal vote counts
        if vote.vote == "upvote":
            supabase.rpc("increment_upvotes", {"proposal_uuid": vote.proposal_id}).execute()
        else:
            supabase.rpc("increment_downvotes", {"proposal_uuid": vote.proposal_id}).execute()
        
        logger.info(
            f"Vote recorded",
            proposal_id=vote.proposal_id,
            vote=vote.vote
        )
        
        return {"success": True, "message": "Vote recorded"}
        
    except Exception as e:
        logger.error(f"Failed to record vote: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Endpoints: Learned Rules & Cultural Patterns
# ============================================================================

@router.get("/learned-rules", response_model=List[LearnedRuleResponse])
async def get_learned_rules(
    status: str = "active",
    region: Optional[str] = None,
    grade: Optional[str] = None,
    subject: Optional[str] = None,
    supabase = Depends(get_supabase)
):
    """Get learned pedagogical rules."""
    try:
        query = supabase.table("learned_rules").select("*").eq("status", status)
        
        if region:
            query = query.contains("applicable_regions", [region])
        if grade:
            query = query.contains("applicable_grades", [grade])
        if subject:
            query = query.contains("applicable_subjects", [subject])
        
        query = query.order("confidence", desc=True)
        
        response = query.execute()
        
        rules = []
        for row in response.data:
            success_rate = (
                row["times_helpful"] / row["times_applied"]
                if row["times_applied"] > 0 else 0.0
            )
            rules.append(LearnedRuleResponse(**{**row, "success_rate": success_rate}))
        
        return rules
        
    except Exception as e:
        logger.error(f"Failed to fetch learned rules: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cultural-patterns", response_model=List[CulturalPatternResponse])
async def get_cultural_patterns(
    region: Optional[str] = None,
    pattern_type: Optional[str] = None,
    supabase = Depends(get_supabase)
):
    """Get discovered cultural patterns."""
    try:
        query = supabase.table("cultural_patterns").select("*")
        
        if region:
            query = query.eq("region", region)
        if pattern_type:
            query = query.eq("pattern_type", pattern_type)
        
        query = query.order("confidence", desc=True).limit(100)
        
        response = query.execute()
        
        return [CulturalPatternResponse(**row) for row in response.data]
        
    except Exception as e:
        logger.error(f"Failed to fetch cultural patterns: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Helper Functions
# ============================================================================

async def _update_rule_statistics(
    supabase,
    fired_rules: List[Dict[str, Any]],
    was_helpful: bool
):
    """Update statistics for rules that were fired."""
    for rule in fired_rules:
        rule_id = rule.get("rule_id")
        if not rule_id:
            continue
        
        # Increment times_applied
        supabase.rpc("increment_rule_applied", {"rule_uuid": rule_id}).execute()
        
        # Increment times_helpful if feedback was positive
        if was_helpful:
            supabase.rpc("increment_rule_helpful", {"rule_uuid": rule_id}).execute()
        else:
            supabase.rpc("increment_rule_not_helpful", {"rule_uuid": rule_id}).execute()
