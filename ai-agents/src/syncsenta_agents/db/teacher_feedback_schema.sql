-- Teacher Feedback Loop Schema
-- Enables self-learning pedagogical intelligence

-- AI Decision Log: Every tutoring/teaching decision made by AI
CREATE TABLE IF NOT EXISTS ai_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id TEXT UNIQUE NOT NULL, -- For referencing
  
  -- Context
  student_id UUID REFERENCES auth.users(id),
  teacher_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  competency TEXT, -- e.g., "MATH.G4.FRACTIONS"
  grade TEXT,
  subject TEXT,
  
  -- Decision Details
  decision_type TEXT NOT NULL, -- 'tutoring_response', 'intervention', 'content_generation'
  ai_action TEXT NOT NULL, -- What AI decided to do
  ai_reasoning TEXT, -- Why (from fired rules)
  
  -- Input Data
  student_telemetry JSONB, -- Behavioral data that led to decision
  interaction_history JSONB, -- Past interactions
  fired_rules JSONB, -- Which pedagogical rules fired
  scaffolding_level TEXT, -- minimal, moderate, substantial
  
  -- Output
  ai_response TEXT, -- What AI said/generated
  examples_used JSONB, -- ["matatu", "shillings"] for cultural tracking
  
  -- Cultural Context
  student_region TEXT, -- nairobi, kisumu, mombasa, rural
  language_preference TEXT, -- english, swahili, sheng
  
  -- Outcomes (filled later)
  teacher_feedback TEXT, -- 'helpful', 'not_helpful', 'needs_improvement'
  teacher_comment TEXT, -- Free text feedback
  teacher_suggested_alternative TEXT, -- What teacher would have done instead
  student_outcome TEXT, -- 'improved', 'no_change', 'declined'
  student_outcome_data JSONB, -- Metrics showing outcome
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  feedback_received_at TIMESTAMPTZ,
  
  -- Indexes for querying
  INDEX idx_teacher_id (teacher_id),
  INDEX idx_student_id (student_id),
  INDEX idx_competency (competency),
  INDEX idx_decision_type (decision_type),
  INDEX idx_teacher_feedback (teacher_feedback),
  INDEX idx_created_at (created_at)
);

-- Learned Pedagogical Rules: Rules discovered from teacher feedback
CREATE TABLE IF NOT EXISTS learned_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id TEXT UNIQUE NOT NULL,
  
  -- Rule Definition
  rule_name TEXT NOT NULL,
  rule_description TEXT NOT NULL,
  conditions JSONB NOT NULL, -- When to apply this rule
  action TEXT NOT NULL, -- What to do
  scaffolding_level TEXT,
  
  -- Learning Metadata
  discovered_from TEXT, -- 'teacher_feedback', 'pattern_mining', 'manual'
  confidence FLOAT DEFAULT 0.5, -- 0.0 to 1.0
  times_applied INTEGER DEFAULT 0,
  times_helpful INTEGER DEFAULT 0,
  times_not_helpful INTEGER DEFAULT 0,
  
  -- Cultural Context
  applicable_regions TEXT[], -- ['nairobi', 'rural'] or NULL for all
  applicable_grades TEXT[], -- ['Grade 4', 'Grade 5'] or NULL for all
  applicable_subjects TEXT[], -- ['Mathematics'] or NULL for all
  
  -- Validation
  status TEXT DEFAULT 'proposed', -- 'proposed', 'validated', 'active', 'deprecated'
  validated_by UUID REFERENCES auth.users(id), -- Teacher who validated
  validated_at TIMESTAMPTZ,
  
  -- Evidence
  supporting_decisions UUID[], -- Array of ai_decisions.id that support this rule
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_status (status),
  INDEX idx_confidence (confidence),
  INDEX idx_applicable_regions (applicable_regions),
  INDEX idx_applicable_grades (applicable_grades)
);

