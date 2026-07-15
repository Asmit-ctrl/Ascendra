"""Future-ready specialist agents for SyncSenta.

These agents expand SyncSenta beyond tutoring and assessment into a world-class
learning ecosystem for diverse learners, cultures, and future-ready skills.
"""

from __future__ import annotations

from typing import Any, Dict, Optional, List

from ..core.logging import AgentLogger
from ..inference.groq_client import GroqClient
from ..core.exceptions import AgentError


class BaseFutureAgent:
    """Base class for specialist agents that can generate responses via Groq."""

    def __init__(
        self,
        agent_name: str,
        groq_client: Optional[GroqClient] = None,
        default_model: str = "llama-3.3-70b-versatile",
    ) -> None:
        self.logger = AgentLogger(agent_name)
        self.agent_name = agent_name
        self.default_model = default_model
        self.groq_client = groq_client
        if self.groq_client is None:
            try:
                self.groq_client = GroqClient()
            except Exception as exc:  # pragma: no cover
                self.logger.warning("Groq client unavailable", error=str(exc))
                self.groq_client = None

    async def _generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.35,
        max_tokens: int = 1024,
    ) -> str:
        if not self.groq_client:
            self.logger.warning("Falling back to stub response because Groq is unavailable")
            return "I am ready to help, but the AI runtime is not currently available."

        try:
            result = await self.groq_client.generate(
                model=self.default_model,
                prompt=prompt,
                system=system,
                options={
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "top_p": 0.9,
                },
            )
            return result.response.strip() if hasattr(result, "response") else str(result).strip()
        except Exception as exc:
            self.logger.error("LLM generation failed", error=str(exc))
            return "I am having trouble generating that answer right now. Please try again."

    def _safe_context(self, context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        return dict(context or {})


class CulturalLocalizationAgent(BaseFutureAgent):
    """Adapts content and learning experiences to local culture and language."""

    def __init__(self, groq_client: Optional[GroqClient] = None) -> None:
        super().__init__("cultural_localization", groq_client)

    async def execute_task(self, request: str, context: Dict[str, Any]) -> Dict[str, Any]:
        ctx = self._safe_context(context)
        region = ctx.get("region") or ctx.get("locale") or "Kenya"
        target_language = ctx.get("language") or "english"

        prompt = (
            f"Adapt the following learning content for {region} learners while keeping "
            f"it culturally relevant, respectful, and age-appropriate. Use local examples, "
            f"names, and values that fit {region}. Output a clear, concise adaptation.\n\n"
            f"Original request: {request}\n"
            f"Target language: {target_language}\n"
            f"Region: {region}\n"
            f"Keep the content inclusive and appropriate for diverse learners."
        )

        response = await self._generate(prompt, system="You are a cultural localization expert for education.")
        return {
            "agent": "cultural_localization",
            "response": response,
            "region": region,
            "language": target_language,
        }


class EquityInclusionAgent(BaseFutureAgent):
    """Ensures learning content is accessible, inclusive, and bias-aware."""

    def __init__(self, groq_client: Optional[GroqClient] = None) -> None:
        super().__init__("equity_inclusion", groq_client)

    async def execute_task(self, request: str, context: Dict[str, Any]) -> Dict[str, Any]:
        ctx = self._safe_context(context)
        audience = ctx.get("audience") or "diverse learners"

        prompt = (
            f"Review the following educational request or guidance and make it more inclusive, "
            f"accessible, and equitable for {audience}. Remove any biased phrasing, add support for "
            "learners with different backgrounds, and suggest how to make it usable for learners with "
            "varying abilities and gender identities.\n\n"
            f"Request: {request}\n"
        )

        response = await self._generate(prompt, system="You are an equity and inclusion expert for education.")
        return {
            "agent": "equity_inclusion",
            "response": response,
            "audience": audience,
        }


class PersonaMotivationAgent(BaseFutureAgent):
    """Builds learner persona and motivation pathways for aspirational students."""

    def __init__(self, groq_client: Optional[GroqClient] = None) -> None:
        super().__init__("persona_motivation", groq_client)

    async def execute_task(self, request: str, context: Dict[str, Any]) -> Dict[str, Any]:
        ctx = self._safe_context(context)
        aspiration = ctx.get("aspiration") or "future leader"
        role_model = ctx.get("role_model") or "a high-impact learner"
        origin = ctx.get("origin") or "their community"

        prompt = (
            f"Create a personalized learner motivation plan for a student who wants to become {aspiration}. "
            f"Use the student profile: {origin}, role model {role_model}, and current request: {request}. "
            "Focus on confidence, aspirational goals, daily habits, and the kinds of learning tasks that will "
            "help them grow into a future-ready learner."
        )

        response = await self._generate(prompt, system="You are a learner motivation and persona coach.")
        return {
            "agent": "persona_motivation",
            "response": response,
            "aspiration": aspiration,
            "role_model": role_model,
        }


class MasteryAgent(BaseFutureAgent):
    """Plans long-term competency and mastery progression."""

    def __init__(self, groq_client: Optional[GroqClient] = None) -> None:
        super().__init__("mastery", groq_client)

    async def execute_task(self, request: str, context: Dict[str, Any]) -> Dict[str, Any]:
        ctx = self._safe_context(context)
        competency = ctx.get("competency") or "general learning"
        grade = ctx.get("grade") or "Grade 4"

        prompt = (
            f"Design a long-term mastery roadmap for {grade} learners working on {competency}. "
            f"Include spaced repetition, formative checks, confidence-building activities, and key milestones. "
            f"If the request is a single topic or exam goal, connect it to the broader subject progression.\n\n"
            f"Request: {request}\n"
        )

        response = await self._generate(prompt, system="You are a mastery planning expert for education.")
        return {
            "agent": "mastery",
            "response": response,
            "competency": competency,
            "grade": grade,
        }


class CreativityInnovationAgent(BaseFutureAgent):
    """Creates creative projects and innovation challenges for future skills."""

    def __init__(self, groq_client: Optional[GroqClient] = None) -> None:
        super().__init__("creativity_innovation", groq_client)

    async def execute_task(self, request: str, context: Dict[str, Any]) -> Dict[str, Any]:
        ctx = self._safe_context(context)
        domain = ctx.get("domain") or "STEAM"
        audience = ctx.get("audience") or "students"

        prompt = (
            f"Generate a creative learning challenge or project for {audience} in the domain of {domain}. "
            f"The activity should promote innovation, problem solving, collaboration, and portfolio-ready output. "
            f"Include a clear objective, steps, materials, and a way to assess success.\n\n"
            f"Request: {request}\n"
        )

        response = await self._generate(prompt, system="You are a creativity and innovation education designer.")
        return {
            "agent": "creativity_innovation",
            "response": response,
            "domain": domain,
        }


class SELAgent(BaseFutureAgent):
    """Supports social-emotional learning, resilience, and mindset coaching."""

    def __init__(self, groq_client: Optional[GroqClient] = None) -> None:
        super().__init__("sel", groq_client)

    async def execute_task(self, request: str, context: Dict[str, Any]) -> Dict[str, Any]:
        ctx = self._safe_context(context)
        focus = ctx.get("focus") or "confidence"
        situation = ctx.get("situation") or request

        prompt = (
            f"Provide a social-emotional learning coach response for a learner concerned about {focus}. "
            f"Use the situation: {situation}. Give practical reflection prompts, mindset advice, and a supportive tone."
        )

        response = await self._generate(prompt, system="You are a supportive social-emotional learning coach.")
        return {
            "agent": "sel",
            "response": response,
            "focus": focus,
        }


class RealWorldProblemSolverAgent(BaseFutureAgent):
    """Connects learning to real-world local and global challenges."""

    def __init__(self, groq_client: Optional[GroqClient] = None) -> None:
        super().__init__("real_world_problem_solver", groq_client)

    async def execute_task(self, request: str, context: Dict[str, Any]) -> Dict[str, Any]:
        ctx = self._safe_context(context)
        location = ctx.get("location") or ctx.get("region") or "local community"
        issue = ctx.get("issue") or "a community challenge"

        prompt = (
            f"Translate the following learning request into a real-world problem-solving activity that is relevant to {location}. "
            f"Focus on practical impact, local context, and future-ready skills. Use the issue: {issue}.\n\n"
            f"Request: {request}\n"
        )

        response = await self._generate(prompt, system="You are a real-world problem solver designer for education.")
        return {
            "agent": "real_world_problem_solver",
            "response": response,
            "location": location,
            "issue": issue,
        }


class TeacherSupportAgent(BaseFutureAgent):
    """Supports teachers with lesson feedback, adaptation, and coaching."""

    def __init__(self, groq_client: Optional[GroqClient] = None) -> None:
        super().__init__("teacher_support", groq_client)

    async def execute_task(self, request: str, context: Dict[str, Any]) -> Dict[str, Any]:
        ctx = self._safe_context(context)
        teacher_type = ctx.get("teacher_type") or "classroom teacher"
        goal = ctx.get("goal") or "improve lesson delivery"

        prompt = (
            f"As a teacher coach, give actionable feedback and adaptation ideas to help a {teacher_type} "
            f"meet the goal: {goal}. Use the following lesson or student situation: {request}. "
            "Offer differentiation, classroom strategies, and measurable teacher steps."
        )

        response = await self._generate(prompt, system="You are a teacher support and pedagogy coach.")
        return {
            "agent": "teacher_support",
            "response": response,
            "goal": goal,
        }


class CredentialVerificationAgent(BaseFutureAgent):
    """Generates verifiable credential guidance, certification pathways, and documentation."""

    def __init__(self, groq_client: Optional[GroqClient] = None) -> None:
        super().__init__("credential_verification", groq_client)

    async def execute_task(self, request: str, context: Dict[str, Any]) -> Dict[str, Any]:
        ctx = self._safe_context(context)
        credential_type = ctx.get("credential_type") or "learning achievement"
        standard = ctx.get("standard") or "trusted evidence"

        prompt = (
            f"Explain how a learner can capture and verify their achievement in the form of a {credential_type}. "
            f"Recommend documentation, evidence, and validation steps that can be used across schools, communities, and digital platforms. "
            f"Use the standard: {standard}.\n\n"
            f"Request: {request}\n"
        )

        response = await self._generate(prompt, system="You are a credential and verification expert.")
        return {
            "agent": "credential_verification",
            "response": response,
            "credential_type": credential_type,
        }


class CoordinatorAgent(BaseFutureAgent):
    """Coordinates multiple agents to produce a combined learning strategy."""

    def __init__(self, groq_client: Optional[GroqClient] = None) -> None:
        super().__init__("coordinator", groq_client)

    async def execute_task(self, request: str, context: Dict[str, Any]) -> Dict[str, Any]:
        ctx = self._safe_context(context)
        agents = ctx.get("agents") or [
            "socratic_tutor",
            "cbc_curriculum",
            "lesson_architect",
            "assessment",
            "school_intelligence",
            "career_pathways",
        ]

        prompt = (
            f"You are a learning coordination agent. The user request is: {request}. "
            f"The available agents are: {', '.join(agents)}. "
            "Propose which agents should collaborate, what each agent should focus on, and how to combine their outputs into a single learner-friendly plan. "
            "Keep the recommendation practical and aligned to the learner's goals."
        )

        response = await self._generate(prompt, system="You are a multi-agent coordinator for education.")
        return {
            "agent": "coordinator",
            "response": response,
            "agents": agents,
        }
