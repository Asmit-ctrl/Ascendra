# Adaptive Learning Ecosystem - Requirements

## Vision

Transform SyncSenta into an **Adaptive Learning Ecosystem** that combines:
- **Synthesis/DreamBox** student engagement (interactive sandbox, behavioral telemetry)
- **MagicSchool** teacher automation (AI-generated materials, real-time insights)
- **Scheme-Scribe-AI** curriculum depth (comprehensive CBC schemes of work)
- **Current Mwalimu AI** architecture (role-based, Supabase Auth, Groq AI)

## Current Mwalimu AI Architecture

The existing Mwalimu AI system provides the foundation for this adaptive learning ecosystem:

### Unified Entry Point (App.tsx)
- **Conditional Rendering**: Based on user role from Supabase session
- **Authentication Check**: Validates Supabase session, shows Auth component if none exists
- **Role Detection**: Extracts role from `user.user_metadata?.role || 'student'`
- **Routing Logic**:
  - `teacher` → Renders `<TeacherDashboard />`
  - `student` (default) → Renders `<StudentFlow />`

### Teacher Side (TeacherDashboard.tsx)
- **Class Code Management**: Unique code per teacher (e.g., MWALIMU-A2B4C6)
- **AI Personalization**: Upload pedagogical resources (PDFs, lesson notes)
- **Drag-and-Drop Interface**: File upload with simulated 2.5s processing delay
- **Current State**: Waiting for backend file-processing integration

### Student Side (StudentFlow.tsx)
- **Multi-Step Guided Journey**: Kenyan CBC-aligned hierarchy
  1. Major Level (e.g., Early Years, Middle School)
  2. Sub-Level (e.g., Pre-Primary, Junior Secondary)
  3. Specific Grade (e.g., PP1, Grade 7)
  4. Subject (e.g., Environmental Activities, Integrated Science)
- **Dual Learning Paths**:
  - Early Years (PP1/PP2) → `<PrePrimaryActivity />` (child-friendly)
  - Grade 1-12 → Socratic AI Mentor
- **AI Contextualization**: Sends Grade, Subject, Teacher's Class Code to Groq API

### Authentication & Signup (Auth.tsx)
- **Role Selection**: Explicit choice during signup (Student or Teacher)
- **Metadata Storage**:
  - Teachers: Tagged with `teacher` role
  - Students: Optional `class_code` linking to teacher's classroom

### AI Reasoning Engine (geminiService.ts → Now Groq)
- **Socratic Mentor Behavior**: Groq llama-3.3-70b with instructions to:
  - Never give direct answers
  - Ask probing questions to lead students to conclusions
  - Tailor language complexity to student's Grade level
  - Reference student's specific actions in questions

### Current Architecture Summary

| Feature | Teacher Side | Student Side |
|---------|-------------|--------------|
| Primary Goal | Resource management & Customization | Guided discovery & Learning |
| AI Interaction | Uploading training data (PDF/TXT) | Chatting with Socratic Mentor |
| Nav Logic | Single-page Dashboard | Multi-step Hierarchy (Level → Grade → Subject) |
| Access Control | Admin privileges for specific Class Code | Restricted based on Grade/Subject structure |
| Tech Stack | Supabase Auth, Groq AI, Next.js | Supabase Auth, Groq AI, Next.js |

## Three Pillars

### Pillar 1: Cognitive Data Streams
Capture rich behavioral data from student interactions

### Pillar 2: Dynamic Orchestration  
AI agents that analyze data and generate targeted interventions

### Pillar 3: Feedback Loops
Closed-loop system where student data drives teacher actions

## Requirements

### R1: Student Side - Active Learner Interface

**R1.1 - Interaction Engine ("The Sandbox")**
- Replace multiple-choice with interactive Canvas/WebGL playground
- Students manipulate objects (vectors, tokens, text blocks, shapes)
- Virtual manipulatives for math (fraction bars, number lines, geometry tools)
- Physics simulations (force, friction, motion)
- Language activities (word building, sentence construction)
- **NOT** just clicking buttons - actual manipulation and exploration

**R1.2 - Behavioral Telemetry ("The Heartbeat")**
Capture rich interaction data beyond `isCorrect: true`:
- **Dwell Time**: How long student hovers over each option/object
- **Pathing**: Sequence of clicks/moves to reach solution
- **Erasure Rate**: How often they delete/undo (proxy for uncertainty)
- **Attempt Patterns**: First attempt vs. subsequent attempts
- **Tool Usage**: Which manipulatives/tools they use
- **Time to First Action**: Hesitation indicator
- **Interaction Velocity**: Speed of actions (rushed vs. deliberate)

