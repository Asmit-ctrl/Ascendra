"""Intervention Agent - Generates targeted educational interventions.

This agent creates personalized learning materials based on identified
misconceptions. It's NOT just a wrapper - it implements:
- Intervention strategy selection
- Content generation with pedagogical principles
- Differentiation based on student profile
- Multi-modal content (text, visual descriptions, activities)
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum

from ..core.logging import get_logger
from ..inference.groq_client import GroqClient
from .analysis import Misconception, MisconceptionType
from .telemetry import BehavioralProfile, BehaviorPattern

logger = get_logger("intervention_agent")


class InterventionType(Enum):
    """Types of interventions."""
    MINI_LESSON = "mini_lesson"  # 10-15 minute targeted lesson
    PRACTICE_ACTIVITY = "practice_activity"  # Focused practice
    VISUAL_MODEL = "visual_model"  # Visual/concrete representation
    WORKED_EXAMPLE = "worked_example"  # Step-by-step example
    SCAFFOLDED_PROBLEM = "scaffolded_problem"  # Guided problem-solving
    PEER_DISCUSSION = "peer_discussion"  # Collaborative activity
    FORMATIVE_ASSESSMENT = "formative_assessment"  # Quick check
    REMEDIAL_CONTENT = "remedial_content"  # Review prerequisite


class DifficultyLevel(Enum):
    """Difficulty levels for interventions."""
    FOUNDATIONAL = "foundational"  # Review basics
    GRADE_LEVEL = "grade_level"  # At grade level
    CHALLENGE = "challenge"  # Above grade level


@dataclass
class InterventionContent:
    """Generated intervention content."""
    intervention_id: str
    student_id: str
    misconception_id: str
    intervention_type: InterventionType
    difficulty_level: DifficultyLevel
    
    # Content
    title: str
    objective: str  # What student will learn
    duration_minutes: int
    materials_needed: List[str]
    content: str  # Main content (markdown formatted)
    visual_aids: List[str]  # Descriptions of visual aids to create
    activities: List[Dict[str, str]]  # Step-by-step activities
    assessment: str  # How to check understanding
    
    # Metadata
    created_at: datetime
    cbc_alignment: str  # CBC competency addressed
    differentiation_notes: str
    teacher_notes: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "intervention_id": self.intervention_id,
            "student_id": self.student_id,
            "misconception_id": self.misconception_id,
            "intervention_type": self.intervention_type.value,
            "difficulty_level": self.difficulty_level.value,
            "title": self.title,
            "objective": self.objective,
            "duration_minutes": self.duration_minutes,
            "materials_needed": self.materials_needed,
            "content": self.content,
            "visual_aids": self.visual_aids,
            "activities": self.activities,
            "assessment": self.assessment,
            "created_at": self.created_at.isoformat(),
            "cbc_alignment": self.cbc_alignment,
            "differentiation_notes": self.differentiation_notes,
            "teacher_notes": self.teacher_notes
        }


@dataclass
class InterventionPlan:
    """Complete intervention plan for a student."""
    plan_id: str
    student_id: str
    created_at: datetime
    interventions: List[InterventionContent]
    sequence: List[str]  # Order to deliver interventions
    estimated_total_time: int  # Total minutes
    priority: str  # "low", "medium", "high", "critical"
    teacher_summary: str  # Summary for teacher dashboard


class InterventionAgent:
    """
    Sophisticated intervention generation agent.
    
    This is NOT just a wrapper - it implements:
    - Pedagogical strategy selection
    - Content generation with educational principles
    - Differentiation based on student needs
    - CBC curriculum alignment
    """
    
    def __init__(self, groq_client: Optional[GroqClient] = None):
        self.logger = get_logger("intervention_agent")
        self.groq_client = groq_client or GroqClient()
        
        # Intervention strategy mapping
        self.strategy_map = self._build_strategy_map()
    
    def _build_strategy_map(self) -> Dict[MisconceptionType, List[InterventionType]]:
        """
        Build mapping of misconceptions to effective intervention types.
        
        Based on educational research and best practices.
        """
        return {
            MisconceptionType.CONFUSES_NUMERATOR_DENOMINATOR: [
                InterventionType.VISUAL_MODEL,
                InterventionType.MINI_LESSON,
                InterventionType.PRACTICE_ACTIVITY
            ],
            MisconceptionType.ADDS_DENOMINATORS: [
                InterventionType.VISUAL_MODEL,
                InterventionType.WORKED_EXAMPLE,
                InterventionType.SCAFFOLDED_PROBLEM
            ],
            MisconceptionType.CONCEPTUAL_GAP: [
                InterventionType.REMEDIAL_CONTENT,
                InterventionType.MINI_LESSON,
                InterventionType.VISUAL_MODEL
            ],
            MisconceptionType.OVERGENERALIZATION: [
                InterventionType.WORKED_EXAMPLE,
                InterventionType.PRACTICE_ACTIVITY,
                InterventionType.PEER_DISCUSSION
            ],
            MisconceptionType.PROCEDURAL_ONLY: [
                InterventionType.MINI_LESSON,
                InterventionType.PEER_DISCUSSION,
                InterventionType.SCAFFOLDED_PROBLEM
            ]
        }
    
    async def generate_intervention_plan(
        self,
        misconceptions: List[Misconception],
        behavioral_profile: BehavioralProfile,
        grade: str,
        subject: str
    ) -> InterventionPlan:
        """
        Generate complete intervention plan for a student.
        
        This is the main entry point for intervention generation.
        """
        self.logger.info(
            f"Generating intervention plan for {behavioral_profile.student_id}",
            misconception_count=len(misconceptions),
            grade=grade,
            subject=subject
        )
        
        # Sort misconceptions by severity and confidence
        sorted_misconceptions = sorted(
            misconceptions,
            key=lambda m: (
                {"low": 0, "medium": 1, "high": 2, "critical": 3}[m.severity],
                m.confidence
            ),
            reverse=True
        )
        
        # Generate interventions for each misconception
        interventions = []
        for misconception in sorted_misconceptions:
            intervention = await self.generate_intervention(
                misconception, behavioral_profile, grade, subject
            )
            interventions.append(intervention)
        
        # Determine sequence (most critical first)
        sequence = [i.intervention_id for i in interventions]
        
        # Calculate total time
        total_time = sum(i.duration_minutes for i in interventions)
        
        # Determine priority
        if any(m.severity == "critical" for m in sorted_misconceptions):
            priority = "critical"
        elif any(m.severity == "high" for m in sorted_misconceptions):
            priority = "high"
        elif any(m.severity == "medium" for m in sorted_misconceptions):
            priority = "medium"
        else:
            priority = "low"
        
        # Generate teacher summary
        teacher_summary = self._generate_teacher_summary(
            sorted_misconceptions, interventions, behavioral_profile
        )
        
        plan = InterventionPlan(
            plan_id=f"plan_{behavioral_profile.student_id}_{datetime.now().timestamp()}",
            student_id=behavioral_profile.student_id,
            created_at=datetime.now(),
            interventions=interventions,
            sequence=sequence,
            estimated_total_time=total_time,
            priority=priority,
            teacher_summary=teacher_summary
        )
        
        self.logger.info(
            f"Generated intervention plan with {len(interventions)} interventions",
            total_time=total_time,
            priority=priority
        )
        
        return plan
    
    async def generate_intervention(
        self,
        misconception: Misconception,
        behavioral_profile: BehavioralProfile,
        grade: str,
        subject: str
    ) -> InterventionContent:
        """Generate a single intervention for a misconception."""
        
        # Select intervention type based on misconception
        intervention_type = self._select_intervention_type(
            misconception, behavioral_profile
        )
        
        # Determine difficulty level
        difficulty = self._determine_difficulty(
            misconception, behavioral_profile
        )
        
        # Generate content using AI
        content = await self._generate_content(
            misconception, behavioral_profile, intervention_type,
            difficulty, grade, subject
        )
        
        return content
    
    def _select_intervention_type(
        self,
        misconception: Misconception,
        profile: BehavioralProfile
    ) -> InterventionType:
        """
        Select most appropriate intervention type.
        
        Based on misconception type and behavioral profile.
        """
        # Get recommended types for this misconception
        recommended = self.strategy_map.get(
            misconception.misconception_type,
            [InterventionType.MINI_LESSON]
        )
        
        # Adjust based on behavioral pattern
        if profile.primary_pattern == BehaviorPattern.HESITANT:
            # Hesitant students benefit from visual models
            if InterventionType.VISUAL_MODEL in recommended:
                return InterventionType.VISUAL_MODEL
        
        elif profile.primary_pattern == BehaviorPattern.TRIAL_ERROR:
            # Trial-and-error students need worked examples
            if InterventionType.WORKED_EXAMPLE in recommended:
                return InterventionType.WORKED_EXAMPLE
        
        elif profile.primary_pattern == BehaviorPattern.STUCK:
            # Stuck students need scaffolded problems
            return InterventionType.SCAFFOLDED_PROBLEM
        
        elif profile.primary_pattern == BehaviorPattern.EXPLORATORY:
            # Exploratory students benefit from peer discussion
            if InterventionType.PEER_DISCUSSION in recommended:
                return InterventionType.PEER_DISCUSSION
        
        # Default to first recommended type
        return recommended[0]
    
    def _determine_difficulty(
        self,
        misconception: Misconception,
        profile: BehavioralProfile
    ) -> DifficultyLevel:
        """Determine appropriate difficulty level."""
        # If mastery is very low, start with foundational
        if profile.mastery_indicator < 0.3:
            return DifficultyLevel.FOUNDATIONAL
        
        # If mastery is high but specific misconception, grade level
        elif profile.mastery_indicator > 0.7:
            return DifficultyLevel.GRADE_LEVEL
        
        # If confident but wrong, might need challenge
        elif profile.dwell.confidence_score > 0.7 and profile.mastery_indicator < 0.5:
            return DifficultyLevel.GRADE_LEVEL
        
        # Default to grade level
        return DifficultyLevel.GRADE_LEVEL
    
    async def _generate_content(
        self,
        misconception: Misconception,
        profile: BehavioralProfile,
        intervention_type: InterventionType,
        difficulty: DifficultyLevel,
        grade: str,
        subject: str
    ) -> InterventionContent:
        """Generate intervention content using AI."""
        
        prompt = self._build_content_prompt(
            misconception, profile, intervention_type, difficulty, grade, subject
        )
        
        try:
            response = await self.groq_client.chat_completion(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert Kenyan teacher creating targeted interventions for students. Generate CBC-aligned, culturally relevant content."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            # Parse response into InterventionContent
            content = self._parse_content_response(
                response, misconception, profile, intervention_type, difficulty
            )
            
            return content
            
        except Exception as e:
            self.logger.error(f"Content generation failed: {e}")
            # Return fallback content
            return self._create_fallback_content(
                misconception, profile, intervention_type, difficulty, grade, subject
            )
    
    def _build_content_prompt(
        self,
        misconception: Misconception,
        profile: BehavioralProfile,
        intervention_type: InterventionType,
        difficulty: DifficultyLevel,
        grade: str,
        subject: str
    ) -> str:
        """Build prompt for content generation."""
        return f"""Create a targeted intervention for a Kenyan {grade} student.

