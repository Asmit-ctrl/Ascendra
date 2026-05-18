-- ═══════════════════════════════════════════════════════════════════════════
-- TEACHER DASHBOARD SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose: Real-time student monitoring, interventions, and class analytics
-- ═══════════════════════════════════════════════════════════════════════════

-- Teacher-Student Relationships
CREATE TABLE IF NOT EXISTS teacher_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationship
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Class Info
  class_name TEXT NOT NULL, -- 'Grade 4A', 'Grade 5B'
  subject TEXT, -- Optional: specific subject assignment
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
  
  -- Metadata
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(teacher_id, student_id, class_name)
);

CREATE INDEX IF NOT EXISTS idx_teacher_students_teacher ON teacher_students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_students_student ON teacher_students(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_students_class ON teacher_students(class_name);

-- Teacher Interventions
CREATE TABLE IF NOT EXISTS teacher_interventions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Parties
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Intervention Details
  intervention_type TEXT NOT NULL CHECK (intervention_type IN (
    'hint', 'encouragement', 'redirect', 'clarification', 'assignment', 'meeting_scheduled'
  )),
  message TEXT NOT NULL,
  
  -- Context
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  competency_code TEXT,
  
  -- Status
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'read', 'acknowledged', 'completed')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_interventions_teacher ON teacher_interventions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_interventions_student ON teacher_interventions(student_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON teacher_interventions(status);
CREATE INDEX IF NOT EXISTS idx_interventions_created ON teacher_interventions(created_at DESC);

-- Student Activity Alerts
CREATE TABLE IF NOT EXISTS student_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Student
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Alert Details
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'stuck', 'frustrated', 'off_topic', 'struggling', 'inactive', 'breakthrough', 'mastery'
  )),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  
  -- Context
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  competency_code TEXT,
  metadata JSONB, -- Additional context
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_student ON student_alerts(student_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON student_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON student_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON student_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON student_alerts(created_at DESC);

-- Class Performance Snapshots (for analytics)
CREATE TABLE IF NOT EXISTS class_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Class
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  
  -- Date
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Metrics
  total_students INTEGER DEFAULT 0,
  active_students INTEGER DEFAULT 0,
  average_session_duration_minutes INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  average_mastery_percentage INTEGER DEFAULT 0,
  
  -- Subject Breakdown
  subject_metrics JSONB, -- { "Mathematics": { "avg_mastery": 75, "active": 20 }, ... }
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(teacher_id, class_name, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_class_performance_teacher ON class_performance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_performance_date ON class_performance(snapshot_date DESC);

-- RLS Policies for Teacher Tables
ALTER TABLE teacher_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_performance ENABLE ROW LEVEL SECURITY;

-- Teachers can view their assigned students
CREATE POLICY "Teachers can view their students"
  ON teacher_students FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can manage their students"
  ON teacher_students FOR ALL
  USING (auth.uid() = teacher_id);

-- Teachers can view and create interventions for their students
CREATE POLICY "Teachers can view their interventions"
  ON teacher_interventions FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create interventions"
  ON teacher_interventions FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Students can view interventions sent to them
CREATE POLICY "Students can view their interventions"
  ON teacher_interventions FOR SELECT
  USING (auth.uid() = student_id);

-- Teachers can view alerts for their students
CREATE POLICY "Teachers can view student alerts"
  ON student_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teacher_students
      WHERE teacher_students.teacher_id = auth.uid()
        AND teacher_students.student_id = student_alerts.student_id
        AND teacher_students.status = 'active'
    )
  );

CREATE POLICY "Teachers can acknowledge alerts"
  ON student_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teacher_students
      WHERE teacher_students.teacher_id = auth.uid()
        AND teacher_students.student_id = student_alerts.student_id
        AND teacher_students.status = 'active'
    )
  );

