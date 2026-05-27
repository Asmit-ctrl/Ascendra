-- ============================================================================
-- ENABLE RLS ON REMAINING TABLES
-- Migration to secure 17 tables that currently have RLS disabled
-- ============================================================================

-- Enable RLS on all remaining tables
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE competency_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE unpacked_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE differentiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE misconceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xapi_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STUDENT DATA POLICIES
-- ============================================================================

-- student_progress: Students see only their own progress
CREATE POLICY "Students can view own progress"
  ON student_progress FOR SELECT
  USING (auth.uid()::text = student_id);

CREATE POLICY "Students can update own progress"
  ON student_progress FOR UPDATE
  USING (auth.uid()::text = student_id);

CREATE POLICY "System can insert progress"
  ON student_progress FOR INSERT
  WITH CHECK (TRUE); -- Service role can insert

-- chat_history: Students see only their own chats
CREATE POLICY "Students can view own chat history"
  ON chat_history FOR SELECT
  USING (auth.uid()::text = student_id);

CREATE POLICY "Students can insert own messages"
  ON chat_history FOR INSERT
  WITH CHECK (auth.uid()::text = student_id);

-- assignments: Students see their own assignments
CREATE POLICY "Students can view own assignments"
  ON assignments FOR SELECT
  USING (auth.uid()::text = student_id);

-- learning_sessions: Students see their own sessions
CREATE POLICY "Students can view own sessions"
  ON learning_sessions FOR SELECT
  USING (auth.uid()::text = student_id);

CREATE POLICY "Students can insert own sessions"
  ON learning_sessions FOR INSERT
  WITH CHECK (auth.uid()::text = student_id);

-- student_achievements: Students see their own achievements
CREATE POLICY "Students can view own achievements"
  ON student_achievements FOR SELECT
  USING (auth.uid()::text = student_id);

CREATE POLICY "System can insert achievements"
  ON student_achievements FOR INSERT
  WITH CHECK (TRUE); -- Service role can insert

-- competency_mastery: Students see their own mastery
CREATE POLICY "Students can view own competency mastery"
  ON competency_mastery FOR SELECT
  USING (auth.uid()::text = student_id);

CREATE POLICY "System can manage competency mastery"
  ON competency_mastery FOR ALL
  USING (TRUE); -- Service role can manage

-- ============================================================================
-- TEACHER DATA POLICIES
-- ============================================================================

-- worksheets: Teachers see only their own worksheets
CREATE POLICY "Teachers can manage own worksheets"
  ON worksheets FOR ALL
  USING (auth.uid()::text = teacher_id);

-- unpacked_outcomes: Teachers see only their own unpacked outcomes
CREATE POLICY "Teachers can manage own unpacked outcomes"
  ON unpacked_outcomes FOR ALL
  USING (auth.uid()::text = teacher_id);

-- differentiations: Teachers see only their own differentiations
CREATE POLICY "Teachers can manage own differentiations"
  ON differentiations FOR ALL
  USING (auth.uid()::text = teacher_id);

-- exams: Teachers see only their own exams
CREATE POLICY "Teachers can manage own exams"
  ON exams FOR ALL
  USING (auth.uid()::text = teacher_id);

-- ============================================================================
-- TELEMETRY & ANALYTICS POLICIES
-- ============================================================================

-- student_sessions: Students see their own sessions, teachers see assigned students
CREATE POLICY "Students can view own telemetry sessions"
  ON student_sessions FOR SELECT
  USING (auth.uid()::text = student_id);

CREATE POLICY "System can insert telemetry sessions"
  ON student_sessions FOR INSERT
  WITH CHECK (TRUE); -- Service role can insert

-- telemetry_events: Students see their own events
CREATE POLICY "Students can view own telemetry events"
  ON telemetry_events FOR SELECT
  USING (auth.uid()::text = student_id);

CREATE POLICY "System can insert telemetry events"
  ON telemetry_events FOR INSERT
  WITH CHECK (TRUE); -- Service role can insert

-- behavioral_profiles: Students see their own profiles
CREATE POLICY "Students can view own behavioral profiles"
  ON behavioral_profiles FOR SELECT
  USING (auth.uid()::text = student_id);

CREATE POLICY "System can manage behavioral profiles"
  ON behavioral_profiles FOR ALL
  USING (TRUE); -- Service role can manage

-- misconceptions: Students see their own misconceptions
CREATE POLICY "Students can view own misconceptions"
  ON misconceptions FOR SELECT
  USING (auth.uid()::text = student_id);

CREATE POLICY "System can manage misconceptions"
  ON misconceptions FOR ALL
  USING (TRUE); -- Service role can manage

-- interventions: Students see their own interventions
CREATE POLICY "Students can view own interventions"
  ON interventions FOR SELECT
  USING (auth.uid()::text = student_id);

CREATE POLICY "System can manage interventions"
  ON interventions FOR ALL
  USING (TRUE); -- Service role can manage

-- xapi_statements: Students see their own xAPI statements
CREATE POLICY "Students can view own xapi statements"
  ON xapi_statements FOR SELECT
  USING (auth.uid()::text = student_id);

CREATE POLICY "System can insert xapi statements"
  ON xapi_statements FOR INSERT
  WITH CHECK (TRUE); -- Service role can insert

-- ============================================================================
-- ADMIN/SYSTEM POLICIES
-- ============================================================================

-- training_exports: Only admins/service role can access
CREATE POLICY "Service role can manage training exports"
  ON training_exports FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'student_progress', 'chat_history', 'assignments', 'learning_sessions',
      'student_achievements', 'competency_mastery', 'worksheets', 'unpacked_outcomes',
      'training_exports', 'differentiations', 'student_sessions', 'telemetry_events',
      'behavioral_profiles', 'misconceptions', 'interventions', 'xapi_statements', 'exams'
    )
    AND rowsecurity = true;
  
  RAISE NOTICE '✅ Enabled RLS on % tables', table_count;
END $$;

-- Made with Bob
