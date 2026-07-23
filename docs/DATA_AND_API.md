# Data and API reference

## Scope and reliability levels

This reference describes source-level contracts in the current checkout. It does
not claim that every declared table or route is deployed in every environment.

Use these labels when reading it:

| Label | Meaning |
| --- | --- |
| Implemented | A route or data operation is wired into the selected application entry point. |
| Optional | The code works in a degraded mode when the dependency is absent. |
| Declared but unregistered | Source exists but the FastAPI application in api/server.py does not load it. |
| Verify before use | The code expects it, but migration or deployment evidence is incomplete or overlapping. |

The FastAPI service exposes interactive OpenAPI documentation at /docs when
running unless hosting configuration disables the default FastAPI behavior.

## Studio route handlers

All routes below are same-origin routes beneath Studio. Their code is in
studio/src/app/api.

| Route group | Methods | Responsibility |
| --- | --- | --- |
| /api/chat | POST | Authenticated Groq-backed Socratic chat streamed as Server-Sent Events; history, progress, activity, and usage handling. |
| /api/generate/scheme | POST | Edge proxy to FastAPI Lesson Architect scheme generation. |
| /api/generate/lesson-plan | POST | Edge proxy to FastAPI lesson-plan generation. |
| /api/generate/assessment | POST | Edge proxy to FastAPI exam generation. |
| /api/teacher/assignments | GET, POST, PUT, DELETE | Cookie-authenticated teacher grade/subject assignments with RLS. |
| /api/teacher/feedback | GET, POST | Teacher feedback data. Verify the service-role auth approach before production use. |
| /api/teacher/lookup-students | POST | Teacher-facing student lookup. |
| /api/teacher/bulk-assign | POST | Bulk student assignment workflow. |
| /api/teacher/export-report | POST | Teacher report export. |
| /api/agent/trace | GET, POST | Agent trace storage/retrieval. |
| /api/auth | GET, POST, PUT | Application auth/account helpers. |
| /api/referral | GET, POST, PATCH | Referral workflow. |
| /api/nlp/ingest-image | POST | Image-ingestion path. |
| /api/offline/resolve | POST | Offline conflict resolution. |
| /api/schemes/active | GET | Active scheme lookup. |
| /api/set-auth-cookie | POST | Session-cookie handling. |
| /api/test-personalization | GET | Development/test personalization route. |
| /api/voice-call | GET, POST | Voice conversation generation and message persistence. |

### Studio chat contract

POST /api/chat validates these meaningful fields:

    message
    history
    grade
    subject
    language
    studentName
    mode
    teacherContext
    sessionId
    competencyCode

The request must be authenticated, and the user must have a profiles row. The
route uses a subscription tier to choose an Upstash rate limit:

| Tier | Requests per 24 hours |
| --- | --- |
| free | 50 |
| premium | 10,000 |
| school | 50,000 |

When Upstash is unavailable, the code fails open: chat remains available but
is not rate limited by that implementation.

The response is a Server-Sent Event stream rather than a JSON object.
SocraticChat reads chunks, shows partial text, then parses optional choice
tokens from the completed response.

### Studio generation proxies

The three generation routes pass the request body to FastAPI and add
X-Forwarded-User if the route can resolve a Studio user. They do not transform
the generation payload. The FastAPI Pydantic models are therefore the source
of truth for content-generation request shapes.

## FastAPI API

Base URL in development:

    http://localhost:8001

The table below lists the routes loaded by
ai-agents/src/syncsenta_agents/api/server.py.

### Health, assessment, and agent chat

| Method | Path | Status | Purpose |
| --- | --- | --- | --- |
| GET | /healthz | Implemented | Service health and offline-demo flag. |
| POST | /agents/assessment/quiz | Implemented | Generate a CBC-aligned quiz. |
| POST | /agents/assessment/grade | Implemented | Grade a submitted quiz. |
| POST | /agents/chat | Implemented | Route a message through the agent orchestrator. |

The agent-chat request contains message, user_id, optional session_id, grade,
subject, language, and role. If Supabase is configured, the service creates or
updates a chat session and inserts the user and assistant messages. The
response contains success, response, session_id, primary_agent, agents_used,
response_time_ms, fallback_used, and error.

### Lesson Architect

Prefix: /lesson-architect

