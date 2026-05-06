"""Misconception Detection - Identify specific student misunderstandings.

Uses pattern matching and LLM analysis to detect common misconceptions
in student work, enabling targeted interventions.
"""

from __future__ import annotations

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime

from ..core.logging import AgentLogger


@dataclass
class Misconception:
    """A detected student misconception."""
    misconception_id: str
    competency: str
    misconception_type: str
    description: str
    confidence: float
    evidence: List[str]
    detected_at: datetime
    remediation_strategy: str


class MisconceptionDetector:
    """Detects common misconceptions from student interaction patterns.
    
    Combines:
    - Pattern matching (symbolic rules)
    - Error analysis (neural classification)
    - Pedagogical knowledge base
    """
    
    def __init__(self):
        self.logger = AgentLogger("misconception_detector")
        self.misconception_library = self._load_misconception_library()
    
    def _load_misconception_library(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load library of known misconceptions by competency."""
        return {
            "MATH.FRACTIONS": [
                {
                    "type": "numerator_denominator_confusion",
                    "description": "Student confuses numerator and denominator",
                    "patterns": ["inverted_fraction", "swapped_values"],
                    "remediation": "Use visual fraction models (pizza slices, bars)"
                },
                {
                    "type": "whole_number_thinking",
                    "description": "Student applies whole number rules to fractions",
                    "patterns": ["adds_numerators_and_denominators"],
                    "remediation": "Emphasize fractions as parts of a whole"
                },
                {
                    "type": "larger_denominator_larger_fraction",
                    "description": "Student thinks larger denominator = larger fraction",
                    "patterns": ["incorrect_comparison"],
                    "remediation": "Use number line visualization"
                }
            ],
            "MATH.RATIOS": [
                {
                    "type": "additive_vs_multiplicative",
                    "description": "Student uses addition instead of multiplication for ratios",
                    "patterns": ["additive_reasoning"],
                    "remediation": "Emphasize multiplicative relationships"
                }
            ],
            "MATH.ALGEBRA": [
                {
                    "type": "variable_as_label",
                    "description": "Student treats variable as label, not unknown",
                    "patterns": ["substitutes_first_letter"],
                    "remediation": "Use concrete examples with unknowns"
                }
            ],
            "SCIENCE.FORCES": [
                {
                    "type": "force_implies_motion",
                    "description": "Student thinks force always causes motion",
                    "patterns": ["ignores_balanced_forces"],
                    "remediation": "Demonstrate balanced forces scenarios"
                }
            ]
        }
    
    def detect(
        self,
        competency: str,
        interaction_history: List[Dict[str, Any]],
        telemetry: Dict[str, Any]
    ) -> List[Misconception]:
        """Detect misconceptions from student interactions.
        
        Args:
            competency: Competency being assessed
            interaction_history: Past interactions
            telemetry: Current session telemetry
            
        Returns:
            List of detected misconceptions
        """
        detected = []
        
        # Get misconceptions for this competency
        known_misconceptions = self.misconception_library.get(competency, [])
        
        for misconception_template in known_misconceptions:
            confidence, evidence = self._check_misconception(
                misconception_template,
                interaction_history,
                telemetry
            )
            
            if confidence > 0.6:  # Threshold for detection
                misconception = Misconception(
                    misconception_id=f"{competency}_{misconception_template['type']}",
                    competency=competency,
                    misconception_type=misconception_template["type"],
                    description=misconception_template["description"],
                    confidence=confidence,
                    evidence=evidence,
                    detected_at=datetime.now(),
                    remediation_strategy=misconception_template["remediation"]
                )
                detected.append(misconception)
                
                self.logger.info(
                    f"Misconception detected: {misconception.misconception_type}",
                    confidence=confidence
                )
        
        return detected
    
    def _check_misconception(
        self,
        misconception_template: Dict[str, Any],
        interaction_history: List[Dict[str, Any]],
        telemetry: Dict[str, Any]
    ) -> tuple[float, List[str]]:
        """Check if a specific misconception is present.
        
        Returns:
            (confidence, evidence_list)
        """
        evidence = []
        pattern_matches = 0
        total_patterns = len(misconception_template["patterns"])
        
        # Check error patterns in telemetry
        error_pattern = telemetry.get("error_pattern", "")
        for pattern in misconception_template["patterns"]:
            if pattern in error_pattern:
                pattern_matches += 1
                evidence.append(f"Error pattern '{pattern}' detected")
        
        # Check interaction history for consistent errors
        if len(interaction_history) >= 2:
            error_types = [
                i.get("error_type", "")
                for i in interaction_history
                if not i.get("correct", False)
            ]
            
            # If same error type appears multiple times
            for pattern in misconception_template["patterns"]:
                if error_types.count(pattern) >= 2:
                    pattern_matches += 1
                    evidence.append(f"Repeated error type '{pattern}' in history")
        
        # Calculate confidence based on pattern matches
        if total_patterns == 0:
            confidence = 0.0
        else:
            confidence = pattern_matches / total_patterns
        
        # Boost confidence if multiple pieces of evidence
        if len(evidence) >= 2:
            confidence = min(1.0, confidence * 1.2)
        
        return confidence, evidence
    
    def get_remediation_strategy(
        self,
        misconception: Misconception
    ) -> Dict[str, Any]:
        """Get detailed remediation strategy for a misconception.
        
        Returns:
            Dictionary with remediation details
        """
        return {
            "misconception": misconception.description,
            "strategy": misconception.remediation_strategy,
            "scaffolding_level": "moderate",
            "recommended_activities": self._get_activities(misconception),
            "teacher_guidance": self._get_teacher_guidance(misconception)
        }
    
    def _get_activities(self, misconception: Misconception) -> List[str]:
        """Get recommended activities for remediation."""
        # Map misconception types to activities
        activity_map = {
            "numerator_denominator_confusion": [
                "Interactive fraction bar manipulation",
                "Pizza slice visual model",
                "Fraction comparison game"
            ],
            "whole_number_thinking": [
                "Part-whole relationship exercises",
                "Fraction addition with visual models",
                "Real-world fraction scenarios"
            ],
            "additive_vs_multiplicative": [
                "Ratio table exercises",
                "Scaling problems",
                "Proportional reasoning tasks"
            ]
        }
        
        return activity_map.get(
            misconception.misconception_type,
            ["General practice exercises"]
        )
    
    def _get_teacher_guidance(self, misconception: Misconception) -> str:
        """Get guidance for teachers on addressing this misconception."""
        guidance_map = {
            "numerator_denominator_confusion": (
                "This student is confusing the roles of numerator and denominator. "
                "Use concrete visual models like fraction bars or pizza slices. "
                "Emphasize: numerator = how many pieces, denominator = total pieces."
            ),
            "whole_number_thinking": (
                "This student is applying whole number rules to fractions. "
                "Help them understand fractions represent parts of a whole, not separate numbers. "
                "Use visual models to show why you can't just add numerators and denominators."
            ),
            "additive_vs_multiplicative": (
                "This student is using additive reasoning for ratios (should be multiplicative). "
                "Emphasize that ratios involve multiplication/division, not addition/subtraction. "
                "Use scaling examples (recipes, maps) to illustrate."
            )
        }
        
        return guidance_map.get(
            misconception.misconception_type,
            "Provide targeted practice and conceptual explanation."
        )
    
    def add_misconception_to_library(
        self,
        competency: str,
        misconception_data: Dict[str, Any]
    ) -> None:
        """Add a new misconception to the library (teacher feedback loop)."""
        if competency not in self.misconception_library:
            self.misconception_library[competency] = []
        
        self.misconception_library[competency].append(misconception_data)
        
        self.logger.info(
            f"Added misconception to library",
            competency=competency,
            type=misconception_data.get("type")
        )
