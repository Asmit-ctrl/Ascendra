-- ============================================================================
-- METTA PHASE 1 — TELEMETRY TABLES
-- Migration for the Cognitive Data Streams pillar
-- (see .kiro/METTA_KEY_INSIGHTS.md). Phase 1 success criteria require:
--   - Telemetry captured for 100% of student actions
--   - xAPI statements generated correctly
--   - Supabase tables for telemetry
--
-- Five tables, all best-effort writes from telemetry_api.py:
--   1. student_sessions   — one row per sandbox session (activity envelope)
--   2. telemetry_events   — raw frontend events (click/hover/drag/erase/etc)
--   3. behavioral_profiles — TelemetryAgent output (dwell/pathing/erasure/...)
--   4. misconceptions     — AnalysisAgent output
--   5. interventions      — InterventionAgent output (kept flat per intervention,
--                            not as plans, so a dashboard can query "what was
--                            generated for this student?" without unpacking a
--                            nested array)
--   6. xapi_statements    — Tin Can / xAPI 1.0.3 envelopes for every captured
--                            interaction, the canonical learning-record format.
--
-- All payloads are JSONB so the schema doesn't pin us to a particular agent
-- output shape — agents evolve faster than migrations.
-- ============================================================================

-- 1. Student sessions ---------------------------------------------------------
-- One row per sandbox session. Indexed for "what did student X do today?" and
-- "give me the last N sessions for class Y".
CREATE TABLE IF NOT EXISTS student_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  student_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  competency TEXT,
  grade TEXT,
  subject TEXT,
  activity_data JSONB,        -- question, correct_answer, student_answer, etc.
  event_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_sessions_student_id ON student_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_sessions_grade_subject ON student_sessions(grade, subject);
CREATE INDEX IF NOT EXISTS idx_student_sessions_created_at ON student_sessions(created_at DESC);

-- 2. Telemetry events ---------------------------------------------------------
-- Raw per-interaction events. Stored as JSONB so the frontend can add new
-- event types (zoom, two-finger-drag, …) without a migration.
CREATE TABLE IF NOT EXISTS telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  event_index INTEGER NOT NULL,   -- order within the session (0-based)
  event_type TEXT NOT NULL,        -- click | hover | drag | drop | erase | undo | input | submit
  target TEXT,                     -- which canvas element / DOM target
  event_ts BIGINT NOT NULL,        -- ms since epoch from the client clock
  payload JSONB NOT NULL,          -- full event dict (position, duration, metadata)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_session_id ON telemetry_events(session_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_student_id ON telemetry_events(student_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_event_type ON telemetry_events(event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_created_at ON telemetry_events(created_at DESC);

-- 3. Behavioral profiles ------------------------------------------------------
-- TelemetryAgent.process_events() output. One row per session.
CREATE TABLE IF NOT EXISTS behavioral_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  student_id TEXT NOT NULL,
  activity_type TEXT,
  primary_pattern TEXT,        -- e.g. "exploratory", "rushed", "stuck"
  engagement_score REAL,
  mastery_indicator REAL,
  intervention_needed BOOLEAN DEFAULT FALSE,
  intervention_urgency TEXT,   -- low | medium | high
  payload JSONB NOT NULL,      -- full BehavioralProfile.to_dict()
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_behavioral_profiles_student_id ON behavioral_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_profiles_intervention_needed ON behavioral_profiles(intervention_needed) WHERE intervention_needed = TRUE;
CREATE INDEX IF NOT EXISTS idx_behavioral_profiles_created_at ON behavioral_profiles(created_at DESC);

-- 4. Misconceptions -----------------------------------------------------------
-- AnalysisAgent output. One row per detected misconception (a session can
-- produce zero, one, or many).
CREATE TABLE IF NOT EXISTS misconceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  misconception_id TEXT UNIQUE NOT NULL,
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  competency TEXT,
  misconception_type TEXT,
  description TEXT,
  confidence REAL,
  severity TEXT,          -- low | medium | high
  payload JSONB NOT NULL, -- full Misconception.to_dict()
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_misconceptions_student_id ON misconceptions(student_id);
CREATE INDEX IF NOT EXISTS idx_misconceptions_session_id ON misconceptions(session_id);
CREATE INDEX IF NOT EXISTS idx_misconceptions_competency ON misconceptions(competency);
CREATE INDEX IF NOT EXISTS idx_misconceptions_created_at ON misconceptions(created_at DESC);

-- 5. Interventions ------------------------------------------------------------
-- InterventionAgent output. Flat per-intervention so dashboards can do simple
-- "give me the last 5 interventions for student X" without unpacking plans.
-- plan_id groups them when a multi-step plan was generated.
CREATE TABLE IF NOT EXISTS interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id TEXT UNIQUE NOT NULL,
  plan_id TEXT,
  session_id TEXT,
  student_id TEXT NOT NULL,
  intervention_type TEXT,
  difficulty_level TEXT,
  title TEXT,
  objective TEXT,
  duration_minutes INTEGER,
  priority TEXT,           -- low | medium | high
  payload JSONB NOT NULL,  -- full InterventionContent.to_dict()
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interventions_student_id ON interventions(student_id);
CREATE INDEX IF NOT EXISTS idx_interventions_session_id ON interventions(session_id);
CREATE INDEX IF NOT EXISTS idx_interventions_plan_id ON interventions(plan_id);
CREATE INDEX IF NOT EXISTS idx_interventions_priority ON interventions(priority);
CREATE INDEX IF NOT EXISTS idx_interventions_created_at ON interventions(created_at DESC);

-- 6. xAPI statements ----------------------------------------------------------
-- Tin Can / xAPI 1.0.3 statement envelopes. Stored verbatim so we can later
-- forward to any standard LRS without re-deriving them. The `statement_id`
-- mirrors the UUID inside the envelope.
CREATE TABLE IF NOT EXISTS xapi_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id TEXT UNIQUE NOT NULL,
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  verb_id TEXT NOT NULL,          -- e.g. https://w3id.org/xapi/dod-isd/verbs/interacted
  object_id TEXT,                  -- the activity IRI
  statement JSONB NOT NULL,        -- full xAPI envelope
  stored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xapi_statements_session_id ON xapi_statements(session_id);
CREATE INDEX IF NOT EXISTS idx_xapi_statements_student_id ON xapi_statements(student_id);
CREATE INDEX IF NOT EXISTS idx_xapi_statements_verb_id ON xapi_statements(verb_id);
CREATE INDEX IF NOT EXISTS idx_xapi_statements_stored_at ON xapi_statements(stored_at DESC);
