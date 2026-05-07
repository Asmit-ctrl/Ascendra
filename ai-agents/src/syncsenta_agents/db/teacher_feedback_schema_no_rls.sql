-- Teacher Feedback Loop Schema (WITHOUT RLS)
-- Run this version if RLS policies are causing UUID casting errors

-- AI Decision Log: Every tutoring/teaching decision made by AI
CREATE TABLE IF NOT EXISTS ai_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id TEXT UNIQUE NOT NULL,
  
  -- Context
  student_id UUID,
  teacher_id UUID,
  session_id TEXT,
  competency TEXT,
  grade TEXT,
  subject TEXT,
  
  -- Decision Details
  decision_type TEXT NOT NULL,
  ai_action TEXT NOT NULL,
  ai_reasoning TEXT,
  
  -- Input Data
  student_telemetry JSONB,
  interaction_history JSONB,
  fired_rules JSONB,
  scaffolding_level TEXT,
  
  -- Output
  ai_response TEXT,
  examples_used JSONB,
  
  -- Cultural Context
  student_region TEXT,
  language_preference TEXT,
  
  -- Outcomes
  teacher_feedback TEXT,
  teacher_comment TEXT,
  teacher_suggested_alternative TEXT,
  student_outcome TEXT,
  student_outcome_data JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  feedback_received_at TIMESTAMPTZ
);

-- Indexes for ai_decisions
CREATE INDEX IF NOT EXISTS idx_ai_decisions_teacher_id ON ai_decisions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_student_id ON ai_decisions(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_competency ON ai_decisions(competency);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_decision_type ON ai_decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_teacher_feedback ON ai_decisions(teacher_feedback);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_created_at ON ai_decisions(created_at);

-- Learned Pedagogical Rules
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

-- Indexes for learned_rules
CREATE INDEX IF NOT EXISTS idx_learned_rules_status ON learned_rules(status);
CREATE INDEX IF NOT EXISTS idx_learned_rules_confidence ON learned_rules(confidence);
CREATE INDEX IF NOT EXISTS idx_learned_rules_applicable_regions ON learned_rules USING GIN(applicable_regions);
CREATE INDEX IF NOT EXISTS idx_learned_rules_applicable_grades ON learned_rules USING GIN(applicable_grades);

-- Cultural Context Patterns
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

-- Indexes for cultural_patterns
CREATE INDEX IF NOT EXISTS idx_cultural_patterns_region ON cultural_patterns(region);
CREATE INDEX IF NOT EXISTS idx_cultural_patterns_pattern_type ON cultural_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_cultural_patterns_success_rate ON cultural_patterns(success_rate);

-- Teacher Rule Proposals
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

-- Indexes for teacher_rule_proposals
CREATE INDEX IF NOT EXISTS idx_teacher_rule_proposals_teacher_id ON teacher_rule_proposals(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_rule_proposals_status ON teacher_rule_proposals(status);
CREATE INDEX IF NOT EXISTS idx_teacher_rule_proposals_created_at ON teacher_rule_proposals(created_at);

-- Rule Votes
CREATE TABLE IF NOT EXISTS rule_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  proposal_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  vote TEXT NOT NULL,
  comment TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(proposal_id, teacher_id)
);

-- Indexes for rule_votes
CREATE INDEX IF NOT EXISTS idx_rule_votes_proposal_id ON rule_votes(proposal_id);

-- A/B Test Results
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

-- Indexes for rule_ab_tests
CREATE INDEX IF NOT EXISTS idx_rule_ab_tests_rule_id ON rule_ab_tests(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_ab_tests_test_result ON rule_ab_tests(test_result);

-- Functions for analytics

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

-- NOTE: RLS is NOT enabled in this version
-- This allows the tables to work without authentication issues
-- Add RLS policies later if needed for production multi-tenancy