**R1.3 - AI Tutor Overlay (Socratic Guide)**
- Lightweight LLM (Groq llama-3.3-70b-versatile) with access to telemetry
- Socratic questioning: "I noticed you tried to group those three items first—why that approach?"
- **NEVER** gives direct answers
- Asks probing questions based on student's actual behavior
- Adapts language to grade level (simpler for Grade 1, complex for Grade 12)
- References student's specific actions in questions
- **Current Implementation**: Uses `geminiService.ts` (to be renamed to `groqService.ts`)
- **Context Injection**: Receives Grade, Subject, Teacher's Class Code, and Telemetry data

**R1.4 - Level-Based Discovery (Current Mwalimu AI)**
- Major Level → Sub-Level → Grade → Subject hierarchy
- Early Years (PP1/PP2) specialized interface
- Grade 1-12 Socratic AI Mentor
- Teacher's class code integration

**R1.5 - xAPI Learning Record Store (LRS)**
- Implement xAPI (Experience API) standard
- Every student action generates an xAPI statement
- Format: `{actor} {verb} {object} {context}`
- Example: `{Student-123} {manipulated} {fraction-bar} {in-ratios-lesson}`
- Store in Supabase for teacher dashboard access

### R2: Teacher Side - Insight & Action Dashboard

**R2.1 - Scheme of Work Generation (Primary Flow)**
- **NOT** lesson plans first - schemes of work first
- Integrate scheme-scribe-ai curriculum data
- Teacher workflow:
  1. Select: Grade, Subject, Term
  2. AI generates: Complete scheme of work (weeks 1-13)
  3. Teacher reviews/edits
  4. System generates: Individual lesson plans from scheme
- Use comprehensive CBC curriculum data from scheme-scribe-ai

**R2.2 - Automated Differentiation Engine**
- Analyzes student telemetry data
- Identifies struggling students by competency
- Auto-generates targeted interventions:
  - Mini-lessons for specific misconceptions
  - Custom rubrics
  - Differentiated worksheets
  - Remedial activities
- Example: "5 students struggling with Ratios" → Auto-generate ratio mini-lesson

**R2.3 - Real-Time Intervention Alerts**
- Live feed categorizing students:
  - **Productive Struggle** (green) - Leave alone, they're learning
  - **Unproductive Frustration** (red) - Alert teacher NOW
- Classification based on:
  - Erasure rate (high = frustration)
  - Time on task (too long = stuck)
  - Pathing (circular = confusion)
  - Dwell time (excessive = overwhelmed)

**R2.4 - Resource Synthesis**
- Teacher enters high-level goal: "Teach Industrial Revolution"
- System automatically:
  - Pulls relevant "Student Sandbox" modules
  - Wires up curriculum sequence
  - Generates assessment rubrics
  - Creates parent communication templates

**R2.5 - Class Code Management (Current Mwalimu AI)**
- Every teacher gets unique class code (e.g., MWALIMU-A2B4C6)
- Students use code to link to teacher's resources
- AI personalizes responses based on teacher's uploaded materials

**R2.6 - AI Personalization (Fine-Tuning)**
- Teachers upload pedagogical resources (PDFs, lesson notes)
- Drag-and-drop/file-select interface
- System processes and indexes documents
- AI references teacher's materials in responses

### R3: Technical Bridge - The Mashup Logic

**R3.1 - Data Schema (xAPI + Supabase)**
```sql
-- Student telemetry
CREATE TABLE student_telemetry (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES auth.users,
  session_id UUID,
  activity_type TEXT, -- 'sandbox', 'quiz', 'chat'
  xapi_statement JSONB, -- Full xAPI statement
  dwell_time INTEGER, -- milliseconds
  pathing JSONB, -- Array of actions
  erasure_count INTEGER,
  timestamp TIMESTAMPTZ,
  metadata JSONB
);

-- Misconception detection
CREATE TABLE misconceptions (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES auth.users,
  competency TEXT, -- e.g., 'MATH.G4.RATIOS'
  misconception_type TEXT, -- e.g., 'confuses-numerator-denominator'
  confidence FLOAT, -- 0.0 to 1.0
  detected_at TIMESTAMPTZ,
  telemetry_evidence JSONB
);

-- Intervention tracking
CREATE TABLE interventions (
  id UUID PRIMARY KEY,
  teacher_id UUID REFERENCES auth.users,
  student_ids UUID[], -- Array of affected students
  intervention_type TEXT, -- 'mini-lesson', 'rubric', 'alert'
  content JSONB,
  generated_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);
```

