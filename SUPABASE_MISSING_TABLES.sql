-- ============================================================================
-- MISSING TABLES FOR SYNCSENTA2 SUPABASE PROJECT
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/chsnemyqqvhqwrjzhzwo/sql
-- ============================================================================

-- ============================================================================
-- TEACHER FEEDBACK LOOP TABLES (6 tables)
-- ============================================================================

-- 1. AI Decisions Table
CREATE TABLE IF NOT EXISTS ai_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id TEXT UNIQUE NOT NULL,
  student_id UUID,
  teacher_id UUID,
  session_id TEXT,
  competency TEXT,
  grade TEXT,
  subject TEXT,
  decision_type TEXT NOT NULL,
  ai_action TEXT NOT NULL,
  ai_reasoning TEXT,
  student_telemetry JSONB,
  interaction_history JSONB,
  fired_rules JSONB,
  scaffolding_level TEXT,
  ai_response TEXT,
  examples_used JSONB,
  student_region TEXT,
  language_preference TEXT,
  teacher_feedback TEXT,
  teacher_comment TEXT,
  teacher_suggested_alternative TEXT,
  student_outcome TEXT,
  student_outcome_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  feedback_received_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_decisions_teacher_id ON ai_decisions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_student_id ON ai_decisions(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_competency ON ai_decisions(competency);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_decision_type ON ai_decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_teacher_feedback ON ai_decisions(teacher_feedback);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_created_at ON ai_decisions(created_at);

-- 2. Learned Rules Table
CREATE TABLE IF NOT EXISTS learned_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id TEXT UNIQUE NOT NULL,
  rule_name TEXT NOT NULL,
  rule_description TEXT NOT NULL,
  conditions JSONB NOT NULL,
  action TEXT NOT NULL,
  scaffolding_level TEXT,
  discovered_from TEXT,
  confidence FLOAT DEFAULT 0.5,
  times_applied INTEGER DEFAULT 0,
  times_helpful INTEGER DEFAULT 0,
  times_not_helpful INTEGER DEFAULT 0,
  applicable_regions TEXT[],
  applicable_grades TEXT[],
  applicable_subjects TEXT[],
  status TEXT DEFAULT 'proposed',
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  supporting_decisions UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learned_rules_status ON learned_rules(status);
CREATE INDEX IF NOT EXISTS idx_learned_rules_confidence ON learned_rules(confidence);
CREATE INDEX IF NOT EXISTS idx_learned_rules_applicable_regions ON learned_rules USING GIN(applicable_regions);
CREATE INDEX IF NOT EXISTS idx_learned_rules_applicable_grades ON learned_rules USING GIN(applicable_grades);

-- 3. Cultural Patterns Table
CREATE TABLE IF NOT EXISTS cultural_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name TEXT NOT NULL,
  pattern_type TEXT NOT NULL,
  region TEXT,
  grade TEXT,
  subject TEXT,
  competency TEXT,
  pattern_data JSONB NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  success_rate FLOAT,
  confidence FLOAT,
  supporting_decisions UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cultural_patterns_region ON cultural_patterns(region);
CREATE INDEX IF NOT EXISTS idx_cultural_patterns_pattern_type ON cultural_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_cultural_patterns_success_rate ON cultural_patterns(success_rate);

-- 4. Teacher Rule Proposals Table
CREATE TABLE IF NOT EXISTS teacher_rule_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  teacher_name TEXT,
  proposed_rule_name TEXT NOT NULL,
  proposed_rule_description TEXT NOT NULL,
  proposed_conditions JSONB NOT NULL,
  proposed_action TEXT NOT NULL,
  based_on_decision_id UUID,
  applicable_context JSONB,
  teacher_reasoning TEXT NOT NULL,
  example_scenarios TEXT,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  implemented_as_rule_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_rule_proposals_teacher_id ON teacher_rule_proposals(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_rule_proposals_status ON teacher_rule_proposals(status);
CREATE INDEX IF NOT EXISTS idx_teacher_rule_proposals_created_at ON teacher_rule_proposals(created_at);

-- 5. Rule Votes Table
CREATE TABLE IF NOT EXISTS rule_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  vote TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proposal_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_rule_votes_proposal_id ON rule_votes(proposal_id);

-- 6. Rule A/B Tests Table
CREATE TABLE IF NOT EXISTS rule_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL,
  test_name TEXT NOT NULL,
  control_group_size INTEGER,
  treatment_group_size INTEGER,
  control_success_rate FLOAT,
  treatment_success_rate FLOAT,
  statistical_significance FLOAT,
  test_result TEXT,
  decision TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rule_ab_tests_rule_id ON rule_ab_tests(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_ab_tests_test_result ON rule_ab_tests(test_result);

-- ============================================================================
-- LESSON ARCHITECT TABLES (2 tables)
-- ============================================================================

-- 7. Schemes Table
CREATE TABLE IF NOT EXISTS schemes (
    scheme_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    grade TEXT NOT NULL,
    subject TEXT NOT NULL,
    term TEXT NOT NULL,
    mode TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    language TEXT DEFAULT 'english',
    total_weeks INTEGER NOT NULL,
    lessons_per_week INTEGER NOT NULL,
    rows JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schemes_teacher ON schemes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schemes_grade_subject ON schemes(grade, subject);
CREATE INDEX IF NOT EXISTS idx_schemes_term ON schemes(term);
CREATE INDEX IF NOT EXISTS idx_schemes_created ON schemes(created_at DESC);

-- 8. Lesson Plans Table
CREATE TABLE IF NOT EXISTS lesson_plans (
    lesson_plan_id TEXT PRIMARY KEY,
    scheme_id TEXT NOT NULL REFERENCES schemes(scheme_id) ON DELETE CASCADE,
    teacher_id TEXT NOT NULL,
    title TEXT NOT NULL,
    grade TEXT NOT NULL,
    subject TEXT NOT NULL,
    week INTEGER NOT NULL,
    lesson_number INTEGER NOT NULL,
    duration_minutes INTEGER DEFAULT 40,
    learning_outcomes JSONB NOT NULL,
    key_questions JSONB NOT NULL,
    introduction JSONB NOT NULL,
    main_activities JSONB NOT NULL,
    differentiation JSONB NOT NULL,
    assessment JSONB NOT NULL,
    conclusion JSONB NOT NULL,
    teacher_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_plans_scheme ON lesson_plans(scheme_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher ON lesson_plans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_week ON lesson_plans(week);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_created ON lesson_plans(created_at DESC);

-- 9. Worksheets Table
CREATE TABLE IF NOT EXISTS worksheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_id TEXT UNIQUE NOT NULL,
  teacher_id TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  term TEXT,
  strand TEXT,
  sub_strand TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worksheets_teacher_id ON worksheets(teacher_id);
CREATE INDEX IF NOT EXISTS idx_worksheets_grade_subject ON worksheets(grade, subject);
CREATE INDEX IF NOT EXISTS idx_worksheets_term ON worksheets(term);
CREATE INDEX IF NOT EXISTS idx_worksheets_created_at ON worksheets(created_at DESC);

-- 10. Unpacked Outcomes Table
CREATE TABLE IF NOT EXISTS unpacked_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unpacked_id TEXT UNIQUE NOT NULL,
  teacher_id TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  outcome TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unpacked_outcomes_teacher_id ON unpacked_outcomes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_unpacked_outcomes_grade_subject ON unpacked_outcomes(grade, subject);
CREATE INDEX IF NOT EXISTS idx_unpacked_outcomes_created_at ON unpacked_outcomes(created_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_schemes_updated_at BEFORE UPDATE ON schemes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_plans_updated_at BEFORE UPDATE ON lesson_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Get teacher feedback summary
CREATE OR REPLACE FUNCTION get_teacher_feedback_summary(teacher_uuid UUID)
RETURNS TABLE (
  total_decisions BIGINT,
  feedback_given BIGINT,
  helpful_count BIGINT,
  not_helpful_count BIGINT,
  feedback_rate FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_decisions,
    COUNT(teacher_feedback)::BIGINT as feedback_given,
    COUNT(*) FILTER (WHERE teacher_feedback = 'helpful')::BIGINT as helpful_count,
    COUNT(*) FILTER (WHERE teacher_feedback = 'not_helpful')::BIGINT as not_helpful_count,
    (COUNT(teacher_feedback)::FLOAT / NULLIF(COUNT(*), 0)) as feedback_rate
  FROM ai_decisions
  WHERE teacher_id = teacher_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get top performing rules
CREATE OR REPLACE FUNCTION get_top_rules(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  rule_id TEXT,
  rule_name TEXT,
  success_rate FLOAT,
  times_applied INTEGER,
  confidence FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lr.rule_id,
    lr.rule_name,
    (lr.times_helpful::FLOAT / NULLIF(lr.times_applied, 0)) as success_rate,
    lr.times_applied,
    lr.confidence
  FROM learned_rules lr
  WHERE lr.status = 'active'
    AND lr.times_applied > 10
  ORDER BY (lr.times_helpful::FLOAT / NULLIF(lr.times_applied, 0)) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this after to verify all tables were created:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- ORDER BY table_name;
