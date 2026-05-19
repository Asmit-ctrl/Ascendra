"""Lesson Architect Agent - Generates CBC-compliant schemes of work and lesson plans.

Ported from scheme-scribe-ai with full KICD curriculum integration.
Uses the curriculum data ported in PR 1 to generate culturally relevant,
standards-aligned educational content.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Protocol
from enum import Enum

from ..core.exceptions import AgentError
from ..core.logging import AgentLogger
from ..curriculum import (
    get_hardcoded_strands,
    get_lessons_per_week,
    get_sub_strands_for_strand,
    CURRICULUM_REGISTRY,
)
from ..curriculum.term_mappings import get_term_allocation


class LLMProvider(Protocol):
    async def generate(self, prompt: str, *, system: str | None = None) -> str: ...


class _GroqProvider:
    def __init__(self) -> None:
        import os
        from langchain_groq import ChatGroq
        
        self._llm = ChatGroq(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0.3,  # Lower temp for more consistent curriculum content
        )

    async def generate(self, prompt: str, *, system: str | None = None) -> str:
        import asyncio
        
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        response = await asyncio.to_thread(self._llm.invoke, messages)
        return response.content if hasattr(response, 'content') else str(response)


class SchemeMode(str, Enum):
    """Scheme generation modes."""
    STANDARD = "standard"  # Full term scheme
    WEEKLY = "weekly"  # Week-by-week breakdown
    TERM = "term"  # Term overview
    MADA = "mada"  # Kiswahili Mada cycle (3-week units)


_SYSTEM_PROMPT = """You are SyncSenta's Lesson Architect Agent for Kenyan CBC curriculum.

Your role is to generate KICD-compliant schemes of work and lesson plans that:
- Align with official CBC learning outcomes
- Use Kenyan cultural context (matatu, shamba, M-Pesa, ugali, etc.)
- Enforce KSA balance (Knowledge, Skills, Attitudes)
- Use action verbs (calculate, demonstrate, analyze) NOT weak verbs (know, understand)
- Follow CBC competency framework (communication, critical thinking, creativity, etc.)
- Are practical and ready-to-use for Kenyan teachers