**R3.2 - Adaptive Feedback Loop**
```
Input: Student's pathing data from sandbox
  ↓
Processing: AI analyzes pathing → identifies misconception
  ↓
Output 1: MagicSchool-style email to parent
Output 2: DreamBox-style remedial game level
Output 3: Teacher alert with suggested intervention
```

**R3.3 - Agent Architecture**
- **Telemetry Agent**: Captures and processes behavioral data
- **Analysis Agent**: Identifies misconceptions from telemetry
- **Intervention Agent**: Generates targeted content
- **Orchestrator**: Coordinates all agents

### R4: Workflow Example (End-to-End)

**Scenario**: Teaching Fractions to Grade 4

**Week 1: Teacher Setup**
1. Teacher logs in, enters class code
2. Selects: Grade 4, Mathematics, Term 1
3. System generates 13-week scheme of work
4. Teacher reviews, approves
5. System generates Week 1 lesson plans

**Day 1: Student Interaction**
1. Student logs in with class code
2. Launches "Fraction Sandbox" activity
3. Manipulates fraction bars to solve problems
4. System captures:
   - Dwell time: 45s on first problem (normal)
   - Pathing: Tried 1/2 + 1/4, then 1/4 + 1/2 (good)
   - Erasure: 2 times (acceptable)
5. AI Tutor asks: "I see you switched the order. Does it matter which fraction comes first?"

**Day 1: Real-Time Analysis**
1. System detects: Student understands addition but struggles with subtraction
2. Misconception identified: "Confuses which fraction to subtract from"
3. Alert sent to teacher: "Student-123 needs help with fraction subtraction"
4. System generates: Mini-lesson on "Which fraction is larger?"

**Day 2: Teacher Action**
1. Teacher sees alert dashboard
2. 5 students flagged for same misconception
3. System auto-generates:
   - Targeted mini-lesson (10 minutes)
   - Custom rubric for assessment
   - Parent email template
4. Teacher reviews, sends to students

**Day 3: Adaptive Content**
1. Student receives personalized remedial activity
2. New sandbox focuses specifically on subtraction
3. Difficulty adjusted based on previous performance
4. System tracks improvement

**Week 2: Progress Report**
1. System generates weekly report for teacher
2. Shows: Student-123 improved from 40% to 75% on subtraction
3. Recommends: Move to next competency
4. Auto-generates: Week 2 lesson plans adjusted for class progress

## Success Criteria

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| Telemetry capture rate | 100% | All student actions logged |
| Misconception detection accuracy | >80% | Validated by teacher feedback |
| Intervention relevance | >90% | Teacher approval rate |
| Student engagement time | +50% | vs. traditional multiple-choice |
| Teacher time saved | 5 hours/week | On lesson planning |
| Scheme of work quality | CBC-aligned | KICD standards compliance |

## Acceptance Criteria

### Student Side
- [ ] Interactive sandbox works (Canvas/WebGL)
- [ ] Telemetry captures dwell time, pathing, erasure rate
- [ ] AI Tutor asks Socratic questions based on behavior
- [ ] xAPI statements generated for all actions
- [ ] Level-based discovery works (PP1 → Grade 12)

### Teacher Side
- [ ] Scheme of work generation works (scheme-scribe-ai integration)
- [ ] Automated differentiation generates mini-lessons
- [ ] Real-time alerts categorize students correctly
- [ ] Resource synthesis pulls relevant modules
- [ ] Class code management works
- [ ] AI personalization uses uploaded materials

### Technical Bridge
- [ ] xAPI LRS stores all telemetry
- [ ] Adaptive feedback loop generates interventions
- [ ] Agents coordinate correctly
- [ ] End-to-end workflow completes successfully

## Dependencies

- **Supabase**: Database, authentication, real-time subscriptions
- **Groq AI**: llama-3.3-70b-versatile (Socratic mentor, content generation)
- **Next.js**: Frontend framework (studio/)
- **FastAPI**: Backend framework (ai-agents/)
- **Canvas API or WebGL**: Interactive sandbox rendering
- **xAPI library**: Telemetry standard implementation
- **scheme-scribe-ai curriculum data**: CBC curriculum (already copied to `studio/src/data/curriculum/`)
- **Vercel**: Deployment platform ($0 budget)

## Risks

- Telemetry overhead (performance)
- AI misconception detection accuracy
- Teacher adoption (complexity)
- Student privacy (data collection)

## Mitigation

- Optimize telemetry collection (batch, async)
- Validate AI with teacher feedback loop
- Provide teacher training and onboarding
- Implement strict data privacy controls (GDPR, COPPA)
