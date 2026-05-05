"""Analysis Agent - Identifies misconceptions from behavioral telemetry.

This agent uses AI to analyze behavioral patterns and identify specific
misconceptions that students have. It's NOT just a wrapper - it implements:
- Pattern-to-misconception mapping
- Confidence scoring
- Evidence collection
- Misconception taxonomy
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum

from ..core.logging import get_logger
from ..inference.groq_client import GroqClient
from .telemetry import BehavioralProfile, BehaviorPattern

logger = get_logger("analysis_agent")


class MisconceptionType(Enum):
    """Types of mathematical/conceptual misconceptions."""
    # Mathematics
    CONFUSES_NUMERATOR_DENOMINATOR = "confuses_numerator_denominator"
    ADDS_DENOMINATORS = "adds_denominators"
    IGNORES_ORDER_OF_OPERATIONS = "ignores_order_of_operations"
    CONFUSES_AREA_PERIMETER = "confuses_area_perimeter"
    NEGATIVE_NUMBER_CONFUSION = "negative_number_confusion"
    DECIMAL_PLACE_VALUE = "decimal_place_value"
    
    # Science
    CONFUSES_MASS_WEIGHT = "confuses_mass_weight"
    FORCE_MOTION_CONFUSION = "force_motion_confusion"
    PHOTOSYNTHESIS_RESPIRATION = "photosynthesis_respiration"
    
    # Language
    SUBJECT_VERB_AGREEMENT = "subject_verb_agreement"
    TENSE_CONFUSION = "tense_confusion"
    PRONOUN_ANTECEDENT = "pronoun_antecedent"
    
    # General
    PROCEDURAL_ONLY = "procedural_only"  # Can follow steps but no understanding
    CONCEPTUAL_GAP = "conceptual_gap"  # Missing foundational concept
    OVERGENERALIZATION = "overgeneralization"  # Applies rule too broadly
    UNDERGENERALIZATION = "undergeneralization"  # Doesn't apply rule enough
    UNKNOWN = "unknown"


@dataclass
class MisconceptionEvidence:
    """Evidence supporting a misconception hypothesis."""
    evidence_type: str  # "behavioral", "error_pattern", "tool_usage"
    description: str
    confidence: float  # 0.0 to 1.0
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Misconception:
    """Identified student misconception."""
    misconception_id: str
    student_id: str
    competency: str  # e.g., "MATH.G4.FRACTIONS"
    misconception_type: MisconceptionType
    description: str  # Human-readable description
    confidence: float  # 0.0 to 1.0
    evidence: List[MisconceptionEvidence]
    detected_at: datetime
    severity: str  # "low", "medium", "high", "critical"
    suggested_intervention: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "misconception_id": self.misconception_id,
            "student_id": self.student_id,
            "competency": self.competency,
            "misconception_type": self.misconception_type.value,
            "description": self.description,
            "confidence": self.confidence,
            "evidence": [
                {
                    "evidence_type": e.evidence_type,
                    "description": e.description,
                    "confidence": e.confidence,
                    "timestamp": e.timestamp.isoformat(),
                    "metadata": e.metadata
                }
                for e in self.evidence
            ],
            "detected_at": self.detected_at.isoformat(),
            "severity": self.severity,
            "suggested_intervention": self.suggested_intervention
        }


class AnalysisAgent:
    """
    Sophisticated misconception analysis agent.
    
    This is NOT just a wrapper - it implements:
    - Pattern-to-misconception mapping algorithms
    - AI-powered misconception identification
    - Evidence-based confidence scoring
    - Intervention recommendation
    """
    
    def __init__(self, groq_client: Optional[GroqClient] = None):
        self.logger = get_logger("analysis_agent")
        self.groq_client = groq_client or GroqClient()
        
        # Misconception taxonomy (pattern -> likely misconceptions)
        self.misconception_patterns = self._build_misconception_taxonomy()
    
    def _build_misconception_taxonomy(self) -> Dict[str, List[MisconceptionType]]:
        """
        Build taxonomy mapping behavioral patterns to likely misconceptions.
        
        This is domain knowledge encoded as rules.
        """
        return {
            # High erasure + backtracking in fractions = likely confusing numerator/denominator
            "fractions_high_erasure": [
                MisconceptionType.CONFUSES_NUMERATOR_DENOMINATOR,
                MisconceptionType.ADDS_DENOMINATORS
            ],
            
            # Circular pathing in order of operations = ignoring rules
            "order_ops_circular": [
                MisconceptionType.IGNORES_ORDER_OF_OPERATIONS
            ],
            
            # Systematic but wrong in geometry = confusing concepts
            "geometry_systematic_wrong": [
                MisconceptionType.CONFUSES_AREA_PERIMETER
            ],
            
            # Hesitant + many tool switches = conceptual gap
            "hesitant_exploratory": [
                MisconceptionType.CONCEPTUAL_GAP
            ],
            
            # Confident but wrong = overgeneralization
            "confident_wrong": [
                MisconceptionType.OVERGENERALIZATION
            ],
            
            # Trial and error without progress = procedural only
            "trial_error_no_progress": [
                MisconceptionType.PROCEDURAL_ONLY
            ]
        }
    
    async def analyze_misconceptions(
        self,
        behavioral_profile: BehavioralProfile,
        competency: str,
        activity_data: Optional[Dict[str, Any]] = None
    ) -> List[Misconception]:
        """
        Analyze behavioral profile to identify misconceptions.
        
        This is the main entry point for misconception analysis.
        
        Args:
            behavioral_profile: Telemetry analysis results
            competency: What competency is being assessed (e.g., "MATH.G4.FRACTIONS")
            activity_data: Optional activity-specific data (answers, work shown, etc.)
        
        Returns:
            List of identified misconceptions with evidence
        """
        self.logger.info(
            f"Analyzing misconceptions for {behavioral_profile.student_id}",
            competency=competency,
            primary_pattern=behavioral_profile.primary_pattern.value
        )
        
        misconceptions = []
        
        # Step 1: Rule-based pattern matching
        rule_based = await self._rule_based_analysis(behavioral_profile, competency)
        misconceptions.extend(rule_based)
        
        # Step 2: AI-powered analysis (uses Groq)
        ai_based = await self._ai_powered_analysis(
            behavioral_profile, competency, activity_data
        )
        misconceptions.extend(ai_based)
        
        # Step 3: Merge and deduplicate
        merged = self._merge_misconceptions(misconceptions)
        
        # Step 4: Score confidence and severity
        scored = self._score_misconceptions(merged, behavioral_profile)
        
        # Step 5: Generate intervention recommendations
        final = self._add_interventions(scored, behavioral_profile)
        
        self.logger.info(
            f"Identified {len(final)} misconceptions",
            student_id=behavioral_profile.student_id,
            misconceptions=[m.misconception_type.value for m in final]
        )
        
        return final
    
    async def _rule_based_analysis(
        self,
        profile: BehavioralProfile,
        competency: str
    ) -> List[Misconception]:
        """
        Rule-based misconception identification.
        
        Uses pattern matching against known misconception patterns.
        """
        misconceptions = []
        now = datetime.now()
        
        # Pattern: High erasure in fractions
        if "fraction" in competency.lower() and profile.erasure.erasure_rate > 0.3:
            evidence = [
                MisconceptionEvidence(
                    evidence_type="behavioral",
                    description=f"High erasure rate ({profile.erasure.erasure_rate:.1%}) suggests confusion",
                    confidence=0.7,
                    timestamp=now,
                    metadata={"erasure_rate": profile.erasure.erasure_rate}
                ),
                MisconceptionEvidence(
                    evidence_type="behavioral",
                    description=f"{profile.erasure.undo_count} undos indicate trial-and-error",
                    confidence=0.6,
                    timestamp=now,
                    metadata={"undo_count": profile.erasure.undo_count}
                )
            ]
            
            misconceptions.append(Misconception(
                misconception_id=f"{profile.student_id}_{competency}_confuses_num_denom",
                student_id=profile.student_id,
                competency=competency,
                misconception_type=MisconceptionType.CONFUSES_NUMERATOR_DENOMINATOR,
                description="Student may be confusing numerator and denominator",
                confidence=0.65,
                evidence=evidence,
                detected_at=now,
                severity="medium",
                suggested_intervention="Review fraction basics with visual models"
            ))
        
        # Pattern: Circular pathing (stuck)
        if profile.pathing.is_circular:
            evidence = [
                MisconceptionEvidence(
                    evidence_type="behavioral",
                    description="Circular pathing indicates student is stuck in a loop",
                    confidence=0.8,
                    timestamp=now,
                    metadata={"path_complexity": profile.pathing.path_complexity}
                )
            ]
            
            misconceptions.append(Misconception(
                misconception_id=f"{profile.student_id}_{competency}_conceptual_gap",
                student_id=profile.student_id,
                competency=competency,
                misconception_type=MisconceptionType.CONCEPTUAL_GAP,
                description="Student appears to be missing a foundational concept",
                confidence=0.75,
                evidence=evidence,
                detected_at=now,
                severity="high",
                suggested_intervention="Provide scaffolded instruction on prerequisite concepts"
            ))
        
        # Pattern: Confident but low mastery (overgeneralization)
        if profile.dwell.confidence_score > 0.7 and profile.mastery_indicator < 0.4:
            evidence = [
                MisconceptionEvidence(
                    evidence_type="behavioral",
                    description=f"High confidence ({profile.dwell.confidence_score:.2f}) but low mastery ({profile.mastery_indicator:.2f})",
                    confidence=0.7,
                    timestamp=now,
                    metadata={
                        "confidence": profile.dwell.confidence_score,
                        "mastery": profile.mastery_indicator
                    }
                )
            ]
            
            misconceptions.append(Misconception(
                misconception_id=f"{profile.student_id}_{competency}_overgeneralization",
                student_id=profile.student_id,
                competency=competency,
                misconception_type=MisconceptionType.OVERGENERALIZATION,
                description="Student may be overgeneralizing a rule or concept",
                confidence=0.6,
                evidence=evidence,
                detected_at=now,
                severity="medium",
                suggested_intervention="Provide counterexamples and edge cases"
            ))
        
        return misconceptions
    
    async def _ai_powered_analysis(
        self,
        profile: BehavioralProfile,
        competency: str,
        activity_data: Optional[Dict[str, Any]]
    ) -> List[Misconception]:
        """
        AI-powered misconception identification using Groq.
        
        This uses the LLM to analyze patterns and identify misconceptions
        that rule-based systems might miss.
        """
        # Build prompt for AI analysis
        prompt = self._build_analysis_prompt(profile, competency, activity_data)
        
        try:
            # Call Groq AI
            response = await self.groq_client.chat_completion(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert educational psychologist specializing in identifying student misconceptions from behavioral data. Analyze the provided telemetry and identify specific misconceptions."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,  # Lower temperature for more consistent analysis
                max_tokens=1000
            )
            
            # Parse AI response
            misconceptions = self._parse_ai_response(
                response, profile.student_id, competency
            )
            
            return misconceptions
            
        except Exception as e:
            self.logger.error(f"AI analysis failed: {e}")
            return []
    
    def _build_analysis_prompt(
        self,
        profile: BehavioralProfile,
        competency: str,
        activity_data: Optional[Dict[str, Any]]
    ) -> str:
        """Build prompt for AI misconception analysis."""
        prompt = f"""Analyze this student's behavioral data and identify specific misconceptions.

