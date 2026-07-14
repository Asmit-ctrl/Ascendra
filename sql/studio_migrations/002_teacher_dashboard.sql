-- TEACHER DASHBOARD SCHEMA (moved from studio/supabase/migrations)

-- Teacher-Student Relationships
CREATE TABLE IF NOT EXISTS teacher_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
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
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  intervention_type TEXT NOT NULL CHECK (intervention_type IN (
    'hint', 'encouragement', 'redirect', 'clarification', 'assignment', 'meeting_scheduled'
  )),
  message TEXT NOT NULL,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  competency_code TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'read', 'acknowledged', 'completed')),
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
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'stuck', 'frustrated', 'off_topic', 'struggling', 'inactive', 'breakthrough', 'mastery'
  )),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  competency_code TEXT,
  metadata JSONB,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_student ON student_alerts(student_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON student_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON student_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON student_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON student_alerts(created_at DESC);

-- Class Performance Snapshots
CREATE TABLE IF NOT EXISTS class_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_students INTEGER DEFAULT 0,
  active_students INTEGER DEFAULT 0,
  average_session_duration_minutes INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  average_mastery_percentage INTEGER DEFAULT 0,
  subject_metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, class_name, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_class_performance_teacher ON class_performance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_performance_date ON class_performance(snapshot_date DESC);

-- RLS and policies omitted here (kept in original migration)
