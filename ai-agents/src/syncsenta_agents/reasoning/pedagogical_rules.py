"""Pedagogical Rule Engine - Symbolic reasoning for tutoring decisions.

Implements rule-based pedagogical heuristics that guide AI behavior.
Rules are validated by master teachers and provide explainability.
"""

from __future__ import annotations

from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import json

from ..core.logging import AgentLogger


class AffectState(Enum):
    """Student affective states detected from telemetry."""
    FLOW = "flow"  # Optimal learning state
    PRODUCTIVE_STRUGGLE = "productive_struggle"  # Good difficulty
    FRUSTRATION = "frustration"  # Needs intervention
    BOREDOM = "boredom"  # Too easy
    CONFUSION = "confusion"  # Needs clarification


class ScaffoldingLevel(Enum):
    """Levels of instructional support."""
    MINIMAL = "minimal"  # Just a hint
    MODERATE = "moderate"  # Guiding question
    SUBSTANTIAL = "substantial"  # Step-by-step
    DIRECT = "direct"  # Show solution (last resort)


@dataclass
class PedagogicalRule:
    """A single pedagogical rule with conditions and actions."""
    rule_id: str
    name: str
    conditions: Dict[str, Any]
    action: str
    scaffolding_level: ScaffoldingLevel
    confidence: float
    explanation: str


@dataclass
class RuleDecision:
    """Result of rule evaluation."""
    fired_rules: List[PedagogicalRule]
    recommended_action: str
    scaffolding_level: ScaffoldingLevel
    explanation: str
    confidence: float


