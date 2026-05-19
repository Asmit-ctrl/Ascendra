# Scheme-Scribe-AI Integration

## Overview

This document describes the integration of concepts from the [scheme-scribe-ai](https://github.com/dgithinjibit/scheme-scribe-ai) repository into the SyncSenta Lesson Architect agent.

## Integration Date

May 19, 2026

## Key Concepts Integrated

### 1. Comprehensive Guardrails System

The scheme-scribe-ai repo implements 12 validation guardrails that ensure KICD compliance. We've integrated the most critical ones:

#### Guardrail 1: SLO Structure Validation
- Ensures exactly 3 learning outcomes per week
- Enforces strict KSA ordering: a) Knowledge, b) Skills, c) Attitudes
- Pads missing outcomes with generic placeholders

#### Guardrail 2: Banned Verb Detection
- Detects weak verbs like "know", "understand", "learn about"
- Automatically replaces with appropriate KSA verbs
- Logs warnings for manual review

#### Guardrail 3: KSA Verb Framework Enforcement
- Knowledge verbs: identify, define, describe, name, outline, state, recognize, explain, list, label, recall, summarize, distinguish, illustrate, compare, classify
- Skills verbs: demonstrate, perform, practice, model, draw, calculate, manipulate, use, collaborate, execute, construct, sing, measure, sketch, solve, trace, cut, colour, paint, observe, record, differentiate, interpret, suggest, role-play, conduct, participate, sort, express, create, conserve
- Attitudes verbs: appreciate, value, show, care, demonstrate responsibility, acknowledge, enjoy, uphold, persist, commit, adhere, advocate, respect, empathize, prioritize, develop

#### Guardrail 4: Resource Specificity
- Detects generic resources like "textbook", "chart", "video"
- Adds context to make resources specific
- Example: "textbook" → "textbook related to Number Operations"

#### Guardrail 5: Active Learning Experiences
- Detects passive language in learning experiences
- Converts passive to active voice
- Example: "learn about fractions" → "explore fractions"

### 2. Enhanced Prompt Engineering

#### Dual Language Support
- Separate system prompts for English (`_SYSTEM_PROMPT_EN`) and Kiswahili (`_SYSTEM_PROMPT_SW`)
- Automatically selects appropriate prompt based on subject
- Maintains cultural relevance in both languages

#### Detailed Instructions
- Explicit KSA verb lists in prompts
- Clear formatting requirements
- Official KICD context injection
- Kenyan cultural examples (matatu, shamba, M-Pesa, ugali, shillings)

#### CBC Framework Integration
- Core Competencies: Communication, Critical Thinking, Digital Literacy, Creativity, Learning to Learn, Citizenship, Self-efficacy
- Core Values: Respect, Responsibility, Love, Unity, Peace, Integrity, Patriotism, Social Justice
- PCIs: Life Skills, Health, Environmental Conservation, Safety, Human Rights, Citizenship

### 3. Robust JSON Extraction

Implemented `_extract_json()` method with multiple fallback strategies:

1. **Direct Parse**: Try parsing raw response
2. **Markdown Removal**: Strip code fences and retry
3. **Regex Extraction**: Find JSON object in text
4. **Error Recovery**: Fix common issues (trailing commas)

This handles LLM responses that include markdown, extra text, or malformed JSON.

### 4. Improved Scheme Formatting

The `_format_scheme_as_text()` method now:
- Matches scheme-scribe-ai output format
- Supports bilingual output (English/Kiswahili)
- Includes all scheme components with proper headers
- Adds CBC alignment footer
- Uses markdown for better readability

### 5. Official KICD Context Injection

When generating schemes, the system now:
- Extracts learning outcomes from curriculum data
- Includes suggested experiences from KICD
- Adds key inquiry questions
- Provides this as "official context" to the LLM
- Ensures generated content aligns with KICD standards

## Architecture Comparison

### Scheme-Scribe-AI (TypeScript/Supabase Functions)
```
Frontend (React) 
  → Supabase Edge Function (generate-scheme)
    → Groq API (Llama 4)
      → Guardrails validation
        → Return JSON array of lessons
```

### SyncSenta (Python/FastAPI)
```
Frontend (Next.js)
  → FastAPI Backend (/agents/chat)
    → Orchestrator
      → Lesson Architect Agent
        → Groq API (Llama 3.3)
          → Guardrails validation
            → Return formatted scheme
```

## What Was NOT Integrated

