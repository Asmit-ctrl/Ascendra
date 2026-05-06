"""Decision Logger - Logs every AI decision for teacher feedback loop.

This is the foundation of the self-learning system.
Every tutoring decision, intervention, or content generation is logged
so teachers can provide feedback and the system can learn.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from uuid import uuid4
import json

from ..core.logging import AgentLogger


class DecisionLogger:
    """Logs AI decisions to database for teacher feedback."""
    
    def __init__(self, supabase_client=None):
        self.logger = AgentLogger("decision_logger")
        self.supabase = supabase_client
    
    async def log_decision(
        self,
        decision_type: str,
        student_id: str,
        teacher_id: str,
        competency: str,
        grade: str,
        subject: str,
        ai_action: str,
        ai_response: str,
        context: Dict[str, Any]
    ) -> str:
        """Log an AI decision for teacher review.
        
        Args:
            decision_type: 'tutoring_response', 'intervention', 'content_generation'
            student_id: Student UUID
            teacher_id: Teacher UUID
            competency: e.g., "MATH.G4.FRACTIONS"
            grade: e.g., "Grade 4"
            subject: e.g., "Mathematics"
            ai_action: What AI decided to do
            ai_response: The actual response/content generated
            context: Additional context (telemetry, fired_rules, etc.)
            
        Returns:
            decision_id: Unique ID for this decision
        """
        
        decision_id = f"decision_{uuid4().hex[:12]}"
        
        # Extract relevant context
        telemetry = context.get("telemetry", {})
        interaction_history = context.get("interaction_history", [])
        fired_rules = context.get("fired_rules", [])
        scaffolding_level = context.get("scaffolding_level")
        ai_reasoning = context.get("explanation", "")
        examples_used = context.get("examples_used", [])
        
        # Detect cultural context
        student_region = self._detect_region(context)
        language_preference = context.get("language", "english")
        
        decision_data = {
            "decision_id": decision_id,
            "student_id": student_id,
            "teacher_id": teacher_id,
            "session_id": context.get("session_id"),
            "competency": competency,
            "grade": grade,
            "subject": subject,
            
            "decision_type": decision_type,
            "ai_action": ai_action,
            "ai_reasoning": ai_reasoning,
            "ai_response": ai_response,
            
            "student_telemetry": telemetry,
            "interaction_history": interaction_history,
            "fired_rules": fired_rules,
            "scaffolding_level": scaffolding_level,
            "examples_used": examples_used,
            
            "student_region": student_region,
            "language_preference": language_preference,
            
            "created_at": datetime.now().isoformat()
        }
        
        try:
            if self.supabase:
                response = self.supabase.table("ai_decisions").insert(
                    decision_data
                ).execute()
                
                if response.data:
                    self.logger.info(
                        f"Decision logged: {decision_id}",
                        decision_type=decision_type,
                        competency=competency
                    )
                else:
                    self.logger.error("Failed to log decision to database")
            else:
                # Fallback: log to file if no database
                self.logger.info(
                    f"Decision logged (no DB): {decision_id}",
                    data=json.dumps(decision_data, indent=2)
                )
            
            return decision_id
            
        except Exception as e:
            self.logger.error(f"Failed to log decision: {e}")
            return decision_id  # Return ID even if logging fails
    
    async def log_student_outcome(
        self,
        decision_id: str,
        outcome: str,
        outcome_data: Optional[Dict[str, Any]] = None
    ):
        """Log student outcome after an AI decision.
        
        Args:
            decision_id: The decision to update
            outcome: 'improved', 'no_change', 'declined'
            outcome_data: Metrics showing the outcome
        """
        try:
            if self.supabase:
                self.supabase.table("ai_decisions").update({
                    "student_outcome": outcome,
                    "student_outcome_data": outcome_data
                }).eq("decision_id", decision_id).execute()
                
                self.logger.info(
                    f"Outcome logged for {decision_id}",
                    outcome=outcome
                )
        except Exception as e:
            self.logger.error(f"Failed to log outcome: {e}")
    
    def _detect_region(self, context: Dict[str, Any]) -> Optional[str]:
        """Detect student region from context.
        
        This is a placeholder - in production, you'd get this from user profile.
        """
        # Check if region is explicitly provided
        if "region" in context:
            return context["region"]
        
        # Try to infer from examples used
        examples = context.get("examples_used", [])
        if "matatu" in examples or "nairobi" in str(examples).lower():
            return "nairobi"
        elif "shamba" in examples or "farm" in str(examples).lower():
            return "rural"
        
        return None
    
    async def track_cultural_pattern(
        self,
        pattern_name: str,
        pattern_type: str,
        pattern_data: Dict[str, Any],
        context: Dict[str, Any]
    ):
        """Track a cultural pattern for learning.
        
        Args:
            pattern_name: e.g., "matatu_examples_effective"
            pattern_type: 'example_preference', 'misconception', 'teaching_style'
            pattern_data: Details about the pattern
            context: Context where pattern was observed
        """
        try:
            if not self.supabase:
                return
            
            # Check if pattern already exists
            existing = self.supabase.table("cultural_patterns").select("*").eq(
                "pattern_name", pattern_name
            ).eq("region", context.get("region")).execute()
            
            if existing.data:
                # Update occurrence count
                pattern_id = existing.data[0]["id"]
                new_count = existing.data[0]["occurrence_count"] + 1
                
                self.supabase.table("cultural_patterns").update({
                    "occurrence_count": new_count,
                    "updated_at": datetime.now().isoformat()
                }).eq("id", pattern_id).execute()
            else:
                # Create new pattern
                self.supabase.table("cultural_patterns").insert({
                    "pattern_name": pattern_name,
                    "pattern_type": pattern_type,
                    "region": context.get("region"),
                    "grade": context.get("grade"),
                    "subject": context.get("subject"),
                    "competency": context.get("competency"),
                    "pattern_data": pattern_data,
                    "occurrence_count": 1,
                    "confidence": 0.5  # Start with medium confidence
                }).execute()
            
            self.logger.info(
                f"Cultural pattern tracked: {pattern_name}",
                pattern_type=pattern_type
            )
            
        except Exception as e:
            self.logger.error(f"Failed to track cultural pattern: {e}")


# Singleton instance
_decision_logger: Optional[DecisionLogger] = None


def get_decision_logger(supabase_client=None) -> DecisionLogger:
    """Get or create the decision logger singleton."""
    global _decision_logger
    if _decision_logger is None:
        _decision_logger = DecisionLogger(supabase_client)
    return _decision_logger