| Method | Path | Request model | Function |
| --- | --- | --- | --- |
| POST | /generate-scheme | GenerateSchemeRequest | Generate CBC scheme rows. |
| POST | /generate-lesson-plan | GenerateLessonPlanRequest | Generate a lesson plan. |
| POST | /generate-worksheet | GenerateWorksheetRequest | Generate a worksheet. |
| POST | /generate-text-leveler | GenerateTextLevelerRequest | Simplify or adapt text. |
| POST | /unpack-outcome | UnpackOutcomeRequest | Expand curriculum outcomes. |
| POST | /generate-differentiation | GenerateDifferentiationRequest | Produce differentiated learning support. |
| POST | /generate-exam | GenerateExamRequest | Generate an exam. |
| POST | /schemes | SchemeRequest | Persist a scheme. |
| GET | /schemes | Query parameters | List a teacher's schemes. |
| GET | /schemes/{scheme_id} | Path parameter | Retrieve one scheme. |

These routes use LessonArchitectAgent and, when configured, its Supabase
client. Generated artifacts can be stored in their respective tables.

### Dashboard

Prefix: /dashboard

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /students/active | Activity summary for recent students. |
| GET | /agents/stats | Agent activity statistics. |
| GET | /students/{student_id}/progress | Learner progress details. |
| GET | /students/{student_id}/misconceptions | Misconception summaries. |
| GET | /students/{student_id}/interventions | Recent interventions. |
| GET | /students/{student_id}/timeline | Session timeline. |
| GET | /competencies/summary | Cohort competency summary. |
| GET | /competencies/{competency}/trends | Trend data for one competency. |
| POST | /interventions | Send a teacher intervention; persistence is still TODO. |
| GET | /alerts | Derived behavioral alerts. |
| POST | /alerts/{alert_id}/acknowledge | Acknowledge an alert; database update is still TODO. |
| WebSocket | /ws/teacher | Teacher activity channel. |
| WebSocket | /ws/student/{student_id} | Student activity channel. |

The dashboard reads Supabase through dashboard_queries. It produces empty
shapes when the database is unavailable rather than failing every request.

### Telemetry

Prefix: /telemetry

| Method | Path | Status | Purpose |
| --- | --- | --- | --- |
| POST | /capture | Implemented | Analyze an event batch, derive profile/misconceptions/interventions, emit xAPI, and persist best effort. |
| GET | /profile/{session_id} | Not implemented | Returns 501. |
| GET | /misconceptions/{student_id} | Not implemented | Returns 501. |
| GET | /interventions/{student_id} | Not implemented | Returns 501. |
| POST | /test | Implemented | Runs a sample telemetry batch. |

A capture request contains:

    session_id
    student_id
    activity_type
    competency
    grade
    subject
    events
    activity_data

An event has a timestamp, event_type, target, and optional position, duration,
and metadata. InteractiveSandbox is the main current client producer.

### Validation and training export

| Prefix | Method | Path | Purpose |
| --- | --- | --- | --- |
| /validation | POST | /validate-content | Validate one piece of curriculum content. |
| /validation | POST | /validate-batch | Validate multiple content items. |
| /validation | GET | /topic-grade-level/{subject}/{topic} | Report a topic's appropriate grade level. |
| /training-export | POST | /export-scheme | Export one persisted scheme. |
| /training-export | POST | /batch-export | Export filtered/selected scheme data. |
| /training-export | GET | /stats | Export statistics. |
| /training-export | GET | /exportable-schemes | Schemes ready for export. |

### Present in source but not exposed by the deployable app

The following source modules define routers but are not included by
api/server.py:

| Module | Intended prefix | Status |
| --- | --- | --- |
| api/teacher_feedback_api.py | /teacher-feedback | Declared but unregistered. |
| api.py | Older /health and /api/agents paths | Separate FastAPI application, not the Render entry point. |

Do not build client code against the teacher-feedback FastAPI prefix until the
router is registered and protected.

## Database map

### Studio SQL source family

The actual Studio DDL for the numbered base migrations is in
sql/studio_migrations. The matching numbered files under supabase/migrations
and studio/supabase/migrations are absolute-path pointer files in this clone.

| Source | Tables or role |
| --- | --- |
| 001_core_schema.sql | profiles, chat_sessions, chat_messages, learning_progress |
| 002_teacher_dashboard.sql | teacher_students, teacher_interventions, student_alerts, class_performance |
| 003_teacher_grade_assignments.sql | teacher_grade_assignments, teacher_subject_assignments |
| 004_agent_traces.sql | agent_keys, agent_traces |
| 005_camera_frames.sql | camera_frames |
| 20260527_vision_submissions.sql | vision_submissions, intervention_alerts, vision_progress |

