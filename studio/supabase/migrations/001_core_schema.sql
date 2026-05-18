-- ═══════════════════════════════════════════════════════════════════════════
-- MWALIMU AI - CORE PRODUCTION SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose: User authentication, student data, conversation history, progress tracking
-- Run in Supabase SQL Editor: https://app.supabase.com/project/_/sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════
-- USERS & AUTHENTICATION
-- ═══════════════════════════════════════════════════════════════════════════

-- User Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Info
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone_number TEXT,
  
  -- Role
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
  
  -- Student-specific
  grade TEXT, -- 'Grade 1', 'Grade 2', ..., 'Grade 9'
  school_name TEXT,
  student_id TEXT, -- School-assigned ID
  date_of_birth DATE,
  
  -- Teacher-specific
  subjects TEXT[], -- ['Mathematics', 'Science']
  classes TEXT[], -- ['Grade 4A', 'Grade 5B']
  
  -- Parent-specific
  children_ids UUID[], -- Array of student profile IDs
  
  -- Preferences
  language_preference TEXT DEFAULT 'mixed' CHECK (language_preference IN ('english', 'kiswahili', 'mixed')),
  region TEXT, -- 'nairobi', 'mombasa', 'kisumu', 'rural'
  timezone TEXT DEFAULT 'Africa/Nairobi',
  
  -- Subscription
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'school')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'trial')),
  subscription_started_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_grade ON profiles(grade);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Teachers can view their students' profiles
CREATE POLICY "Teachers can view student profiles"
  ON profiles FOR SELECT
  USING (
    role = 'student' AND
    EXISTS (
      SELECT 1 FROM profiles teacher
      WHERE teacher.id = auth.uid()
        AND teacher.role = 'teacher'
        AND profiles.grade = ANY(teacher.classes)
    )
  );

-- Parents can view their children's profiles
CREATE POLICY "Parents can view children profiles"
  ON profiles FOR SELECT
  USING (
    role = 'student' AND
    EXISTS (
      SELECT 1 FROM profiles parent
      WHERE parent.id = auth.uid()
        AND parent.role = 'parent'
        AND profiles.id = ANY(parent.children_ids)
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- CHAT SESSIONS & MESSAGES
-- ═══════════════════════════════════════════════════════════════════════════

-- Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Session Details
  subject TEXT NOT NULL, -- 'Mathematics', 'Science', 'English', etc.
  grade TEXT NOT NULL,
  mode TEXT DEFAULT 'socratic' CHECK (mode IN ('socratic', 'compass', 'homework_help')),
  
  -- Context
  teacher_context TEXT, -- For compass mode
  learning_objective TEXT, -- What student is trying to learn
  
  -- Metadata
  title TEXT, -- Auto-generated or user-set
  message_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_subject ON chat_sessions(subject);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message_at ON chat_sessions(last_message_at DESC);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Message Content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- Metadata
  tokens_used INTEGER,
  model TEXT, -- 'llama-3.3-70b-versatile', etc.
  latency_ms INTEGER, -- Response time
  
  -- Choices (for Socratic mode)
  choices TEXT[], -- Extracted [CHOICE: ...] options
  selected_choice TEXT, -- If user clicked a choice
  
  -- Feedback
  helpful BOOLEAN, -- User feedback: thumbs up/down
  feedback_comment TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);

-- RLS Policies for Chat Sessions
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view student sessions"
  ON chat_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles teacher
      WHERE teacher.id = auth.uid()
        AND teacher.role = 'teacher'
        AND EXISTS (
          SELECT 1 FROM profiles student
          WHERE student.id = chat_sessions.user_id
            AND student.grade = ANY(teacher.classes)
        )
    )
  );

-- RLS Policies for Chat Messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
  ON chat_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view student messages"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles teacher
      WHERE teacher.id = auth.uid()
        AND teacher.role = 'teacher'
        AND EXISTS (
          SELECT 1 FROM profiles student
          WHERE student.id = chat_messages.user_id
            AND student.grade = ANY(teacher.classes)
        )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- STUDENT PROGRESS & ANALYTICS
-- ═══════════════════════════════════════════════════════════════════════════