-- Teachers can view their class performance
CREATE POLICY "Teachers can view class performance"
  ON class_performance FOR SELECT
  USING (auth.uid() = teacher_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS FOR TEACHER DASHBOARD
-- ═══════════════════════════════════════════════════════════════════════════

-- Get teacher's students with latest activity
CREATE OR REPLACE FUNCTION get_teacher_students(p_teacher_id UUID, p_class_name TEXT DEFAULT NULL)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  student_email TEXT,
  grade TEXT,
  class_name TEXT,
  last_active TIMESTAMPTZ,
  total_sessions BIGINT,
  total_messages BIGINT,
  current_streak INTEGER,
  competencies_mastered BIGINT,
  average_mastery_percentage INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.grade,
    ts.class_name,
    p.last_seen_at,
    (SELECT COUNT(*) FROM chat_sessions WHERE user_id = p.id)::BIGINT,
    (SELECT COUNT(*) FROM chat_messages WHERE user_id = p.id AND role = 'user')::BIGINT,
    (SELECT COALESCE(MAX(daily_streak), 0) FROM daily_activity WHERE user_id = p.id)::INTEGER,
    (SELECT COUNT(*) FROM learning_progress WHERE user_id = p.id AND mastery_level = 'mastered')::BIGINT,
    (SELECT COALESCE(AVG(progress_percentage)::INTEGER, 0) FROM learning_progress WHERE user_id = p.id)
  FROM profiles p
  INNER JOIN teacher_students ts ON ts.student_id = p.id
  WHERE ts.teacher_id = p_teacher_id
    AND ts.status = 'active'
    AND (p_class_name IS NULL OR ts.class_name = p_class_name)
  ORDER BY p.last_seen_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active alerts for teacher's students
CREATE OR REPLACE FUNCTION get_teacher_alerts(p_teacher_id UUID, p_severity TEXT DEFAULT NULL)
RETURNS TABLE (
  alert_id UUID,
  student_id UUID,
  student_name TEXT,
  alert_type TEXT,
  severity TEXT,
  title TEXT,
  description TEXT,
  session_id UUID,
  competency_code TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.id,
    sa.student_id,
    p.full_name,
    sa.alert_type,
    sa.severity,
    sa.title,
    sa.description,
    sa.session_id,
    sa.competency_code,
    sa.created_at
  FROM student_alerts sa
  INNER JOIN teacher_students ts ON ts.student_id = sa.student_id
  INNER JOIN profiles p ON p.id = sa.student_id
  WHERE ts.teacher_id = p_teacher_id
    AND ts.status = 'active'
    AND sa.status = 'active'
    AND (p_severity IS NULL OR sa.severity = p_severity)
  ORDER BY 
    CASE sa.severity
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    sa.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get class performance summary
CREATE OR REPLACE FUNCTION get_class_summary(p_teacher_id UUID, p_class_name TEXT)
RETURNS TABLE (
  total_students BIGINT,
  active_today BIGINT,
  active_this_week BIGINT,
  average_mastery_percentage INTEGER,
  total_sessions_today BIGINT,
  total_messages_today BIGINT,
  struggling_students BIGINT,
  excelling_students BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT ts.student_id)::BIGINT,
    COUNT(DISTINCT CASE WHEN p.last_seen_at >= CURRENT_DATE THEN ts.student_id END)::BIGINT,
    COUNT(DISTINCT CASE WHEN p.last_seen_at >= CURRENT_DATE - INTERVAL '7 days' THEN ts.student_id END)::BIGINT,
    (SELECT COALESCE(AVG(lp.progress_percentage)::INTEGER, 0)
     FROM learning_progress lp
     INNER JOIN teacher_students ts2 ON ts2.student_id = lp.user_id
     WHERE ts2.teacher_id = p_teacher_id AND ts2.class_name = p_class_name)::INTEGER,
    (SELECT COUNT(*)
     FROM chat_sessions cs
     INNER JOIN teacher_students ts3 ON ts3.student_id = cs.user_id
     WHERE ts3.teacher_id = p_teacher_id 
       AND ts3.class_name = p_class_name
       AND cs.started_at >= CURRENT_DATE)::BIGINT,
    (SELECT COUNT(*)
     FROM chat_messages cm
     INNER JOIN teacher_students ts4 ON ts4.student_id = cm.user_id
     WHERE ts4.teacher_id = p_teacher_id
       AND ts4.class_name = p_class_name
       AND cm.created_at >= CURRENT_DATE
       AND cm.role = 'user')::BIGINT,
    (SELECT COUNT(DISTINCT lp.user_id)
     FROM learning_progress lp
     INNER JOIN teacher_students ts5 ON ts5.student_id = lp.user_id
     WHERE ts5.teacher_id = p_teacher_id
       AND ts5.class_name = p_class_name
       AND lp.progress_percentage < 50)::BIGINT,
    (SELECT COUNT(DISTINCT lp.user_id)
     FROM learning_progress lp
     INNER JOIN teacher_students ts6 ON ts6.student_id = lp.user_id
     WHERE ts6.teacher_id = p_teacher_id
       AND ts6.class_name = p_class_name
       AND lp.mastery_level IN ('proficient', 'mastered'))::BIGINT
  FROM teacher_students ts
  INNER JOIN profiles p ON p.id = ts.student_id
  WHERE ts.teacher_id = p_teacher_id
    AND ts.class_name = p_class_name
    AND ts.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create alert for student
CREATE OR REPLACE FUNCTION create_student_alert(
  p_student_id UUID,
  p_alert_type TEXT,
  p_severity TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_session_id UUID DEFAULT NULL,
  p_competency_code TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO student_alerts (
    student_id,
    alert_type,
    severity,
    title,
    description,
    session_id,
    competency_code,
    metadata
  ) VALUES (
    p_student_id,
    p_alert_type,
    p_severity,
    p_title,
    p_description,
    p_session_id,
    p_competency_code,
    p_metadata
  )
  RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'teacher_students',
      'teacher_interventions',
      'student_alerts',
      'class_performance'
    );
  
  RAISE NOTICE '✅ Created % tables for Teacher Dashboard', table_count;
END $$;