**Misconception**: {misconception.description}
**Type**: {misconception.misconception_type.value}
**Severity**: {misconception.severity}
**Competency**: {misconception.competency}

**Student Profile**:
- Primary Pattern: {profile.primary_pattern.value}
- Mastery Level: {profile.mastery_indicator:.2f}
- Engagement: {profile.engagement_score:.2f}
- Intervention Urgency: {profile.intervention_urgency}

**Intervention Type**: {intervention_type.value}
**Difficulty Level**: {difficulty.value}
**Subject**: {subject}

Generate a complete intervention with:

1. **Title**: Catchy, student-friendly title
2. **Objective**: Clear learning objective (what student will learn)
3. **Duration**: Estimated time in minutes
4. **Materials**: List of materials needed (use locally available items)
5. **Content**: Main teaching content (markdown format)
   - Introduction (hook with Kenyan context)
   - Explanation (clear, simple language)
   - Examples (use Kenyan context: shillings, matatu, ugali, etc.)
   - Practice problems (3-5 problems)
6. **Visual Aids**: Descriptions of visual aids to create
7. **Activities**: Step-by-step activities (3-5 steps)
8. **Assessment**: How to check understanding
9. **CBC Alignment**: Which CBC competency this addresses
10. **Differentiation**: Notes for struggling/advanced students
11. **Teacher Notes**: Tips for delivery

