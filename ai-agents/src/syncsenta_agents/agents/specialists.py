"""Specialist agent wrappers for SyncSenta orchestrator.

These wrappers adapt existing agents into the orchestrator's specialist
slots: CBC curriculum, school intelligence, and career pathways.
"""

from __future__ import annotations

from typing import Any, Dict, Optional, List

from ..core.logging import AgentLogger
from .analysis import AnalysisAgent
from .lesson_architect import LessonArchitectAgent
from .telemetry import TelemetryAgent
from .tutoring import TutoringAgent


class CurriculumAgent:
    """Adapter that exposes lesson architect capabilities as CBC curriculum."""

    def __init__(self, supabase_client: Optional[Any] = None) -> None:
        self.logger = AgentLogger("cbc_curriculum_agent")
        self.lesson_architect = LessonArchitectAgent(supabase_client=supabase_client)

    async def execute_task(self, request: str, context: Dict[str, Any]) -> Dict[str, Any]:
        try:
            action = context.get("action") or self._infer_action(request)
            context = dict(context or {})
            context["action"] = action
            response = await self.lesson_architect.execute_task(request, context)
            if isinstance(response, dict):
                response["agent"] = "cbc_curriculum"
            return response
        except Exception as exc:
            self.logger.error("CBC Curriculum task failed", error=str(exc))
            return {
                "agent": "cbc_curriculum",
                "response": (
                    "CBC Curriculum agent is initializing. "
                    "Please provide a curriculum question or lesson-planning request."
                )
            }

    @staticmethod
    def _infer_action(request: str) -> str:
        text = (request or "").lower()
        if any(k in text for k in ("lesson plan", "scheme of work", "worksheet", "term", "week")):
            return "generate_scheme"
        return "generate_scheme"


class SchoolIntelligenceAgent:
    """School intelligence agent wrapper for analytics and insights."""

    def __init__(self, supabase_client: Optional[Any] = None) -> None:
        self.logger = AgentLogger("school_intelligence_agent")
        self.analysis_agent = AnalysisAgent()
        self.telemetry_agent = TelemetryAgent()
        self.supabase_client = supabase_client

    async def execute_task(self, request: str, context: Dict[str, Any]) -> Dict[str, Any]:
        telemetry_events = context.get("telemetry_events") or context.get("telemetry") or []
        if isinstance(telemetry_events, list) and telemetry_events:
            session_id = context.get("session_id") or "unknown_session"
            student_id = context.get("student_id") or context.get("user_id") or "unknown_student"
            activity_type = context.get("activity_type") or "learning"
            try:
                profile = await self.telemetry_agent.process_events(
                    events=telemetry_events,
                    session_id=session_id,
                    student_id=student_id,
                    activity_type=activity_type,
                )
                misconceptions = await self.analysis_agent.analyze_misconceptions(
                    behavioral_profile=profile,
                    competency=context.get("competency", "general"),
                    activity_data=context.get("activity_data"),
                )
                summary = (
                    f"School Intelligence: analyzed {len(telemetry_events)} events and "
                    f"identified {len(misconceptions)} misconceptions."
                )
                return {
                    "agent": "school_intelligence",
                    "response": summary,
                    "misconceptions": [m.to_dict() for m in misconceptions],
                    "profile": profile.to_dict(),
                }
            except Exception as exc:
                self.logger.error("School intelligence analysis failed", error=str(exc))
                return {
                    "agent": "school_intelligence",
                    "response": (
                        "School Intelligence analysis is currently unavailable. "
                        "Please provide valid telemetry data or try again later."
                    ),
                }

        return {
            "agent": "school_intelligence",
            "response": (
                "School Intelligence agent is ready to analyze student performance, "
                "but it needs telemetry or summary data in the request context. "
                "Please include telemetry_events or analysis data."
            ),
        }


class CareerPathwaysAgent:
    """Career pathways agent wrapper for guidance and pathway suggestions."""

    def __init__(self, supabase_client: Optional[Any] = None) -> None:
        self.logger = AgentLogger("career_pathways_agent")
        self.tutoring_agent = TutoringAgent(supabase_client=supabase_client)

    async def execute_task(self, request: str, context: Dict[str, Any]) -> Dict[str, Any]:
        try:
            context = dict(context or {})
            context["career_pathways"] = True
            response = await self.tutoring_agent.execute_task(request, context)
            if isinstance(response, dict):
                response["agent"] = "career_pathways"
            return response
        except Exception as exc:
            self.logger.error("Career pathways task failed", error=str(exc))
            return {
                "agent": "career_pathways",
                "response": (
                    "Career Pathways agent is starting up. "
                    "Please ask a career guidance or pathway question."
                ),
            }