-- Cultural Context Patterns: Track what works in different contexts
CREATE TABLE IF NOT EXISTS cultural_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pattern Definition
  pattern_name TEXT NOT NULL,
  pattern_type TEXT NOT NULL, -- 'example_preference', 'misconception', 'teaching_style'
  
  -- Context
  region TEXT, -- nairobi, kisumu, rural, etc.
  grade TEXT,
  subject TEXT,
  competency TEXT,
  
  -- Pattern Data
  pattern_data JSONB NOT NULL, -- Flexible storage for pattern details
  
  -- Statistics
  occurrence_count INTEGER DEFAULT 1,
  success_rate FLOAT, -- 0.0 to 1.0
  confidence FLOAT, -- 0.0 to 1.0
  
  -- Evidence
  supporting_decisions UUID[], -- ai_decisions that show this pattern
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_region (region),
  INDEX idx_pattern_type (pattern_type),
  INDEX idx_success_rate (success_rate)
);

-- Teacher Rule Proposals: Teachers can propose new rules
CREATE TABLE IF NOT EXISTS teacher_rule_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Proposer
  teacher_id UUID REFERENCES auth.users(id) NOT NULL,
  teacher_name TEXT,
  
  -- Proposal
  proposed_rule_name TEXT NOT NULL,
  proposed_rule_description TEXT NOT NULL,
  proposed_conditions JSONB NOT NULL,
  proposed_action TEXT NOT NULL,
  
  -- Context
  based_on_decision_id UUID REFERENCES ai_decisions(id), -- Optional: what triggered this
  applicable_context JSONB, -- regions, grades, subjects
  
  -- Justification
  teacher_reasoning TEXT NOT NULL, -- Why this rule would help
  example_scenarios TEXT, -- When this would be useful
  
  -- Community Validation
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'implemented'
  
  -- Admin Review
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- If approved, link to learned_rule
  implemented_as_rule_id UUID REFERENCES learned_rules(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_teacher_id (teacher_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Rule Votes: Teachers vote on proposed rules
CREATE TABLE IF NOT EXISTS rule_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  proposal_id UUID REFERENCES teacher_rule_proposals(id) NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) NOT NULL,
  vote TEXT NOT NULL, -- 'upvote', 'downvote'
  comment TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(proposal_id, teacher_id), -- One vote per teacher per proposal
  INDEX idx_proposal_id (proposal_id)
);

-- A/B Test Results: Track performance of new rules
CREATE TABLE IF NOT EXISTS rule_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  rule_id UUID REFERENCES learned_rules(id) NOT NULL,
  
  -- Test Configuration
  test_name TEXT NOT NULL,
  control_group_size INTEGER,
  treatment_group_size INTEGER,
  
  -- Results
  control_success_rate FLOAT,
  treatment_success_rate FLOAT,
  statistical_significance FLOAT, -- p-value
  
  -- Decision
  test_result TEXT, -- 'rule_effective', 'rule_ineffective', 'inconclusive'
  decision TEXT, -- 'activate', 'reject', 'continue_testing'
  
  -- Metadata
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  INDEX idx_rule_id (rule_id),
  INDEX idx_test_result (test_result)
);

-- Row Level Security Policies

-- Teachers can see their own feedback
ALTER TABLE ai_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their students' AI decisions"
  ON ai_decisions FOR SELECT
  USING (
    auth.uid() = teacher_id
    OR auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Teachers can update feedback on their decisions"
  ON ai_decisions FOR UPDATE
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- Teachers can propose rules
ALTER TABLE teacher_rule_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view all proposals"
  ON teacher_rule_proposals FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('teacher', 'admin'));

CREATE POLICY "Teachers can create proposals"
  ON teacher_rule_proposals FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own proposals"
  ON teacher_rule_proposals FOR UPDATE
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- Teachers can vote on proposals
ALTER TABLE rule_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view all votes"
  ON rule_votes FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('teacher', 'admin'));

CREATE POLICY "Teachers can create votes"
  ON rule_votes FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Learned rules are public (read-only for teachers)
ALTER TABLE learned_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active rules"
  ON learned_rules FOR SELECT
  USING (status = 'active' OR auth.jwt() ->> 'role' = 'admin');

-- Cultural patterns are public
ALTER TABLE cultural_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view cultural patterns"
  ON cultural_patterns FOR SELECT
  USING (true);

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
    AND lr.times_applied > 10 -- Minimum sample size
  ORDER BY (lr.times_helpful::FLOAT / NULLIF(lr.times_applied, 0)) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