The Studio TypeScript database declaration in studio/src/lib/supabase/types.ts
also includes daily_activity, achievements, api_usage, and daily_quotas.
Those tables are not created by the checked-in base Studio DDL above. Treat
them as a live-database compatibility check: verify the applied migration
history before relying on their presence or regenerating types.

### Newer shared/root migration family

The root supabase/migrations directory contains newer executable migrations
for a broader service/data model. Some copies also exist under
sql/supabase_migrations.

| Concern | Main tables |
| --- | --- |
| Teacher and student records | teacher_profiles, students, teacher_student_assignments, teacher_saved_materials |
| Generated instructional materials | schemes, lesson_plans, exams, worksheets, unpacked_outcomes, differentiations |
| Telemetry and learning record | student_sessions, telemetry_events, behavioral_profiles, misconceptions, interventions, xapi_statements |
| Sandbox submission flow | activity_submissions, batch_submissions, teacher_notifications, ai_personalization_queue, ai_recommendations |
| Feedback and preferences | teacher_feedback, teacher_preferences |
| Training exports | training_exports |

The teaching-management migration adds RLS policies for teacher_profiles,
students, teacher_student_assignments, and teacher_saved_materials. Other
tables have their own migration-specific policy coverage; audit the active
database rather than inferring RLS coverage from table names.

### AI-agent feedback schema

The agent source reads and writes these feedback/rule-learning concepts:

    ai_decisions
    teacher_rule_proposals
    rule_votes
    learned_rules
    cultural_patterns

This checkout contains a partial SQL source for ai_decisions in
sql/ai_agents/supabase_production_schema.sql. It does not contain create-table
statements for every remaining item in that list. This is a verification item
before enabling the rule-learning or teacher-feedback paths against a fresh
database.

### Scheme Scribe schema family

Scheme Scribe owns a separate migration lineage:

| Table | Purpose |
| --- | --- |
| profiles | Scheme Scribe user profile. |
| generated_resources | Saved generated schemes and lesson materials. |
| scheme_references | Curated source/reference context. |
| scheme_feedback | User feedback on generated schemes. |
| exams | Generated exams. |
| exam_attempts | Pupil submissions and results. |

This family has table-name overlap with the Studio/root family, especially
profiles and exams. Do not apply Scheme Scribe migrations to a Studio database
without an explicit data-model merge plan.

## Data ownership and access controls

### Identity

- Studio browser components use an anonymous Supabase key and a session stored
  in cookies/local storage through Supabase helpers.
- The cookie-aware route helper forwards the caller's JWT so RLS policies can
  evaluate auth.uid().
- Studio's service-role helper bypasses RLS and is intended for trusted
  administrative work.
- AI Agents uses a Supabase service key and therefore bypasses user-level RLS.
  It must enforce any needed authorization before operations are added.

### Security review point

The comments in studio/src/lib/supabase/server.ts explicitly state that a
service-role client has no caller session. Some Studio routes call auth.getUser
using that helper. In contrast, /api/teacher/assignments uses the cookie-aware
route helper. Before treating the former routes as authenticated, test them
with real session cookies and align the implementation with the latter pattern
where appropriate.

### Sensitive data

The repository models personal data including learner identifiers, grade,
school information, parent/guardian contact information, chat content,
learning behavior, and attendance/camera frames. When operating a live
environment:

- apply least-privilege RLS policies;
- keep service-role credentials server-side only;
- restrict telemetry retention and access by policy;
- do not log raw secrets or unfiltered learner content;
- review consent, safeguarding, and applicable education-data requirements
  before collecting camera or behavioral data.

## API change checklist

When changing a route or schema:

1. Update the request/response validation model first.
2. Preserve the distinction between Studio SSE chat and FastAPI JSON chat, or
   make a documented migration plan.
3. Add explicit authentication/authorization at the boundary that owns the
   request.
4. Add/update the selected canonical SQL migration exactly once.
5. Regenerate Studio database types if the Studio schema changed.
6. Update this document and [Architecture](ARCHITECTURE.md).
7. Add a focused test for the route, agent parser, or database query.
