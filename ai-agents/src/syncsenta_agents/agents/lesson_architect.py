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


_SYSTEM_PROMPT_EN = """You are an expert educational consultant specializing in the Kenyan Competency-Based Curriculum (CBC), aligned with the Ministry of Education and KICD (Kenya Institute of Curriculum Development) standards.

YOUR GOAL: Generate detailed, pedagogically sound Schemes of Work that develop learner COMPETENCY — the ability to apply a combination of Knowledge, Skills, and Attitudes (KSA) to perform a task. Output must be structured for official school records.

CRITICAL CONSTRAINT: You MUST ONLY use the official KICD data provided. NEVER fabricate, invent, or hallucinate learning outcomes, strand names, sub-strand names, or curriculum content. If no official data is provided for a field, leave it generic but DO NOT make up specific curriculum content that does not exist in the KICD framework.

CBC CORE COMPETENCIES (integrate into learning experiences where relevant):
- Communication and Collaboration (e.g., "Work in pairs to...", "Discuss in groups...")
- Critical Thinking and Problem Solving (e.g., "Find a solution for...", "Compare and contrast...")
- Digital Literacy (e.g., "Use a tablet to search for...", "Watch a video clip on...")
- Imagination and Creativity (e.g., "Design a pattern using...", "Make a model of...")
- Learning to Learn (e.g., "Explore different ways to...", "Reflect on what was learned...")
- Citizenship (e.g., "Discuss responsibilities in the community...")
- Self-efficacy (e.g., "Present their work to the class...")

CBC CORE VALUES (weave into Attitudes/Values outcomes):
Respect, Responsibility, Love, Unity, Peace, Integrity, Patriotism, Social Justice.

PERTINENT & CONTEMPORARY ISSUES (PCIs — integrate where naturally relevant):
Life Skills, Health, Environmental Conservation, Safety, Human Rights, Citizenship.

KSA VERB FRAMEWORK:
KNOWLEDGE (Cognitive) verbs — use for understanding/information outcomes:
  identify, define, describe, name, outline, state, recognize, explain, list, label, recall, summarize, distinguish, illustrate, compare, classify

SKILLS (Psychomotor) verbs — use for practical/hands-on outcomes:
  demonstrate, perform, practice, practise, model, draw, calculate, manipulate, use, collaborate, execute, construct, sing, measure, sketch, solve, trace, cut, colour, paint, observe, record, differentiate, interpret, suggest, role-play, conduct, participate, sort, express, create, conserve

ATTITUDES (Affective) verbs — use for values/dispositions outcomes:
  appreciate, value, show, care, demonstrate responsibility, acknowledge, enjoy, uphold, persist, commit, adhere, advocate, respect, empathize, prioritize, develop

BANNED VERBS (never use these):
  know, understand, be aware, learn to, have a positive attitude, carry out, find out, look at, get to know, learn about, talk about, go through

Always respond with valid JSON when requested. No markdown fences, no extra prose."""