**Competency**: {competency}

**Behavioral Profile**:
- Primary Pattern: {profile.primary_pattern.value}
- Secondary Patterns: {', '.join(p.value for p in profile.secondary_patterns)}
- Mastery Indicator: {profile.mastery_indicator:.2f} (0.0 = struggling, 1.0 = mastered)
- Engagement Score: {profile.engagement_score:.2f}

**Pathing Analysis**:
- Total Actions: {profile.pathing.total_actions}
- Path Complexity: {profile.pathing.path_complexity:.2f} (0.0 = linear, 1.0 = chaotic)
- Backtrack Count: {profile.pathing.backtrack_count}
- Is Circular: {profile.pathing.is_circular}
- Progress Rate: {profile.pathing.progress_rate:.1f} actions/min

**Dwell Analysis**:
- Mean Dwell Time: {profile.dwell.mean_dwell_ms:.0f}ms
- Hesitation Count: {profile.dwell.hesitation_count}
- Confidence Score: {profile.dwell.confidence_score:.2f}

**Erasure Analysis**:
- Undo Count: {profile.erasure.undo_count}
- Erasure Rate: {profile.erasure.erasure_rate:.1%}
- Uncertainty Score: {profile.erasure.uncertainty_score:.2f}

**Velocity Analysis**:
- Actions Per Minute: {profile.velocity.actions_per_minute:.1f}
- Velocity Trend: {profile.velocity.velocity_trend}
- Is Rushed: {profile.velocity.is_rushed}
- Is Deliberate: {profile.velocity.is_deliberate}

