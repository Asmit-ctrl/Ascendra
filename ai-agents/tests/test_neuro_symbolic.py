"""Tests for neuro-symbolic reasoning components."""

import pytest
from datetime import datetime

from syncsenta_agents.reasoning.pedagogical_rules import (
    PedagogicalRuleEngine,
    ScaffoldingLevel
)
from syncsenta_agents.reasoning.knowledge_tracer import (
    NeuralSymbolicKnowledgeTracer
)
from syncsenta_agents.reasoning.misconception_detector import (
    MisconceptionDetector
)


class TestPedagogicalRuleEngine:
    """Test pedagogical rule evaluation."""
    
    def test_detect_frustration(self):
        """Test frustration detection rule."""
        engine = PedagogicalRuleEngine()
        
        telemetry = {
            "erasure_count": 5,
            "dwell_time_seconds": 75
        }
        
        decision = engine.evaluate(telemetry)
        
        assert decision.recommended_action == "simplify_problem"
        assert decision.scaffolding_level == ScaffoldingLevel.SUBSTANTIAL
        assert len(decision.fired_rules) > 0
        assert decision.confidence > 0.8
    
    def test_detect_flow(self):
        """Test flow state detection."""
        engine = PedagogicalRuleEngine()
        
        telemetry = {
            "first_attempt_correct": True,
            "time_to_solution_seconds": 25
        }
        
        decision = engine.evaluate(telemetry)
        
        assert decision.recommended_action == "increase_difficulty"
        assert decision.scaffolding_level == ScaffoldingLevel.MINIMAL
        assert decision.confidence > 0.85
    
    def test_detect_confusion(self):
        """Test confusion detection from circular pathing."""
        engine = PedagogicalRuleEngine()
        
        telemetry = {
            "pathing_circularity": 0.8
        }
        
        decision = engine.evaluate(telemetry)
        
        assert decision.recommended_action == "provide_conceptual_hint"
        assert decision.scaffolding_level == ScaffoldingLevel.MODERATE
    
    def test_no_rules_fired(self):
        """Test default behavior when no rules match."""
        engine = PedagogicalRuleEngine()
        
        telemetry = {
            "some_random_metric": 42
        }
        
        decision = engine.evaluate(telemetry)
        
        assert decision.recommended_action == "continue_current_approach"
        assert len(decision.fired_rules) == 0
        assert decision.confidence == 0.5


class TestNeuralSymbolicKnowledgeTracer:
    """Test knowledge tracing."""
    
    def test_estimate_mastery_no_history(self):
        """Test mastery estimation with no history."""
        tracer = NeuralSymbolicKnowledgeTracer()
        
        estimate = tracer.estimate_mastery(
            student_id="student_123",
            competency="MATH.G4.FRACTIONS",
            interaction_history=[],
            telemetry={}
        )
        
        assert estimate.mastery_score == 0.5  # Default
        assert estimate.confidence < 0.5  # Low confidence with no data
    
    def test_estimate_mastery_with_history(self):
        """Test mastery estimation with interaction history."""
        tracer = NeuralSymbolicKnowledgeTracer()
        
        interaction_history = [
            {"correct": True, "time_seconds": 25, "attempt_count": 1},
            {"correct": True, "time_seconds": 20, "attempt_count": 1},
            {"correct": True, "time_seconds": 18, "attempt_count": 1}
        ]
        
        telemetry = {
            "erasure_count": 0
        }
        
        estimate = tracer.estimate_mastery(
            student_id="student_123",
            competency="MATH.G4.FRACTIONS",
            interaction_history=interaction_history,
            telemetry=telemetry
        )
        
        assert estimate.mastery_score > 0.7  # High mastery
        assert estimate.confidence > 0.6  # Moderate confidence
        assert len(estimate.evidence) > 0
    
    def test_mastery_trend_improving(self):
        """Test trend detection for improving mastery."""
        tracer = NeuralSymbolicKnowledgeTracer()
        
        # Simulate improving performance
        for i, score in enumerate([0.4, 0.6, 0.8]):
            interaction_history = [
                {"correct": True, "time_seconds": 30, "attempt_count": 1}
            ] * int(score * 10)
            
            tracer.estimate_mastery(
                student_id="student_123",
                competency="MATH.G4.FRACTIONS",
                interaction_history=interaction_history,
                telemetry={}
            )
        
        trend = tracer.get_mastery_trend("student_123", "MATH.G4.FRACTIONS")
        assert trend == "improving"


class TestMisconceptionDetector:
    """Test misconception detection."""
    
    def test_detect_fraction_misconception(self):
        """Test detection of fraction numerator/denominator confusion."""
        detector = MisconceptionDetector()
        
        telemetry = {
            "error_pattern": "inverted_fraction"
        }
        
        interaction_history = [
            {"correct": False, "error_type": "inverted_fraction"},
            {"correct": False, "error_type": "inverted_fraction"}
        ]
        
        misconceptions = detector.detect(
            competency="MATH.FRACTIONS",
            interaction_history=interaction_history,
            telemetry=telemetry
        )
        
        assert len(misconceptions) > 0
        assert any(
            "numerator" in m.description.lower()
            for m in misconceptions
        )
        assert all(m.confidence > 0.6 for m in misconceptions)
    
    def test_no_misconceptions_detected(self):
        """Test when no misconceptions are detected."""
        detector = MisconceptionDetector()
        
        telemetry = {}
        interaction_history = []
        
        misconceptions = detector.detect(
            competency="MATH.FRACTIONS",
            interaction_history=interaction_history,
            telemetry=telemetry
        )
        
        assert len(misconceptions) == 0
    
    def test_get_remediation_strategy(self):
        """Test remediation strategy generation."""
        detector = MisconceptionDetector()
        
        telemetry = {
            "error_pattern": "inverted_fraction"
        }
        
        interaction_history = [
            {"correct": False, "error_type": "inverted_fraction"}
        ]
        
        misconceptions = detector.detect(
            competency="MATH.FRACTIONS",
            interaction_history=interaction_history,
            telemetry=telemetry
        )
        
        if misconceptions:
            strategy = detector.get_remediation_strategy(misconceptions[0])
            
            assert "strategy" in strategy
            assert "recommended_activities" in strategy
            assert "teacher_guidance" in strategy
            assert len(strategy["recommended_activities"]) > 0


@pytest.mark.asyncio
class TestIntegratedTutoring:
    """Test integrated tutoring with neuro-symbolic reasoning."""
    
    async def test_tutoring_with_telemetry(self):
        """Test tutoring agent with telemetry data."""
        from syncsenta_agents.agents.tutoring import TutoringAgent
        
        agent = TutoringAgent()
        
        context = {
            "grade": "Grade 4",
            "subject": "Mathematics",
            "student_id": "student_123",
            "competency": "MATH.G4.FRACTIONS",
            "telemetry": {
                "erasure_count": 4,
                "dwell_time_seconds": 65,
                "attempt_count": 3
            },
            "interaction_history": [
                {"correct": False, "time_seconds": 45, "attempt_count": 2},
                {"correct": False, "time_seconds": 50, "attempt_count": 3}
            ]
        }
        
        result = await agent.execute_task(
            "How do I add 1/2 + 1/4?",
            context
        )
        
        # Check that neuro-symbolic metadata is included
        assert "fired_rules" in result
        assert "recommended_action" in result
        assert "scaffolding_level" in result
        assert "mastery_score" in result
        assert "detected_misconceptions" in result
        
        # Should detect frustration
        assert result["scaffolding_level"] == "substantial"
        
        # Should have explanation
        assert "explanation" in result
        assert len(result["explanation"]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
