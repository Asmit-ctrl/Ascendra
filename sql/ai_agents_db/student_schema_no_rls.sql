-- Student Dashboard Database Schema (NO RLS)
-- Tables for student profiles, progress tracking, and chat history

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  school TEXT,
  preferred_language TEXT DEFAULT 'english',
  learning_style TEXT,
  interests TEXT[],
  strengths TEXT[],
  challenges TEXT[],
  cultural_context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for students
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school);

-- Student progress table
CREATE TABLE IF NOT EXISTS student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  subject TEXT NOT NULL,
  overall_progress INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  average_session_time INTEGER DEFAULT 0,
  current_topic TEXT,
  next_topic TEXT,
  last_session_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for student_progress
CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_subject ON student_progress(subject);
CREATE INDEX IF NOT EXISTS idx_student_progress_updated_at ON student_progress(updated_at DESC);

-- Chat history table
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  message TEXT NOT NULL,
  sender TEXT NOT NULL, -- 'student', 'agent', 'teacher'
  agent_name TEXT,
  agents_used TEXT[],
  subject TEXT,
  emotional_state JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for chat_history
CREATE INDEX IF NOT EXISTS idx_chat_history_student_id ON chat_history(student_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at DESC);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed'
  grade_received TEXT,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for assignments
CREATE INDEX IF NOT EXISTS idx_assignments_student_id ON assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON assignments(subject);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);

-- Learning sessions table
CREATE TABLE IF NOT EXISTS learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT,
  duration_minutes INTEGER NOT NULL,
  messages_count INTEGER DEFAULT 0,
  emotional_states JSONB,
  competencies_practiced TEXT[],
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for learning_sessions
CREATE INDEX IF NOT EXISTS idx_learning_sessions_student_id ON learning_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_subject ON learning_sessions(subject);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_started_at ON learning_sessions(started_at DESC);

-- Student achievements/badges table
CREATE TABLE IF NOT EXISTS student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  achievement_type TEXT NOT NULL, -- 'badge', 'milestone', 'streak'
  achievement_id TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  points_earned INTEGER DEFAULT 0,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for student_achievements
CREATE INDEX IF NOT EXISTS idx_student_achievements_student_id ON student_achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_type ON student_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_student_achievements_earned_at ON student_achievements(earned_at DESC);

-- Competency mastery tracking
CREATE TABLE IF NOT EXISTS competency_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  competency_id TEXT NOT NULL,
  competency_name TEXT NOT NULL,
  mastery_level INTEGER DEFAULT 0, -- 0-100
  status TEXT DEFAULT 'not-started', -- 'not-started', 'in-progress', 'mastered'
  total_practices INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  games_recommended BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, competency_id)
);

-- Indexes for competency_mastery
CREATE INDEX IF NOT EXISTS idx_competency_mastery_student_id ON competency_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_competency_mastery_subject ON competency_mastery(subject);
CREATE INDEX IF NOT EXISTS idx_competency_mastery_status ON competency_mastery(status);
CREATE INDEX IF NOT EXISTS idx_competency_mastery_updated_at ON competency_mastery(updated_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_student_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_student_updated_at();

CREATE TRIGGER update_student_progress_updated_at BEFORE UPDATE ON student_progress
    FOR EACH ROW EXECUTE FUNCTION update_student_updated_at();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION update_student_updated_at();

CREATE TRIGGER update_competency_mastery_updated_at BEFORE UPDATE ON competency_mastery
    FOR EACH ROW EXECUTE FUNCTION update_student_updated_at();

-- Comments for documentation
COMMENT ON TABLE students IS 'Student profiles with learning preferences and cultural context';
COMMENT ON TABLE student_progress IS 'Tracks learning progress across subjects';
COMMENT ON TABLE chat_history IS 'Stores all student-AI tutor conversations';
COMMENT ON TABLE assignments IS 'Student assignments and homework tracking';
COMMENT ON TABLE learning_sessions IS 'Records of individual learning sessions';
COMMENT ON TABLE student_achievements IS 'Gamification badges and achievements';
COMMENT ON TABLE competency_mastery IS 'Fine-grained competency mastery tracking for CBC curriculum';

-- NOTE: RLS is NOT enabled in this version
-- This allows the tables to work without authentication issues
-- The backend uses service_role key which bypasses RLS anyway