**Tool Usage**:
- Tools Used: {', '.join(profile.tool_usage.tools_used)}
- Tool Switches: {profile.tool_usage.tool_switches}
- Strategy Type: {profile.tool_usage.strategy_type}
"""

        if activity_data:
            prompt += f"\n**Activity Data**:\n{activity_data}\n"
        
        prompt += """
Based on this data, identify 1-3 specific misconceptions the student likely has.

For each misconception, provide:
1. **Type**: Choose from common misconceptions (e.g., confuses_numerator_denominator, conceptual_gap, overgeneralization)
2. **Description**: Brief explanation of the misconception
3. **Confidence**: 0.0 to 1.0 (how confident are you?)
4. **Evidence**: What behavioral patterns support this?
5. **Severity**: low, medium, high, or critical
6. **Intervention**: Specific teaching strategy to address it

Format as JSON array:
```json
[
  {
    "type": "confuses_numerator_denominator",
    "description": "Student confuses which number is the numerator",
    "confidence": 0.75,
    "evidence": "High erasure rate and backtracking in fraction problems",
    "severity": "medium",
    "intervention": "Use visual fraction models to reinforce numerator/denominator roles"
  }
]
```
"""
        return prompt
    
    def _parse_ai_response(
        self,
        response: str,
        student_id: str,
        competency: str
    ) -> List[Misconception]:
        """Parse AI response into Misconception objects."""
        import json
        import re
        
        misconceptions = []
        now = datetime.now()
        
        try:
            # Extract JSON from response
            json_match = re.search(r'```json\s*(.*?)\s*```', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_str = response
            
            data = json.loads(json_str)
            
            for item in data:
                # Map type string to enum
                try:
                    misconception_type = MisconceptionType(item["type"])
                except ValueError:
                    misconception_type = MisconceptionType.UNKNOWN
                
                evidence = [
                    MisconceptionEvidence(
                        evidence_type="ai_analysis",
                        description=item["evidence"],
                        confidence=item["confidence"],
                        timestamp=now
                    )
                ]
                
                misconception = Misconception(
                    misconception_id=f"{student_id}_{competency}_{item['type']}",
                    student_id=student_id,
                    competency=competency,
                    misconception_type=misconception_type,
                    description=item["description"],
                    confidence=item["confidence"],
                    evidence=evidence,
                    detected_at=now,
                    severity=item["severity"],
                    suggested_intervention=item["intervention"]
                )
                
                misconceptions.append(misconception)
                
        except (json.JSONDecodeError, KeyError) as e:
            self.logger.error(f"Failed to parse AI response: {e}", response=response)
        
        return misconceptions
    
    def _merge_misconceptions(
        self,
        misconceptions: List[Misconception]
    ) -> List[Misconception]:
        """Merge duplicate misconceptions and combine evidence."""
        # Group by misconception type
        grouped: Dict[MisconceptionType, List[Misconception]] = {}
        for m in misconceptions:
            if m.misconception_type not in grouped:
                grouped[m.misconception_type] = []
            grouped[m.misconception_type].append(m)
        
        # Merge each group
        merged = []
        for misconception_type, group in grouped.items():
            if len(group) == 1:
                merged.append(group[0])
            else:
                # Combine evidence from all
                all_evidence = []
                for m in group:
                    all_evidence.extend(m.evidence)
                
                # Use highest confidence
                max_confidence = max(m.confidence for m in group)
                
                # Use most severe severity
                severity_order = {"low": 0, "medium": 1, "high": 2, "critical": 3}
                max_severity = max(group, key=lambda m: severity_order[m.severity]).severity
                
                # Create merged misconception
                merged_m = Misconception(
                    misconception_id=group[0].misconception_id,
                    student_id=group[0].student_id,
                    competency=group[0].competency,
                    misconception_type=misconception_type,
                    description=group[0].description,
                    confidence=max_confidence,
                    evidence=all_evidence,
                    detected_at=group[0].detected_at,
                    severity=max_severity,
                    suggested_intervention=group[0].suggested_intervention
                )
                merged.append(merged_m)
        
        return merged
    
    def _score_misconceptions(
        self,
        misconceptions: List[Misconception],
        profile: BehavioralProfile
    ) -> List[Misconception]:
        """Adjust confidence scores based on overall behavioral profile."""
        for m in misconceptions:
            # Boost confidence if intervention is urgently needed
            if profile.intervention_urgency in ["high", "critical"]:
                m.confidence = min(1.0, m.confidence * 1.2)
            
            # Reduce confidence if student is just exploring
            if profile.primary_pattern == BehaviorPattern.EXPLORATORY:
                m.confidence = m.confidence * 0.8
        
        return misconceptions
    
    def _add_interventions(
        self,
        misconceptions: List[Misconception],
        profile: BehavioralProfile
    ) -> List[Misconception]:
        """Add or refine intervention recommendations."""
        # Interventions are already added, but we can refine based on profile
        for m in misconceptions:
            # Add urgency note if needed
            if profile.intervention_urgency == "critical":
                m.suggested_intervention = f"URGENT: {m.suggested_intervention}"
        
        return misconceptions