-- Learning Progress (competency-based tracking)
CREATE TABLE IF NOT EXISTS learning_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Competency
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  competency_code TEXT NOT NULL, -- 'MATH.G4.FRACTIONS', 'SCI.G5.PLANTS'
  competency_name TEXT NOT NULL,
  strand TEXT, -- 'Numbers', 'Algebra', 'Living Things'
  
  -- Progress
  mastery_level TEXT DEFAULT 'not_started' CHECK (mastery_level IN ('not_started', 'emerging', 'developing', 'proficient', 'mastered')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  
  -- Engagement
  questions_asked INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  
  -- Timestamps
  first_attempted_at TIMESTAMPTZ DEFAULT NOW(),
  last_practiced_at TIMESTAMPTZ DEFAULT NOW(),
  mastered_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_id ON learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_competency ON learning_progress(competency_code);
CREATE INDEX IF NOT EXISTS idx_learning_progress_mastery ON learning_progress(mastery_level);
CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_progress_unique ON learning_progress(user_id, competency_code);

-- Daily Activity Log
CREATE TABLE IF NOT EXISTS daily_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Date
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Metrics
  messages_sent INTEGER DEFAULT 0,
  sessions_started INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  subjects_practiced TEXT[], -- ['Mathematics', 'Science']
  
  -- Streaks
  daily_streak INTEGER DEFAULT 0, -- Consecutive days active
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_activity_user_id ON daily_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_activity_date ON daily_activity(activity_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_activity_unique ON daily_activity(user_id, activity_date);

-- Achievements & Badges
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Achievement Details
  achievement_type TEXT NOT NULL, -- 'streak_7', 'mastered_fractions', 'first_session'
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  badge_icon TEXT, -- URL or emoji
  
  -- Metadata
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_achievements_earned_at ON achievements(earned_at DESC);

-- RLS Policies for Progress Tables
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Users can view own progress
CREATE POLICY "Users can view own progress"
  ON learning_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON learning_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON learning_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Similar policies for daily_activity
CREATE POLICY "Users can view own activity"
  ON daily_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
  ON daily_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity"
  ON daily_activity FOR UPDATE
  USING (auth.uid() = user_id);

-- Similar policies for achievements
CREATE POLICY "Users can view own achievements"
  ON achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Teachers can view student progress
CREATE POLICY "Teachers can view student progress"
  ON learning_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles teacher
      WHERE teacher.id = auth.uid()
        AND teacher.role = 'teacher'
        AND EXISTS (
          SELECT 1 FROM profiles student
          WHERE student.id = learning_progress.user_id
            AND student.grade = ANY(teacher.classes)
        )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- USAGE & RATE LIMITING
-- ═══════════════════════════════════════════════════════════════════════════

-- API Usage Tracking
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Request Details
  endpoint TEXT NOT NULL, -- '/api/chat', '/api/generate/lesson-plan'
  method TEXT NOT NULL, -- 'POST', 'GET'
  
  -- Usage
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6), -- Track costs
  
  -- Response
  status_code INTEGER,
  latency_ms INTEGER,
  
  -- Rate Limiting
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_ip_address ON api_usage(ip_address);

-- Daily Quotas (for rate limiting)
CREATE TABLE IF NOT EXISTS daily_quotas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Date
  quota_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Limits
  messages_used INTEGER DEFAULT 0,
  messages_limit INTEGER DEFAULT 50, -- Free tier: 50/day
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_quotas_user_id ON daily_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_quotas_date ON daily_quotas(quota_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_quotas_unique ON daily_quotas(user_id, quota_date);

-- RLS Policies
ALTER TABLE daily_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quotas"
  ON daily_quotas FOR SELECT
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_activity_updated_at
  BEFORE UPDATE ON daily_activity
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_quotas_updated_at
  BEFORE UPDATE ON daily_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Check daily quota
CREATE OR REPLACE FUNCTION check_daily_quota(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_messages_used INTEGER;
  v_messages_limit INTEGER;
  v_subscription_tier TEXT;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_subscription_tier
  FROM profiles
  WHERE id = p_user_id;
  
  -- Premium users have unlimited messages
  IF v_subscription_tier IN ('premium', 'school') THEN
    RETURN TRUE;
  END IF;
  
  -- Get or create today's quota
  INSERT INTO daily_quotas (user_id, quota_date, messages_used, messages_limit)
  VALUES (p_user_id, CURRENT_DATE, 0, 50)
  ON CONFLICT (user_id, quota_date) DO NOTHING;
  
  -- Check quota
  SELECT messages_used, messages_limit INTO v_messages_used, v_messages_limit
  FROM daily_quotas
  WHERE user_id = p_user_id AND quota_date = CURRENT_DATE;
  
  RETURN v_messages_used < v_messages_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment daily quota
CREATE OR REPLACE FUNCTION increment_daily_quota(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_quotas (user_id, quota_date, messages_used, messages_limit)
  VALUES (p_user_id, CURRENT_DATE, 1, 50)
  ON CONFLICT (user_id, quota_date)
  DO UPDATE SET
    messages_used = daily_quotas.messages_used + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user stats
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
  total_sessions BIGINT,
  total_messages BIGINT,
  total_time_minutes BIGINT,
  current_streak INTEGER,
  competencies_mastered BIGINT,
  achievements_earned BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM chat_sessions WHERE user_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM chat_messages WHERE user_id = p_user_id AND role = 'user')::BIGINT,
    (SELECT COALESCE(SUM(time_spent_minutes), 0) FROM daily_activity WHERE user_id = p_user_id)::BIGINT,
    (SELECT COALESCE(MAX(daily_streak), 0) FROM daily_activity WHERE user_id = p_user_id)::INTEGER,
    (SELECT COUNT(*) FROM learning_progress WHERE user_id = p_user_id AND mastery_level = 'mastered')::BIGINT,
    (SELECT COUNT(*) FROM achievements WHERE user_id = p_user_id)::BIGINT;
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
      'profiles',
      'chat_sessions',
      'chat_messages',
      'learning_progress',
      'daily_activity',
      'achievements',
      'api_usage',
      'daily_quotas'
    );
  
  RAISE NOTICE '✅ Created % core tables for Mwalimu AI', table_count;
END $$;
