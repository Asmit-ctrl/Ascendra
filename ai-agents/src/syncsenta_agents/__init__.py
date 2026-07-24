"""
SyncSenta AI Agents - Production-ready educational AI system for Kenya's CBC curriculum.

This package provides a complete AI agent ecosystem using:
- LangGraph orchestration for Agent 7 (The Maestro)
- CrewAI framework for Agents 1-6 (Specialized Workers)
- Ollama edge inference on Raspberry Pi nodes
- Stellar blockchain for immutable grade verification
- Offline-first architecture with PouchDB + CouchDB sync
"""

__version__ = "0.1.0"
__author__ = "SyncSenta Team"
__email__ = "team@syncsenta.ke"

from .core.config import AgentConfig
from .agents.registry import AgentRegistry

__all__ = [
    "AgentConfig",
    "SyncSentaOrchestrator", 
    "AgentRegistry",
]


def __getattr__(name: str):
    """Load the optional LangGraph orchestrator only when it is requested.

    The Lesson Architect API does not depend on LangGraph. Deferring this
    import lets the teacher scheme service start in constrained local Windows
    environments where optional binary telemetry dependencies are blocked.
    """
    if name == "SyncSentaOrchestrator":
        from .orchestrator.main import SyncSentaOrchestrator

        return SyncSentaOrchestrator
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
