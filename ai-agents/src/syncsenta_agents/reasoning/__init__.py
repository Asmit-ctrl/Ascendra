"""Neuro-Symbolic Reasoning Engine for Pedagogical Intelligence.

Combines neural LLM predictions with symbolic rule-based reasoning
for explainable, trustworthy adaptive learning.
"""

from .pedagogical_rules import PedagogicalRuleEngine
from .knowledge_tracer import NeuralSymbolicKnowledgeTracer
from .misconception_detector import MisconceptionDetector

__all__ = [
    "PedagogicalRuleEngine",
    "NeuralSymbolicKnowledgeTracer",
    "MisconceptionDetector",
]