**Requirements**:
- Use Kenyan context and examples
- Align with CBC curriculum
- Use simple, clear language appropriate for {grade}
- Include concrete/visual representations
- Make it engaging and culturally relevant
- Address the specific misconception directly

Format as JSON:
```json
{{
  "title": "Understanding Fractions with Chapati",
  "objective": "Students will correctly identify numerator and denominator",
  "duration_minutes": 15,
  "materials_needed": ["Paper circles", "Markers", "Scissors"],
  "content": "# Introduction\\n\\nImagine you have a chapati...\\n\\n## Explanation\\n...",
  "visual_aids": ["Draw a circle divided into 4 parts", "Show 3/4 shaded"],
  "activities": [
    {{"step": 1, "description": "Cut paper circles into equal parts"}},
    {{"step": 2, "description": "Label each part with fractions"}}
  ],
  "assessment": "Ask students to draw and label 3 different fractions",
  "cbc_alignment": "Demonstrate understanding of fractions",
  "differentiation_notes": "For struggling: Use real chapati. For advanced: Compare fractions",
  "teacher_notes": "Emphasize that numerator is 'how many' and denominator is 'out of how many'"
}}
```
"""
    
    def _parse_content_response(
        self,
        response: str,
        misconception: Misconception,
        profile: BehavioralProfile,
        intervention_type: InterventionType,
        difficulty: DifficultyLevel
    ) -> InterventionContent:
        """Parse AI response into InterventionContent."""
        import json
        import re
        
        try:
            # Extract JSON
            json_match = re.search(r'```json\s*(.*?)\s*```', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_str = response
            
            data = json.loads(json_str)
            
            return InterventionContent(
                intervention_id=f"int_{misconception.misconception_id}_{datetime.now().timestamp()}",
                student_id=misconception.student_id,
                misconception_id=misconception.misconception_id,
                intervention_type=intervention_type,
                difficulty_level=difficulty,
                title=data["title"],
                objective=data["objective"],
                duration_minutes=data["duration_minutes"],
                materials_needed=data["materials_needed"],
                content=data["content"],
                visual_aids=data["visual_aids"],
                activities=data["activities"],
                assessment=data["assessment"],
                created_at=datetime.now(),
                cbc_alignment=data["cbc_alignment"],
                differentiation_notes=data["differentiation_notes"],
                teacher_notes=data["teacher_notes"]
            )
            
        except (json.JSONDecodeError, KeyError) as e:
            self.logger.error(f"Failed to parse content response: {e}")
            raise
    
    def _create_fallback_content(
        self,
        misconception: Misconception,
        profile: BehavioralProfile,
        intervention_type: InterventionType,
        difficulty: DifficultyLevel,
        grade: str,
        subject: str
    ) -> InterventionContent:
        """Create fallback content if AI generation fails."""
        return InterventionContent(
            intervention_id=f"int_{misconception.misconception_id}_fallback",
            student_id=misconception.student_id,
            misconception_id=misconception.misconception_id,
            intervention_type=intervention_type,
            difficulty_level=difficulty,
            title=f"Review: {misconception.description}",
            objective=f"Address {misconception.misconception_type.value}",
            duration_minutes=15,
            materials_needed=["Paper", "Pencil"],
            content=f"# Review Session\n\n{misconception.suggested_intervention}",
            visual_aids=["Use visual models to illustrate concept"],
            activities=[
                {"step": 1, "description": "Review the concept"},
                {"step": 2, "description": "Practice with examples"},
                {"step": 3, "description": "Check understanding"}
            ],
            assessment="Ask student to explain the concept in their own words",
            created_at=datetime.now(),
            cbc_alignment=misconception.competency,
            differentiation_notes="Adjust pace based on student response",
            teacher_notes=f"Focus on {misconception.description}"
        )
    
    def _generate_teacher_summary(
        self,
        misconceptions: List[Misconception],
        interventions: List[InterventionContent],
        profile: BehavioralProfile
    ) -> str:
        """Generate summary for teacher dashboard."""
        summary = f"**Student**: {profile.student_id}\n\n"
        summary += f"**Behavioral Pattern**: {profile.primary_pattern.value}\n"
        summary += f"**Mastery Level**: {profile.mastery_indicator:.0%}\n"
        summary += f"**Intervention Priority**: {profile.intervention_urgency}\n\n"
        
        summary += "**Identified Misconceptions**:\n"
        for i, m in enumerate(misconceptions, 1):
            summary += f"{i}. {m.description} (Confidence: {m.confidence:.0%}, Severity: {m.severity})\n"
        
        summary += f"\n**Recommended Interventions** ({len(interventions)} total):\n"
        for i, intervention in enumerate(interventions, 1):
            summary += f"{i}. {intervention.title} ({intervention.duration_minutes} min)\n"
        
        total_time = sum(i.duration_minutes for i in interventions)
        summary += f"\n**Estimated Total Time**: {total_time} minutes\n"
        
        return summary