### 1. Batch Generation
- Scheme-scribe-ai generates large schemes in batches of 5 lessons
- SyncSenta generates week-by-week (simpler, faster for MVP)
- **Future**: Implement batch generation for full-term schemes

### 2. Feedback Loop
- Scheme-scribe-ai has teacher feedback and regeneration
- SyncSenta doesn't have this yet
- **Future**: Add feedback collection and iterative improvement

### 3. Reference Context
- Scheme-scribe-ai fetches existing schemes to improve quality
- SyncSenta doesn't have a reference library yet
- **Future**: Build scheme reference database

### 4. Mada Cycle Mode
- Scheme-scribe-ai has special mode for Kiswahili thematic units
- SyncSenta uses standard term allocation
- **Future**: Implement Mada cycle for lower primary Kiswahili

### 5. Lesson Plan Generation from Schemes
- Scheme-scribe-ai generates detailed lesson plans from scheme rows
- SyncSenta has the structure but needs refinement
- **Future**: Enhance lesson plan generation with scheme guardrails

### 6. Export Functionality
- Scheme-scribe-ai exports to PDF and DOCX
- SyncSenta only returns JSON/text
- **Future**: Add export to multiple formats

## Implementation Details

### Files Modified

1. **`lesson_architect.py`**
   - Added dual language system prompts
   - Implemented KSA verb framework
   - Enhanced validation with guardrails
   - Improved JSON extraction
   - Updated scheme formatting

### Code Changes Summary

```python
# Before: Simple verb lists
self.banned_verbs = {"know", "understand", "learn"}
self.action_verbs = {"calculate", "demonstrate", "analyze"}

# After: Comprehensive KSA framework
self.knowledge_verbs = {"identify", "define", "describe", ...}
self.skills_verbs = {"demonstrate", "perform", "practice", ...}
self.attitudes_verbs = {"appreciate", "value", "show", ...}
self.banned_verbs = {"know", "understand", "carry out", ...}
```

```python
# Before: Basic JSON parsing
data = json.loads(raw.strip())

# After: Robust extraction with fallbacks
data = self._extract_json(raw)  # Handles markdown, malformed JSON, etc.
```

```python
# Before: Simple validation
for banned in self.banned_verbs:
    if banned in slo_lower:
        slos[i] = slo.replace(banned, "demonstrate")

# After: KSA-aware validation
if i == 0:  # Knowledge outcome
    if not starts_with_k_verb:
        slos[i] = f"a) Identify {content}"
elif i == 1:  # Skills outcome
    if not starts_with_s_verb:
        slos[i] = f"b) Demonstrate {content}"
elif i == 2:  # Attitudes outcome
    if not starts_with_a_verb:
        slos[i] = f"c) Appreciate {content}"
```

## Testing Recommendations

### 1. Verb Framework Validation
Test that generated schemes:
- Use only approved KSA verbs
- Never use banned verbs
- Maintain strict a/b/c ordering

### 2. JSON Extraction
Test with various LLM responses:
- Clean JSON
- JSON with markdown fences
- JSON with extra text
- Malformed JSON (trailing commas)

### 3. Bilingual Support
Test with:
- English subjects (Mathematics, Science)
- Kiswahili subjects
- Verify correct prompt selection
- Check output formatting

### 4. Guardrails Effectiveness
Test that guardrails:
- Detect and fix generic resources
- Convert passive to active language
- Enforce SLO structure
- Log warnings appropriately

## Future Enhancements

### Phase 1: Core Improvements (Next Sprint)
1. Implement batch generation for full-term schemes
2. Add feedback collection mechanism
3. Enhance error handling and recovery

### Phase 2: Advanced Features (Q3 2026)
1. Build reference scheme database
2. Implement Mada cycle mode for Kiswahili
3. Add export to PDF/DOCX
4. Create teacher feedback loop

### Phase 3: Quality & Scale (Q4 2026)
1. Implement all 12 guardrails from scheme-scribe-ai
2. Add A/B testing for prompt variations
3. Build analytics dashboard for scheme quality
4. Optimize for large-scale generation

## References

- **Original Repo**: https://github.com/dgithinjibit/scheme-scribe-ai
- **KICD CBC Framework**: https://kicd.ac.ke/
- **Groq API Docs**: https://console.groq.com/docs
- **SyncSenta Docs**: `Ascendra/ai-agents/docs/`

## Contributors

- Integration by: Kiro AI Agent
- Original scheme-scribe-ai: dgithinjibit
- SyncSenta Team: Dan Githinji

## License

This integration maintains compatibility with both:
- SyncSenta's license
- scheme-scribe-ai's license (check original repo)
