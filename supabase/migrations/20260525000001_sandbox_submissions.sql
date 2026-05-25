-- ============================================================================
-- SANDBOX ACTIVITY SUBMISSIONS
-- Migration to back the student "Practice Sandbox" telemetry on Supabase.
--
-- Replaces the original Firebase Firestore design with native Postgres tables
-- + RLS. The sandbox feature lets students complete bite-sized practice
-- activities; each completion is logged here so teachers can review and the
-- AI personalization pipeline can read from it.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ACTIVITY SUBMISSIONS (individual student attempts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'addition', 'shape-builder', 'word-match', etc.
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  difficulty TEXT NOT NULL, -- 'easy', 'medium', 'hard'
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  time_spent INTEGER NOT NULL CHECK (time_spent >= 0), -- seconds
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answers JSONB, -- student's raw answers for review
  feedback TEXT, -- AI-generated feedback (nullable until AI processes)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_submissions_student 
  ON activity_submissions(student_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_submissions_grade_subject 
  ON activity_submissions(grade, subject, completed_at DESC);

-- RLS: students see only their own submissions
ALTER TABLE activity_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY activity_submissions_student_select ON activity_submissions
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY activity_submissions_student_insert ON activity_submissions
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Teachers see submissions from their assigned students
CREATE POLICY activity_submissions_teacher_select ON activity_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teacher_student_assignments tsa
      JOIN students s ON s.id = tsa.student_id
      WHERE tsa.teacher_id = auth.uid()
        AND s.user_id = activity_submissions.student_id
    )
  );

-- ----------------------------------------------------------------------------
-- 2. BATCH SUBMISSIONS (session-level aggregates)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batch_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  total_activities INTEGER NOT NULL CHECK (total_activities > 0),
  average_score NUMERIC(5,2) NOT NULL CHECK (average_score >= 0 AND average_score <= 100),
  total_time INTEGER NOT NULL CHECK (total_time >= 0), -- seconds
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_submissions_student 
  ON batch_submissions(student_id, completed_at DESC);

ALTER TABLE batch_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY batch_submissions_student_select ON batch_submissions
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY batch_submissions_student_insert ON batch_submissions
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY batch_submissions_teacher_select ON batch_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teacher_student_assignments tsa
      JOIN students s ON s.id = tsa.student_id
      WHERE tsa.teacher_id = auth.uid()
        AND s.user_id = batch_submissions.student_id
    )
  );

-- ----------------------------------------------------------------------------
-- 3. TEACHER NOTIFICATIONS (new submission alerts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES activity_submissions(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_notifications_teacher 
  ON teacher_notifications(teacher_id, read, created_at DESC);

ALTER TABLE teacher_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY teacher_notifications_select ON teacher_notifications
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY teacher_notifications_update ON teacher_notifications
  FOR UPDATE USING (auth.uid() = teacher_id);

-- System can insert notifications (via service role or trigger)
CREATE POLICY teacher_notifications_insert ON teacher_notifications
  FOR INSERT WITH CHECK (TRUE);

-- ----------------------------------------------------------------------------
-- 4. AI PERSONALIZATION QUEUE (submissions awaiting AI analysis)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_personalization_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES activity_submissions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_queue_status_priority 
  ON ai_personalization_queue(status, priority DESC, created_at ASC);

ALTER TABLE ai_personalization_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can manage the queue
CREATE POLICY ai_queue_service_only ON ai_personalization_queue
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- 5. AI RECOMMENDATIONS (personalized next-activity suggestions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  reason TEXT NOT NULL, -- why this activity was recommended
  confidence NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_student 
  ON ai_recommendations(student_id, created_at DESC);

ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_recommendations_student_select ON ai_recommendations
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY ai_recommendations_service_insert ON ai_recommendations
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- 6. UPDATED_AT TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_activity_submissions_updated_at
  BEFORE UPDATE ON activity_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Made with Bob