class PedagogicalRuleEngine:
    """Rule-based reasoning engine for pedagogical decisions.
    
    Implements symbolic rules like:
    - If erasure_rate > 3 AND dwell_time > 60s → Frustration → Simplify
    - If first_attempt_correct AND time < 30s → Flow → Increase difficulty
    - If circular_pathing → Confusion → Provide conceptual hint
    """
    
    def __init__(self):
        self.logger = AgentLogger("pedagogical_rules")
        self.rules: List[PedagogicalRule] = []
        self._load_default_rules()
    
    def _load_default_rules(self) -> None:
        """Load default pedagogical rules validated by educators."""
        
        # Rule 1: High erasure + long dwell time = Frustration
        self.rules.append(PedagogicalRule(
            rule_id="R001",
            name="detect_frustration",
            conditions={
                "erasure_count": {"operator": ">", "value": 3},
                "dwell_time_seconds": {"operator": ">", "value": 60}
            },
            action="simplify_problem",
            scaffolding_level=ScaffoldingLevel.SUBSTANTIAL,
            confidence=0.85,
            explanation="High erasure rate + long dwell time indicates frustration"
        ))
        
        # Rule 2: Fast correct answer = Flow state
        self.rules.append(PedagogicalRule(
            rule_id="R002",
            name="detect_flow",
            conditions={
                "first_attempt_correct": {"operator": "==", "value": True},
                "time_to_solution_seconds": {"operator": "<", "value": 30}
            },
            action="increase_difficulty",
            scaffolding_level=ScaffoldingLevel.MINIMAL,
            confidence=0.90,
            explanation="Quick correct answer indicates mastery - ready for challenge"
        ))
        
        # Rule 3: Circular pathing = Conceptual confusion
        self.rules.append(PedagogicalRule(
            rule_id="R003",
            name="detect_confusion",
            conditions={
                "pathing_circularity": {"operator": ">", "value": 0.7}
            },
            action="provide_conceptual_hint",
            scaffolding_level=ScaffoldingLevel.MODERATE,
            confidence=0.80,
            explanation="Circular interaction pattern suggests conceptual gap"
        ))
        
        # Rule 4: Multiple attempts with improvement = Productive struggle
        self.rules.append(PedagogicalRule(
            rule_id="R004",
            name="detect_productive_struggle",
            conditions={
                "attempt_count": {"operator": ">=", "value": 2},
                "attempt_count": {"operator": "<=", "value": 4},
                "progress_trend": {"operator": "==", "value": "improving"}
            },
            action="encourage_continue",
            scaffolding_level=ScaffoldingLevel.MINIMAL,
            confidence=0.88,
            explanation="Multiple attempts with progress - student is learning"
        ))
        
        # Rule 5: Fraction misconception - confuses numerator/denominator
        self.rules.append(PedagogicalRule(
            rule_id="R005",
            name="fraction_numerator_denominator_confusion",
            conditions={
                "competency": {"operator": "==", "value": "MATH.FRACTIONS"},
                "error_pattern": {"operator": "contains", "value": "inverted_fraction"}
            },
            action="use_visual_manipulative",
            scaffolding_level=ScaffoldingLevel.MODERATE,
            confidence=0.92,
            explanation="Student confuses numerator/denominator - needs visual model"
        ))
        
        # Rule 6: Long hesitation before first action
        self.rules.append(PedagogicalRule(
            rule_id="R006",
            name="detect_hesitation",
            conditions={
                "time_to_first_action_seconds": {"operator": ">", "value": 45}
            },
            action="provide_starting_hint",
            scaffolding_level=ScaffoldingLevel.MODERATE,
            confidence=0.75,
            explanation="Long hesitation suggests uncertainty about how to start"
        ))
        
        self.logger.info(f"Loaded {len(self.rules)} pedagogical rules")
    
    def evaluate(self, telemetry: Dict[str, Any]) -> RuleDecision:
        """Evaluate telemetry against all rules and return decision.
        
        Args:
            telemetry: Student interaction data (dwell_time, erasure_count, etc.)
            
        Returns:
            RuleDecision with fired rules and recommended action
        """
        fired_rules = []
        
        for rule in self.rules:
            if self._check_conditions(rule.conditions, telemetry):
                fired_rules.append(rule)
                self.logger.info(
                    f"Rule fired: {rule.rule_id} - {rule.name}",
                    confidence=rule.confidence
                )
        
        if not fired_rules:
            # No rules fired - default to neutral action
            return RuleDecision(
                fired_rules=[],
                recommended_action="continue_current_approach",
                scaffolding_level=ScaffoldingLevel.MINIMAL,
                explanation="No specific pedagogical patterns detected",
                confidence=0.5
            )
        
        # Select highest confidence rule
        best_rule = max(fired_rules, key=lambda r: r.confidence)
        
        return RuleDecision(
            fired_rules=fired_rules,
            recommended_action=best_rule.action,
            scaffolding_level=best_rule.scaffolding_level,
            explanation=self._build_explanation(fired_rules),
            confidence=best_rule.confidence
        )
    
    def _check_conditions(
        self,
        conditions: Dict[str, Any],
        telemetry: Dict[str, Any]
    ) -> bool:
        """Check if all conditions in a rule are satisfied."""
        for field, condition in conditions.items():
            if field not in telemetry:
                return False
            
            operator = condition["operator"]
            expected = condition["value"]
            actual = telemetry[field]
            
            if operator == ">":
                if not (actual > expected):
                    return False
            elif operator == "<":
                if not (actual < expected):
                    return False
            elif operator == ">=":
                if not (actual >= expected):
                    return False
            elif operator == "<=":
                if not (actual <= expected):
                    return False
            elif operator == "==":
                if not (actual == expected):
                    return False
            elif operator == "contains":
                if expected not in str(actual):
                    return False
        
        return True
    
    def _build_explanation(self, fired_rules: List[PedagogicalRule]) -> str:
        """Build human-readable explanation of why rules fired."""
        if len(fired_rules) == 1:
            return fired_rules[0].explanation
        
        explanations = [f"• {rule.explanation}" for rule in fired_rules]
        return "Multiple patterns detected:\n" + "\n".join(explanations)
    
    def add_custom_rule(self, rule: PedagogicalRule) -> None:
        """Add a custom rule (e.g., from teacher feedback)."""
        self.rules.append(rule)
        self.logger.info(f"Added custom rule: {rule.rule_id} - {rule.name}")
    
    def get_rule_by_id(self, rule_id: str) -> Optional[PedagogicalRule]:
        """Retrieve a specific rule by ID."""
        for rule in self.rules:
            if rule.rule_id == rule_id:
                return rule
        return None
    
    def export_rules(self) -> str:
        """Export all rules as JSON for auditing/compliance."""
        rules_data = []
        for rule in self.rules:
            rules_data.append({
                "rule_id": rule.rule_id,
                "name": rule.name,
                "conditions": rule.conditions,
                "action": rule.action,
                "scaffolding_level": rule.scaffolding_level.value,
                "confidence": rule.confidence,
                "explanation": rule.explanation
            })
        return json.dumps(rules_data, indent=2)