Always respond with valid JSON when requested. No markdown fences, no extra prose."""


class LessonArchitectAgent:
    """Generates CBC-compliant schemes of work and lesson plans.
    
    Features:
    - Scheme generation (standard, weekly, term, Mada cycle)
    - Lesson plan generation using schemes as guardrails
    - KICD curriculum alignment
    - Cultural relevance enforcement
    - KSA balance validation
    """

    def __init__(self, llm_provider: Optional[LLMProvider] = None, supabase_client=None) -> None:
        self.logger = AgentLogger("lesson_architect_agent")
        self._llm = llm_provider
        self.supabase = supabase_client
        
        # Banned weak verbs (KICD CBC standards)
        self.banned_verbs = {
            "know", "understand", "learn", "appreciate", "be aware of",
            "realize", "recognize", "comprehend", "grasp"
        }
        
        # Approved action verbs
        self.action_verbs = {
            "calculate", "demonstrate", "analyze", "create", "evaluate",
            "apply", "solve", "construct", "design", "investigate",
            "compare", "classify", "measure", "explain", "describe"
        }

    def _provider(self) -> LLMProvider:
        if self._llm is None:
            import os
            if os.environ.get("SYNCSENTA_OFFLINE_DEMO") == "1":
                from ..api.demo_stub import DemoStubLLM
                self._llm = DemoStubLLM()
            else:
                self._llm = _GroqProvider()
        return self._llm

    async def execute_task(self, request: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Main entry point for orchestrator."""
        try:
            action = (context or {}).get("action") or self._infer_action(request)
            
            # Normalize grade format (handle "grade-4" or "Grade 4")
            grade = context.get("grade", "Grade 4")
            if grade and not grade.startswith("Grade"):
                # Convert "grade-4" to "Grade 4"
                grade = grade.replace("grade-", "Grade ").replace("-", " ").title()
            
            # Normalize subject format
            subject = context.get("subject", "Mathematics")
            if subject:
                subject = subject.replace("-", " ").title()
            
            if action == "generate_scheme":
                return await self.generate_scheme(
                    grade=grade,
                    subject=subject,
                    term=context.get("term", "Term 1"),
                    mode=context.get("mode", SchemeMode.STANDARD),
                    teacher_id=context.get("teacher_id", "unknown"),
                    language=context.get("language", "english"),
                )
            
            elif action == "generate_lesson_plan":
                return await self.generate_lesson_plan(
                    scheme_id=context.get("scheme_id"),
                    week=context.get("week", 1),
                    lesson=context.get("lesson", 1),
                    teacher_id=context.get("teacher_id", "unknown"),
                    language=context.get("language", "english"),
                )
            
            elif action == "list_schemes":
                return await self.list_schemes(
                    teacher_id=context.get("teacher_id", "unknown"),
                    grade=context.get("grade"),
                    subject=context.get("subject"),
                )
            
            else:
                raise AgentError(f"Unsupported action: {action}")
                
        except AgentError:
            raise
        except Exception as exc:
            self.logger.error("Lesson architect task failed", error=str(exc))
            raise AgentError(f"Lesson architect failure: {exc}") from exc

    @staticmethod
    def _infer_action(request: str) -> str:
        """Infer action from request text."""
        text = request.lower()
        if any(k in text for k in ("lesson plan", "plan for lesson", "lesson for")):
            return "generate_lesson_plan"
        if any(k in text for k in ("list", "show", "my schemes")):
            return "list_schemes"
        return "generate_scheme"

    async def generate_scheme(
        self,
        *,
        grade: str,
        subject: str,
        term: str,
        mode: SchemeMode = SchemeMode.STANDARD,
        teacher_id: str,
        language: str = "english",
    ) -> Dict[str, Any]:
        """Generate a scheme of work."""
        try:
            self.logger.info(
                "Generating scheme",
                grade=grade,
                subject=subject,
                term=term,
                mode=mode
            )
            
            # Validate curriculum exists
            curriculum_key = f"{grade}|{subject}"
            if curriculum_key not in CURRICULUM_REGISTRY:
                # Try alternative formats
                alt_keys = [
                    f"{grade}|{subject}",
                    f"Grade {grade.split()[-1]}|{subject}",  # "Grade 4" from "grade-4"
                    f"{grade.replace('Grade ', 'Grade')}|{subject}",
                ]
                
                found_key = None
                for key in alt_keys:
                    if key in CURRICULUM_REGISTRY:
                        found_key = key
                        curriculum_key = key
                        break
                
                if not found_key:
                    available = list(CURRICULUM_REGISTRY.keys())[:10]
                    raise AgentError(
                        f"No curriculum data for '{grade}' '{subject}'. "
                        f"Available (sample): {available}. "
                        f"Tried keys: {alt_keys}"
                    )
            
            # Get curriculum data
            strands = get_hardcoded_strands(grade, subject)
            if not strands:
                raise AgentError(f"No strands found for {grade} {subject}")
            
            lessons_per_week = get_lessons_per_week(grade, subject)
            
            # Get term allocation
            term_allocation = get_term_allocation(grade, subject, term)
            if not term_allocation:
                raise AgentError(f"No term allocation for {grade} {subject} {term}")
            
            # Generate scheme rows
            scheme_rows = await self._generate_scheme_rows(
                grade=grade,
                subject=subject,
                term=term,
                strands=strands,
                term_allocation=term_allocation,
                lessons_per_week=lessons_per_week,
                mode=mode,
                language=language,
            )
            
            # Create scheme metadata
            scheme_id = f"scheme_{uuid.uuid4().hex[:12]}"
            scheme = {
                "scheme_id": scheme_id,
                "title": f"{grade} {subject} - {term}",
                "grade": grade,
                "subject": subject,
                "term": term,
                "mode": mode,
                "teacher_id": teacher_id,
                "language": language,
                "created_at": datetime.now().isoformat(),
                "total_weeks": len(scheme_rows),
                "lessons_per_week": lessons_per_week,
                "rows": scheme_rows,
            }
            
            # Save to database if Supabase client available
            if self.supabase:
                await self._save_scheme(scheme)
            
            self.logger.info(
                "Scheme generated",
                scheme_id=scheme_id,
                weeks=len(scheme_rows)
            )
            
            return {
                "agent": "lesson_architect",
                "action": "generate_scheme",
                "response": f"Generated {len(scheme_rows)}-week scheme for {grade} {subject} {term}",
                "scheme": scheme,
            }
            
        except Exception as exc:
            self.logger.error("Scheme generation failed", error=str(exc))
            raise AgentError(f"Scheme generation failed: {exc}") from exc

    async def _generate_scheme_rows(
        self,
        *,
        grade: str,
        subject: str,
        term: str,
        strands: List[Dict[str, Any]],
        term_allocation: List[str],
        lessons_per_week: int,
        mode: SchemeMode,
        language: str,
    ) -> List[Dict[str, Any]]:
        """Generate individual scheme rows (week-by-week breakdown)."""
        rows = []
        week_num = 1
        
        # For each strand allocated to this term
        for strand_name in term_allocation:
            # Get sub-strands for this strand
            sub_strands = get_sub_strands_for_strand(grade, subject, strand_name)
            if not sub_strands:
                self.logger.warning(f"No sub-strands for {strand_name}")
                continue
            
            # Generate rows for each sub-strand
            for sub_strand in sub_strands:
                # Generate content for this week
                row = await self._generate_week_content(
                    week=week_num,
                    grade=grade,
                    subject=subject,
                    strand=strand_name,
                    sub_strand=sub_strand,
                    lessons_per_week=lessons_per_week,
                    language=language,
                )
                
                rows.append(row)
                week_num += 1
                
                # Stop at 11-13 weeks (typical term length)
                if week_num > 13:
                    break
            
            if week_num > 13:
                break
        
        return rows

    async def _generate_week_content(
        self,
        *,
        week: int,
        grade: str,
        subject: str,
        strand: str,
        sub_strand: Dict[str, Any],
        lessons_per_week: int,
        language: str,
    ) -> Dict[str, Any]:
        """Generate content for a single week."""
        sub_strand_name = sub_strand.get("name", "")
        learning_outcomes = sub_strand.get("learningOutcomes", [])
        
        # Build prompt for LLM
        prompt = f"""Generate CBC-compliant scheme of work content for one week.

Grade: {grade}
Subject: {subject}
Week: {week}
Strand: {strand}
Sub-Strand: {sub_strand_name}
Lessons this week: {lessons_per_week}
Language: {language}

Official Learning Outcomes (KICD):
{json.dumps(learning_outcomes, indent=2)}

Generate content with:
1. Specific Learning Outcomes (SLOs) - 2-3 outcomes using ACTION VERBS
2. Key Inquiry Questions (KIQs) - 2-3 thought-provoking questions
3. Learning Experiences - {lessons_per_week} activities (one per lesson)
4. Resources - Materials needed (use Kenyan context)
5. Assessment - How to check understanding
6. Reflection - Teacher reflection prompt

CRITICAL RULES:
- Use ONLY action verbs: {', '.join(list(self.action_verbs)[:10])}
- NEVER use weak verbs: {', '.join(list(self.banned_verbs)[:5])}
- Use Kenyan examples: matatu, shamba, M-Pesa, ugali, shillings, etc.
- Align with KICD learning outcomes provided above
- Make activities practical and culturally relevant

Return STRICT JSON:
{{
  "week": {week},
  "strand": "{strand}",
  "sub_strand": "{sub_strand_name}",
  "specific_learning_outcomes": ["SLO 1", "SLO 2", "SLO 3"],
  "key_inquiry_questions": ["KIQ 1", "KIQ 2", "KIQ 3"],
  "learning_experiences": ["Activity 1", "Activity 2", ...],
  "resources": ["Resource 1", "Resource 2", ...],
  "assessment": "Assessment strategy",
  "reflection": "Reflection prompt"
}}
"""
        
        # Generate with LLM
        raw = await self._provider().generate(prompt, system=_SYSTEM_PROMPT)
        
        # Parse JSON
        try:
            data = json.loads(raw.strip())
        except json.JSONDecodeError:
            # Try to extract JSON from response
            import re
            match = re.search(r'\{.*\}', raw, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
            else:
                raise AgentError("LLM did not return valid JSON")
        
        # Validate and enforce rules
        data = self._validate_week_content(data, week, strand, sub_strand_name)
        
        return data

    def _validate_week_content(
        self,
        data: Dict[str, Any],
        week: int,
        strand: str,
        sub_strand: str,
    ) -> Dict[str, Any]:
        """Validate and enforce CBC rules on generated content."""
        # Ensure required fields
        data.setdefault("week", week)
        data.setdefault("strand", strand)
        data.setdefault("sub_strand", sub_strand)
        data.setdefault("specific_learning_outcomes", [])
        data.setdefault("key_inquiry_questions", [])
        data.setdefault("learning_experiences", [])
        data.setdefault("resources", [])
        data.setdefault("assessment", "")
        data.setdefault("reflection", "")
        
        # Check for banned verbs in SLOs
        slos = data.get("specific_learning_outcomes", [])
        for i, slo in enumerate(slos):
            slo_lower = slo.lower()
            for banned in self.banned_verbs:
                if banned in slo_lower:
                    self.logger.warning(
                        f"Banned verb '{banned}' found in SLO",
                        week=week,
                        slo=slo
                    )
                    # Try to fix by replacing with action verb
                    # This is a simple heuristic - in production you'd want more sophisticated replacement
                    slos[i] = slo.replace(banned, "demonstrate")
        
        data["specific_learning_outcomes"] = slos
        
        return data

    async def generate_lesson_plan(
        self,
        *,
        scheme_id: str,
        week: int,
        lesson: int,
        teacher_id: str,
        language: str = "english",
    ) -> Dict[str, Any]:
        """Generate a detailed lesson plan from a scheme."""
        try:
            self.logger.info(
                "Generating lesson plan",
                scheme_id=scheme_id,
                week=week,
                lesson=lesson
            )
            
            # Load scheme from database
            scheme = await self._load_scheme(scheme_id)
            if not scheme:
                raise AgentError(f"Scheme not found: {scheme_id}")
            
            # Get the specific week's content
            rows = scheme.get("rows", [])
            if week < 1 or week > len(rows):
                raise AgentError(f"Week {week} not found in scheme (has {len(rows)} weeks)")
            
            week_content = rows[week - 1]
            
            # Generate lesson plan using week content as guardrail
            lesson_plan = await self._generate_lesson_plan_content(
                scheme=scheme,
                week_content=week_content,
                lesson_number=lesson,
                language=language,
            )
            
            # Save lesson plan
            lesson_plan_id = f"lesson_{uuid.uuid4().hex[:12]}"
            lesson_plan["lesson_plan_id"] = lesson_plan_id
            lesson_plan["scheme_id"] = scheme_id
            lesson_plan["teacher_id"] = teacher_id
            lesson_plan["created_at"] = datetime.now().isoformat()
            
            if self.supabase:
                await self._save_lesson_plan(lesson_plan)
            
            self.logger.info("Lesson plan generated", lesson_plan_id=lesson_plan_id)
            
            return {
                "agent": "lesson_architect",
                "action": "generate_lesson_plan",
                "response": f"Generated lesson plan for Week {week}, Lesson {lesson}",
                "lesson_plan": lesson_plan,
            }
            
        except Exception as exc:
            self.logger.error("Lesson plan generation failed", error=str(exc))
            raise AgentError(f"Lesson plan generation failed: {exc}") from exc

    async def _generate_lesson_plan_content(
        self,
        *,
        scheme: Dict[str, Any],
        week_content: Dict[str, Any],
        lesson_number: int,
        language: str,
    ) -> Dict[str, Any]:
        """Generate detailed lesson plan content."""
        grade = scheme.get("grade", "")
        subject = scheme.get("subject", "")
        week = week_content.get("week", 1)
        lessons_per_week = scheme.get("lessons_per_week", 5)
        
        # Extract guardrails from week content
        slos = week_content.get("specific_learning_outcomes", [])
        kiqs = week_content.get("key_inquiry_questions", [])
        learning_experiences = week_content.get("learning_experiences", [])
        resources = week_content.get("resources", [])
        
        # Get the specific learning experience for this lesson
        if lesson_number <= len(learning_experiences):
            focus_activity = learning_experiences[lesson_number - 1]
        else:
            focus_activity = learning_experiences[0] if learning_experiences else "General practice"
        
        prompt = f"""Generate a detailed CBC lesson plan.

Grade: {grade}
Subject: {subject}
Week: {week}
Lesson: {lesson_number} of {lessons_per_week}
Strand: {week_content.get('strand', '')}
Sub-Strand: {week_content.get('sub_strand', '')}
Language: {language}

GUARDRAILS FROM SCHEME (MUST USE):
Specific Learning Outcomes: {json.dumps(slos)}
Key Inquiry Questions: {json.dumps(kiqs)}
Focus Activity: {focus_activity}
Available Resources: {json.dumps(resources)}

Generate a 40-minute lesson plan with:
1. Introduction (5 min) - Hook/warm-up using Kenyan context
2. Main Activities (25 min) - Step-by-step, aligned with focus activity
3. Differentiation - Support for struggling students, extension for advanced
4. Assessment - Formative checks during lesson
5. Conclusion (5 min) - Summary and homework
6. Reflection - What worked, what to adjust

CRITICAL RULES:
- Use the SLOs and KIQs from the scheme (don't create new ones)
- Expand the focus activity into detailed steps
- Use Kenyan examples throughout
- Include specific questions to ask students
- Provide concrete differentiation strategies
- Make it ready-to-teach (teacher can print and use immediately)

Return STRICT JSON:
{{
  "title": "Lesson title",
  "grade": "{grade}",
  "subject": "{subject}",
  "week": {week},
  "lesson_number": {lesson_number},
  "duration_minutes": 40,
  "learning_outcomes": {json.dumps(slos)},
  "key_questions": {json.dumps(kiqs)},
  "introduction": {{
    "duration_minutes": 5,
    "activities": ["Step 1", "Step 2"],
    "materials": ["Material 1"]
  }},
  "main_activities": {{
    "duration_minutes": 25,
    "activities": ["Step 1", "Step 2", "Step 3"],
    "materials": ["Material 1", "Material 2"]
  }},
  "differentiation": {{
    "support": ["Strategy for struggling students"],
    "extension": ["Challenge for advanced students"]
  }},
  "assessment": {{
    "formative": ["Check 1", "Check 2"],
    "questions": ["Question 1", "Question 2"]
  }},
  "conclusion": {{
    "duration_minutes": 5,
    "summary": "Key points to recap",
    "homework": "Assignment for next lesson"
  }},
  "teacher_notes": "Tips for teaching this lesson"
}}
"""
        
        # Generate with LLM
        raw = await self._provider().generate(prompt, system=_SYSTEM_PROMPT)
        
        # Parse JSON
        try:
            data = json.loads(raw.strip())
        except json.JSONDecodeError:
            import re
            match = re.search(r'\{.*\}', raw, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
            else:
                raise AgentError("LLM did not return valid JSON for lesson plan")
        
        return data

    async def list_schemes(
        self,
        *,
        teacher_id: str,
        grade: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List schemes for a teacher."""
        try:
            if not self.supabase:
                self.logger.warning("Database not configured - returning empty schemes list")
                return {
                    "agent": "lesson_architect",
                    "action": "list_schemes",
                    "response": "Database not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables to enable scheme storage.",
                    "schemes": [],
                }
            
            # Query schemes from database (Supabase execute() is synchronous)
            query = self.supabase.table("schemes").select("*").eq("teacher_id", teacher_id)
            
            if grade:
                query = query.eq("grade", grade)
            if subject:
                query = query.eq("subject", subject)
            
            # Execute query synchronously - do NOT await
            response = query.execute()
            
            # Extract data from response
            schemes = []
            if response and hasattr(response, 'data'):
                schemes = response.data or []
            
            self.logger.info("Listed schemes", count=len(schemes), teacher_id=teacher_id)
            
            return {
                "agent": "lesson_architect",
                "action": "list_schemes",
                "response": f"Found {len(schemes)} schemes",
                "schemes": schemes,
            }
            
        except Exception as exc:
            self.logger.error("List schemes failed", error=str(exc), error_type=type(exc).__name__)
            # Return empty list instead of crashing
            return {
                "agent": "lesson_architect",
                "action": "list_schemes",
                "response": f"Failed to list schemes: {str(exc)}",
                "schemes": [],
            }

    async def _save_scheme(self, scheme: Dict[str, Any]) -> None:
        """Save scheme to database."""
        if not self.supabase:
            self.logger.warning("Supabase not configured, scheme not saved")
            return
        
        try:
            # Save to schemes table
            self.supabase.table("schemes").insert({
                "scheme_id": scheme["scheme_id"],
                "title": scheme["title"],
                "grade": scheme["grade"],
                "subject": scheme["subject"],
                "term": scheme["term"],
                "mode": scheme["mode"],
                "teacher_id": scheme["teacher_id"],
                "language": scheme["language"],
                "total_weeks": scheme["total_weeks"],
                "lessons_per_week": scheme["lessons_per_week"],
                "rows": scheme["rows"],
                "created_at": scheme["created_at"],
            }).execute()
            
            self.logger.info("Scheme saved", scheme_id=scheme["scheme_id"])
            
        except Exception as exc:
            self.logger.error("Failed to save scheme", error=str(exc))
            # Don't raise - scheme generation succeeded, just storage failed

    async def _load_scheme(self, scheme_id: str) -> Optional[Dict[str, Any]]:
        """Load scheme from database."""
        if not self.supabase:
            self.logger.warning("Supabase not configured")
            return None
        
        try:
            # Execute query synchronously - do NOT await
            response = self.supabase.table("schemes").select("*").eq("scheme_id", scheme_id).execute()
            
            if response and hasattr(response, 'data') and response.data:
                return response.data[0]
            
            return None
            
        except Exception as exc:
            self.logger.error("Failed to load scheme", error=str(exc))
            return None

    async def _save_lesson_plan(self, lesson_plan: Dict[str, Any]) -> None:
        """Save lesson plan to database."""
        if not self.supabase:
            self.logger.warning("Supabase not configured, lesson plan not saved")
            return
        
        try:
            self.supabase.table("lesson_plans").insert(lesson_plan).execute()
            self.logger.info("Lesson plan saved", lesson_plan_id=lesson_plan["lesson_plan_id"])
            
        except Exception as exc:
            self.logger.error("Failed to save lesson plan", error=str(exc))