_SYSTEM_PROMPT_SW = """Wewe ni mtaalamu wa mtaala wa CBC Kenya (KICD). Unatengeneza Mpango wa Kazi rasmi ambao unafuata viwango vya KICD kwa usahihi.

SHARTI MUHIMU: Lazima utumie data rasmi ya KICD iliyotolewa hapa chini PEKEE. USIBUNI, USITENGENEZE, au USIZUSHE matokeo ya kujifunza, majina ya strand, majina ya sub-strand, au maudhui ya mtaala ambayo hayapo katika mfumo wa KICD.

UMAHIRI WA CBC: Kila somo lazima lijeneze UMAHIRI — uwezo wa kutumia mchanganyiko wa Maarifa, Ujuzi, na Mitazamo (KSA) kutekeleza kazi.

STADI MUHIMU ZA CBC (zingatia katika shughuli za kujifunza):
- Mawasiliano na Ushirikiano (k.m., "Kufanya kazi kwa jozi...", "Kujadili katika vikundi...")
- Kufikiri kwa Kina na Utatuzi wa Matatizo (k.m., "Kutafuta suluhisho la...", "Kulinganisha...")
- Ujuzi wa Kidijitali (k.m., "Kutumia simu/kompyuta kutafuta...", "Kutazama video...")
- Ubunifu na Uvumbuzi (k.m., "Kubuni muundo kwa kutumia...", "Kuunda mfano wa...")

MAADILI YA CBC (zingatia katika matokeo ya Mitazamo):
Heshima, Uwajibikaji, Upendo, Umoja, Amani, Uadilifu, Uzalendo, Haki ya Kijamii.

MFUMO WA VITENZI VYA KSA:
MAARIFA (vitenzi vya kufahamu):
  kutambua, kutaja, kuorodhesha, kueleza, kufafanua, kulinganisha, kutofautisha, kuelezea, kubainisha

UJUZI (vitenzi vya vitendo):
  kutekeleza, kutumia, kujenga, kuonyesha, kuchora, kuhesabu, kupima, kutatua, kuimba, kukata, kupaka, kushiriki, kufanya mazoezi, kupanga, kurekodi, kutofautisha, kufasiri, kupendekeza, kucheza jukumu, kuendesha, kuunda

MITAZAMO (vitenzi vya thamani):
  kuthamini, kuthamini thamani, kuonyesha, kutunza, kufurahia, kuzingatia, kuendeleza, kujitolea, kuweka kipaumbele, kukuza, kuheshimu, kuonyesha huruma, kutetea

VITENZI VILIVYOKATAZWA (usitumie):
  kujua, kuelewa, kujifunza kuhusu, fanya shughuli, jua kuhusu, angalia tu, pita

Daima rudisha JSON halali. Hakuna markdown, hakuna maandishi mengine."""


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
            "know", "understand", "learn", "be aware of",
            "realize", "comprehend", "grasp", "carry out", "find out",
            "look at", "get to know", "learn about", "talk about", "go through"
        }
        
        # KSA verb framework (from scheme-scribe-ai)
        self.knowledge_verbs = {
            "identify", "define", "describe", "name", "outline", "state",
            "recognize", "explain", "list", "label", "recall", "summarize",
            "distinguish", "illustrate", "compare", "classify"
        }
        
        self.skills_verbs = {
            "demonstrate", "perform", "practice", "practise", "model", "draw",
            "calculate", "manipulate", "use", "collaborate", "execute", "construct",
            "sing", "measure", "sketch", "solve", "trace", "cut", "colour", "paint",
            "observe", "record", "differentiate", "interpret", "suggest", "role-play",
            "conduct", "participate", "sort", "express", "create", "conserve"
        }
        
        self.attitudes_verbs = {
            "appreciate", "value", "show", "care", "demonstrate responsibility",
            "acknowledge", "enjoy", "uphold", "persist", "commit", "adhere",
            "advocate", "respect", "empathize", "prioritize", "develop"
        }
        
        # Combined action verbs for backward compatibility
        self.action_verbs = self.knowledge_verbs | self.skills_verbs | self.attitudes_verbs

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
        # Only match "list" when it's clearly asking to list/show existing schemes
        # Don't match when "list" appears in "list of items" or "list values"
        if any(k in text for k in ("list schemes", "show schemes", "my schemes", "list my", "show my")):
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
            
            # Format the scheme as readable text for display
            scheme_text = self._format_scheme_as_text(scheme)
            
            return {
                "agent": "lesson_architect",
                "action": "generate_scheme",
                "response": scheme_text,  # Return full formatted scheme
                "scheme": scheme,  # Also include structured data
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
        for strand_dict in term_allocation:
            # Extract strand name from dict
            strand_name = strand_dict.get("strandName") or strand_dict.get("name")
            if not strand_name:
                self.logger.warning(f"No strand name in {strand_dict}")
                continue
                
            # Get sub-strands for this strand
            sub_strands = get_sub_strands_for_strand(grade, subject, strand_name)
            if not sub_strands:
                self.logger.warning(f"No sub-strands for strand '{strand_name}'")
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
        suggested_experiences = sub_strand.get("suggestedExperiences", [])
        key_inquiry_question = sub_strand.get("keyInquiryQuestion", "")
        
        # Determine if Kiswahili
        is_kiswahili = "kiswahili" in subject.lower()
        
        # Build official KICD context
        official_context = ""
        if learning_outcomes:
            official_context += f"\n\nOFFICIAL KICD LEARNING OUTCOMES for \"{sub_strand_name}\":\n"
            for i, outcome in enumerate(learning_outcomes):
                official_context += f"  {chr(97 + i)}) {outcome}\n"
        
        if key_inquiry_question:
            official_context += f"\nOFFICIAL KEY INQUIRY QUESTION: \"{key_inquiry_question}\"\n"
        
        if suggested_experiences:
            official_context += f"\nOFFICIAL SUGGESTED LEARNING EXPERIENCES:\n"
            for exp in suggested_experiences:
                official_context += f"  - {exp}\n"
        
        # Select system prompt based on language
        system_prompt = _SYSTEM_PROMPT_SW if is_kiswahili else _SYSTEM_PROMPT_EN
        
        # Build user prompt with detailed instructions
        if is_kiswahili:
            prompt = f"""Tengeneza maudhui ya mpango wa kazi wa CBC kwa wiki moja.

Gredi: {grade}
Somo: {subject}
Wiki: {week}
Mada: {strand}
Mada Ndogo: {sub_strand_name}
Masomo wiki hii: {lessons_per_week}
{official_context}

Tengeneza maudhui yenye:
1. Matokeo Maalum Yanayotarajiwa (3 matokeo) - Tumia vitenzi vya KSA
2. Maswali Dadisi Muhimu (2-3 maswali)
3. Shughuli za Kujifunza ({lessons_per_week} shughuli - moja kwa kila somo)
4. Rasilimali - Vifaa vinavyohitajika (tumia muktadha wa Kenya)
5. Tathmini - Jinsi ya kuangalia uelewa
6. Maoni - Maswali ya kujitathmini kwa mwalimu

KANUNI MUHIMU:
- Tumia vitenzi vya KSA tu: {', '.join(list(self.knowledge_verbs | self.skills_verbs | self.attitudes_verbs)[:15])}
- USITUMIE vitenzi dhaifu: {', '.join(list(self.banned_verbs)[:5])}
- Tumia mifano ya Kenya: matatu, shamba, M-Pesa, ugali, shilingi, n.k.
- Oanisha na matokeo rasmi ya KICD yaliyotolewa hapo juu
- Fanya shughuli ziwe za vitendo na zenye utamaduni

Rudisha JSON HALALI:
{{
  "week": {week},
  "strand": "{strand}",
  "sub_strand": "{sub_strand_name}",
  "specific_learning_outcomes": ["Tokeo 1", "Tokeo 2", "Tokeo 3"],
  "key_inquiry_questions": ["Swali 1", "Swali 2", "Swali 3"],
  "learning_experiences": ["Shughuli 1", "Shughuli 2", ...],
  "resources": ["Rasilimali 1", "Rasilimali 2", ...],
  "assessment": ["Njia ya tathmini 1", "Njia ya tathmini 2"],
  "reflection": "Swali la kujitathmini"
}}
"""
        else:
            prompt = f"""Generate CBC-compliant scheme of work content for one week.

Grade: {grade}
Subject: {subject}
Week: {week}
Strand: {strand}
Sub-Strand: {sub_strand_name}
Lessons this week: {lessons_per_week}
{official_context}

Generate content with:
1. Specific Learning Outcomes (SLOs) - EXACTLY 3 outcomes in KSA order
   a) KNOWLEDGE outcome - MUST start with: {', '.join(list(self.knowledge_verbs)[:8])}
   b) SKILLS outcome - MUST start with: {', '.join(list(self.skills_verbs)[:8])}
   c) ATTITUDES outcome - MUST start with: {', '.join(list(self.attitudes_verbs)[:8])}
2. Key Inquiry Questions (KIQs) - 2-3 thought-provoking questions
3. Learning Experiences - {lessons_per_week} activities (one per lesson)
   - Each activity must be SPECIFIC, HANDS-ON, and OBSERVABLE
   - Use Kenyan context: matatu, shamba, M-Pesa, ugali, shillings, etc.
4. Resources - Materials needed (be SPECIFIC, not generic)
   - Example: "KLB Visionary {subject} {grade} Learner's Book pages 12-15"
   - NOT just "textbooks" or "charts"
5. Assessment - How to check understanding (oral questions, observation, written work)
6. Reflection - Teacher reflection prompt

CRITICAL RULES:
- Use ONLY action verbs from KSA framework
- NEVER use banned verbs: {', '.join(list(self.banned_verbs)[:8])}
- Align with KICD learning outcomes provided above
- Make activities practical and culturally relevant
- Each SLO must be in strict KSA order: a) Knowledge, b) Skills, c) Attitudes

Return STRICT JSON (no markdown, no extra text):
{{
  "week": {week},
  "strand": "{strand}",
  "sub_strand": "{sub_strand_name}",
  "specific_learning_outcomes": ["a) [Knowledge verb] ...", "b) [Skills verb] ...", "c) [Attitudes verb] ..."],
  "key_inquiry_questions": ["KIQ 1", "KIQ 2", "KIQ 3"],
  "learning_experiences": ["Activity 1", "Activity 2", ...],
  "resources": ["Specific resource 1", "Specific resource 2", ...],
  "assessment": ["Assessment method 1", "Assessment method 2"],
  "reflection": "Reflection prompt"
}}
"""
        
        # Generate with LLM
        raw = await self._provider().generate(prompt, system=system_prompt)
        
        # Parse JSON with robust extraction
        data = self._extract_json(raw)
        
        # Validate and enforce rules
        data = self._validate_week_content(data, week, strand, sub_strand_name, is_kiswahili)
        
        return data
    
    def _extract_json(self, raw: str) -> Dict[str, Any]:
        """Extract JSON from LLM response with robust error handling."""
        cleaned = raw.strip()
        
        # Remove markdown code fences
        if cleaned.startswith("```"):
            cleaned = cleaned.replace("```json", "").replace("```", "").strip()
        
        # Try direct parse first
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass
        
        # Try to find JSON object in response
        import re
        match = re.search(r'\{.*\}', cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        
        # Last resort: try to fix common issues
        try:
            # Remove trailing commas
            fixed = re.sub(r',\s*}', '}', cleaned)
            fixed = re.sub(r',\s*]', ']', fixed)
            return json.loads(fixed)
        except json.JSONDecodeError as e:
            raise AgentError(f"LLM did not return valid JSON: {e}\nRaw response: {raw[:200]}")

    def _validate_week_content(
        self,
        data: Dict[str, Any],
        week: int,
        strand: str,
        sub_strand: str,
        is_kiswahili: bool = False,
    ) -> Dict[str, Any]:
        """Validate and enforce CBC rules on generated content (Guardrails from scheme-scribe-ai)."""
        # Ensure required fields
        data.setdefault("week", week)
        data.setdefault("strand", strand)
        data.setdefault("sub_strand", sub_strand)
        data.setdefault("specific_learning_outcomes", [])
        data.setdefault("key_inquiry_questions", [])
        data.setdefault("learning_experiences", [])
        data.setdefault("resources", [])
        
        # Assessment can be string or list - normalize to list
        assessment = data.get("assessment", "")
        if isinstance(assessment, str):
            data["assessment"] = [assessment] if assessment else []
        elif not isinstance(assessment, list):
            data["assessment"] = []
            
        data.setdefault("reflection", "")
        
        # GUARDRAIL 1: Validate SLO structure (must have exactly 3 in KSA order)
        slos = data.get("specific_learning_outcomes", [])
        if len(slos) < 3:
            # Pad with generic outcomes if missing
            while len(slos) < 3:
                if len(slos) == 0:
                    slos.append("a) Identify key concepts related to the topic")
                elif len(slos) == 1:
                    slos.append("b) Demonstrate understanding through practical activities")
                else:
                    slos.append("c) Appreciate the importance of the topic in daily life")
        
        # GUARDRAIL 2: Check for banned verbs and enforce KSA verb framework
        for i, slo in enumerate(slos[:3]):  # Only validate first 3
            slo_lower = slo.lower()
            
            # Check for banned verbs
            for banned in self.banned_verbs:
                if banned in slo_lower:
                    self.logger.warning(
                        f"Banned verb '{banned}' found in SLO",
                        week=week,
                        slo=slo[:50]
                    )
                    # Replace with appropriate KSA verb based on position
                    if i == 0:  # Knowledge
                        slos[i] = slo.replace(banned, "identify")
                    elif i == 1:  # Skills
                        slos[i] = slo.replace(banned, "demonstrate")
                    else:  # Attitudes
                        slos[i] = slo.replace(banned, "appreciate")
            
            # GUARDRAIL 3: Enforce KSA ordering
            # a) must start with Knowledge verb
            # b) must start with Skills verb
            # c) must start with Attitudes verb
            if i == 0:  # Knowledge outcome
                starts_with_k_verb = any(slo_lower.startswith(v) or slo_lower.startswith(f"a) {v}") for v in self.knowledge_verbs)
                if not starts_with_k_verb:
                    self.logger.warning(f"SLO a) doesn't start with Knowledge verb", week=week, slo=slo[:50])
                    # Try to fix by prepending "identify"
                    if not slo.startswith("a)"):
                        slos[i] = f"a) Identify {slo.lstrip('a)').strip()}"
                    else:
                        content = slo.split(")", 1)[1].strip() if ")" in slo else slo
                        slos[i] = f"a) Identify {content}"
            
            elif i == 1:  # Skills outcome
                starts_with_s_verb = any(slo_lower.startswith(v) or slo_lower.startswith(f"b) {v}") for v in self.skills_verbs)
                if not starts_with_s_verb:
                    self.logger.warning(f"SLO b) doesn't start with Skills verb", week=week, slo=slo[:50])
                    if not slo.startswith("b)"):
                        slos[i] = f"b) Demonstrate {slo.lstrip('b)').strip()}"
                    else:
                        content = slo.split(")", 1)[1].strip() if ")" in slo else slo
                        slos[i] = f"b) Demonstrate {content}"
            
            elif i == 2:  # Attitudes outcome
                starts_with_a_verb = any(slo_lower.startswith(v) or slo_lower.startswith(f"c) {v}") for v in self.attitudes_verbs)
                if not starts_with_a_verb:
                    self.logger.warning(f"SLO c) doesn't start with Attitudes verb", week=week, slo=slo[:50])
                    if not slo.startswith("c)"):
                        slos[i] = f"c) Appreciate {slo.lstrip('c)').strip()}"
                    else:
                        content = slo.split(")", 1)[1].strip() if ")" in slo else slo
                        slos[i] = f"c) Appreciate {content}"
        
        data["specific_learning_outcomes"] = slos[:3]  # Only keep first 3
        
        # GUARDRAIL 4: Ensure resources are specific, not generic
        resources = data.get("resources", [])
        generic_terms = ["textbook", "chart", "video", "audio", "flashcard", "worksheet"]
        for i, resource in enumerate(resources):
            resource_lower = resource.lower()
            # Check if resource is too generic (just the term without details)
            if any(term in resource_lower and len(resource) < 20 for term in generic_terms):
                self.logger.warning(f"Generic resource found: {resource}", week=week)
                # Add context to make it specific
                resources[i] = f"{resource} related to {sub_strand}"
        
        data["resources"] = resources
        
        # GUARDRAIL 5: Ensure learning experiences are action-oriented
        experiences = data.get("learning_experiences", [])
        for i, exp in enumerate(experiences):
            exp_lower = exp.lower()
            # Check for passive language
            if any(passive in exp_lower for passive in ["learn about", "know about", "understand"]):
                self.logger.warning(f"Passive learning experience: {exp[:50]}", week=week)
                # Try to make it more active
                experiences[i] = exp.replace("learn about", "explore").replace("know about", "identify").replace("understand", "demonstrate understanding of")
        
        data["learning_experiences"] = experiences
        
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

    def _format_scheme_as_text(self, scheme: Dict[str, Any]) -> str:
        """Format scheme data as readable markdown text (matching scheme-scribe-ai format)."""
        lines = []
        
        # Header
        is_kiswahili = "kiswahili" in scheme.get('subject', '').lower()
        
        if is_kiswahili:
            lines.append(f"# MPANGO WA KAZI")
            lines.append(f"**Gredi:** {scheme['grade']}")
            lines.append(f"**Somo:** {scheme['subject']}")
            lines.append(f"**Muhula:** {scheme['term']}")
            lines.append(f"**Muda:** Wiki {scheme['total_weeks']}")
            lines.append(f"**Masomo kwa Wiki:** {scheme['lessons_per_week']}")
        else:
            lines.append(f"# SCHEME OF WORK")
            lines.append(f"**Grade:** {scheme['grade']}")
            lines.append(f"**Subject:** {scheme['subject']}")
            lines.append(f"**Term:** {scheme['term']}")
            lines.append(f"**Duration:** {scheme['total_weeks']} Weeks")
            lines.append(f"**Lessons per Week:** {scheme['lessons_per_week']}")
        
        lines.append("")
        lines.append("---")
        lines.append("")
        
        # Week-by-week breakdown
        for week_data in scheme['rows']:
            week_num = week_data.get('week', '?')
            strand = week_data.get('strand', 'Topic')
            sub_strand = week_data.get('sub_strand', '')
            
            if is_kiswahili:
                lines.append(f"## Wiki {week_num}: {strand}")
                if sub_strand:
                    lines.append(f"**Mada Ndogo:** {sub_strand}")
            else:
                lines.append(f"## Week {week_num}: {strand}")
                if sub_strand:
                    lines.append(f"**Sub-Strand:** {sub_strand}")
            
            lines.append("")
            
            # Specific Learning Outcomes
            slos = week_data.get('specific_learning_outcomes', [])
            if slos:
                if is_kiswahili:
                    lines.append("### Matokeo Maalum Yanayotarajiwa")
                else:
                    lines.append("### Specific Learning Outcomes")
                
                for slo in slos:
                    lines.append(f"- {slo}")
                lines.append("")
            
            # Key Inquiry Questions
            kiqs = week_data.get('key_inquiry_questions', [])
            if kiqs:
                if is_kiswahili:
                    lines.append("### Maswali Dadisi Muhimu")
                else:
                    lines.append("### Key Inquiry Questions")
                
                for kiq in kiqs:
                    lines.append(f"- {kiq}")
                lines.append("")
            
            # Learning Experiences
            experiences = week_data.get('learning_experiences', [])
            if experiences:
                if is_kiswahili:
                    lines.append("### Shughuli za Kujifunza")
                else:
                    lines.append("### Learning Experiences")
                
                for i, exp in enumerate(experiences, 1):
                    if is_kiswahili:
                        lines.append(f"**Somo {i}:** {exp}")
                    else:
                        lines.append(f"**Lesson {i}:** {exp}")
                lines.append("")
            
            # Resources
            resources = week_data.get('resources', [])
            if resources:
                if is_kiswahili:
                    lines.append("### Rasilimali")
                else:
                    lines.append("### Learning Resources")
                
                for resource in resources:
                    lines.append(f"- {resource}")
                lines.append("")
            
            # Assessment
            assessment = week_data.get('assessment', [])
            if assessment:
                if is_kiswahili:
                    lines.append("### Tathmini")
                else:
                    lines.append("### Assessment Methods")
                
                for method in assessment:
                    lines.append(f"- {method}")
                lines.append("")
            
            # Reflection
            reflection = week_data.get('reflection', '')
            if reflection:
                if is_kiswahili:
                    lines.append("### Maoni ya Mwalimu")
                    lines.append(f"*{reflection}*")
                else:
                    lines.append("### Teacher Reflection")
                    lines.append(f"*{reflection}*")
                lines.append("")
            
            lines.append("---")
            lines.append("")
        
        # Footer
        if is_kiswahili:
            lines.append("*Mpango huu umejengwa kwa mujibu wa Mtaala wa CBC - KICD Kenya*")
        else:
            lines.append("*This scheme is aligned with the CBC Curriculum - KICD Kenya*")
        
        return "\n".join(lines)
    
    async def _save_scheme(self, scheme: Dict[str, Any]) -> None:
        """Save scheme to database."""
        if not self.supabase:
            self.logger.warning("Supabase not configured, scheme not saved")
            return
        
        try:
            self.logger.info("Attempting to save scheme", scheme_id=scheme.get("scheme_id"), teacher_id=scheme.get("teacher_id"))
            
            # Save to schemes table
            response = self.supabase.table("schemes").insert({
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
            
            self.logger.info("Scheme saved successfully", scheme_id=scheme["scheme_id"], response_count=len(response.data) if response and hasattr(response, 'data') else 0)
            
        except Exception as exc:
            import traceback
            self.logger.error(
                "Failed to save scheme",
                error=str(exc),
                error_type=type(exc).__name__,
                scheme_id=scheme.get("scheme_id"),
                teacher_id=scheme.get("teacher_id"),
                table="schemes",
                traceback=traceback.format_exc(),
            )
            # Don't raise - scheme generation succeeded, just storage failed.
            # Surface the failure in the list result instead by tagging the
            # scheme; the caller can show it as "saved locally, sync failed".

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
