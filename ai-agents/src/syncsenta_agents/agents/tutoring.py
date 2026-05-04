"""Tutoring Agent — handles subject-specific student questions and explanations.

Uses the same swappable LLMProvider abstraction as AssessmentAgent so it can
run with Ollama in dev/prod and a deterministic stub in offline demo mode.
"""

from __future__ import annotations

from typing import Any, Dict, Optional, Protocol
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from ..core.exceptions import AgentError
from ..core.logging import AgentLogger


class LLMProvider(Protocol):
    async def generate(self, prompt: str, *, system: str | None = None) -> str: ...


class _OllamaProvider:
    def __init__(self) -> None:
        import os
        
        # Hardcoded to use Groq (free, no local GPU needed)
        from langchain_groq import ChatGroq
        self._llm = ChatGroq(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0.4,
        )
        self._use_groq = True

    async def generate(self, prompt: str, *, system: str | None = None) -> str:
        import asyncio

        if self._use_groq:
            # Groq uses messages format
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})
            response = await asyncio.to_thread(self._llm.invoke, messages)
            return response.content if hasattr(response, 'content') else str(response)
        else:
            # Ollama uses simple string
            full = f"[SYSTEM]\n{system}\n\n[USER]\n{prompt}" if system else prompt
            return await asyncio.to_thread(self._llm.invoke, full)


_SYSTEM_PROMPT = (
    "You are SyncSenta's Tutoring Agent for Kenyan CBC students. "
    "Explain concepts clearly at the student's grade level using local context "
    "(Kenyan names, shillings, ugali, matatu, etc.). Be warm, concise, and "
    "Socratic — when a student is stuck, lead them to the answer with one "
    "guiding question rather than dumping the full solution. Plain prose only, "
    "no markdown fences, no JSON."
)


class TutoringAgent:
    """Subject-specific tutoring. Public surface matches the orchestrator contract."""

    def __init__(self, llm_provider: Optional[LLMProvider] = None) -> None:
        self.logger = AgentLogger("tutoring_agent")
        self._llm = llm_provider

    def _provider(self) -> LLMProvider:
        if self._llm is None:
            import os

            if os.environ.get("SYNCSENTA_OFFLINE_DEMO") == "1":
                from ..api.demo_stub import DemoStubLLM

                self._llm = DemoStubLLM()
            else:
                self._llm = _OllamaProvider()
        return self._llm

    async def execute_task(self, request: str, context: Dict[str, Any]) -> Dict[str, Any]:
        try:
            grade = (context or {}).get("grade") or "Grade 4"
            subject = (context or {}).get("subject") or "general"
            language = (context or {}).get("language", "english")

            prompt = (
                f"Student grade: {grade}\n"
                f"Subject: {subject}\n"
                f"Preferred language: {language}\n\n"
                f"Student question: {request}\n\n"
                "Give a 3-6 sentence answer that explains the concept and, if "
                "the question is computational, walks through the steps."
            )
            answer = await self._provider().generate(prompt, system=_SYSTEM_PROMPT)
            return {
                "agent": "tutoring",
                "response": (answer or "").strip(),
                "subject": subject,
                "grade": grade,
            }
        except AgentError:
            raise
        except Exception as exc:  # noqa: BLE001
            self.logger.error("Tutoring task failed", error=str(exc))
            raise AgentError(f"Tutoring failure: {exc}") from exc
