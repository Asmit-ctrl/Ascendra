-- ═══════════════════════════════════════════════════════════════════════════
-- MWALIMU AI - TEACHER FEEDBACK LOOP DATABASE SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/_/sql
--
-- This creates the self-learning system that enables Mwalimu AI to improve
-- from teacher feedback and learn culturally-relevant pedagogical rules.
-- ═══════════════════════════════════════════════════════════════════════════

-- AI Decision Log: Every tutoring/teaching decision made by AI
CREATE TABLE IF NOT EXISTS ai_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id TEXT UNIQUE NOT NULL, -- For referencing
  
  -- Context
  student_id TEXT NOT NULL, -- Using TEXT instead of UUID for now
  teacher_id TEXT NOT NULL,
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
  feedback_received_at TIMESTAMPTZ
);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_ai_decisions_teacher_id ON ai_decisions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_student_id ON ai_decisions(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_competency ON ai_decisions(competency);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_decision_type ON ai_decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_teacher_feedback ON ai_decisions(teacher_feedback);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_created_at ON ai_decisions(created_at);

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
  validated_by TEXT, -- Teacher ID who validated
  validated_at TIMESTAMPTZ,
  
  -- Evidence
  supporting_decisions UUID[], -- Array of ai_decisions.id that support this rule
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learned_rules_status ON learned_rules(status);
CREATE INDEX IF NOT EXISTS idx_learned_rules_confidence ON learned_rules(confidence);
CREATE INDEX IF NOT EXISTS idx_learned_rules_applicable_regions ON learned_rules USING GIN(applicable_regions);
CREATE INDEX IF NOT EXISTS idx_learned_rules_applicable_grades ON learned_rules USING GIN(applicable_grades);

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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cultural_patterns_region ON cultural_patterns(region);
CREATE INDEX IF NOT EXISTS idx_cultural_patterns_pattern_type ON cultural_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_cultural_patterns_success_rate ON cultural_patterns(success_rate);

-- Teacher Rule Proposals: Teachers can propose new rules
CREATE TABLE IF NOT EXISTS teacher_rule_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Proposer
  teacher_id TEXT NOT NULL,
  teacher_name TEXT,
  
  -- Proposal
  proposed_rule_name TEXT NOT NULL,
  proposed_rule_description TEXT NOT NULL,
  proposed_conditions JSONB NOT NULL,
  proposed_action TEXT NOT NULL,
  
  -- Context
  based_on_decision_id UUID, -- Optional: what triggered this
  applicable_context JSONB, -- regions, grades, subjects
  
  -- Justification
  teacher_reasoning TEXT NOT NULL, -- Why this rule would help
  example_scenarios TEXT, -- When this would be useful
  
  -- Community Validation
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'implemented'
  
  -- Admin Review
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- If approved, link to learned_rule
  implemented_as_rule_id UUID,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_rule_proposals_teacher_id ON teacher_rule_proposals(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_rule_proposals_status ON teacher_rule_proposals(status);
CREATE INDEX IF NOT EXISTS idx_teacher_rule_proposals_created_at ON teacher_rule_proposals(created_at);

-- Rule Votes: Teachers vote on proposed rules
CREATE TABLE IF NOT EXISTS rule_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  proposal_id UUID NOT NULL,
  teacher_id TEXT NOT NULL,
  vote TEXT NOT NULL, -- 'upvote', 'downvote'
  comment TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(proposal_id, teacher_id) -- One vote per teacher per proposal
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rule_votes_proposal_id ON rule_votes(proposal_id);

-- A/B Test Results: Track performance of new rules
CREATE TABLE IF NOT EXISTS rule_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  rule_id UUID NOT NULL,
  
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
  ended_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rule_ab_tests_rule_id ON rule_ab_tests(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_ab_tests_test_result ON rule_ab_tests(test_result);

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS FOR ANALYTICS
-- ═══════════════════════════════════════════════════════════════════════════

-- Get teacher feedback summary
CREATE OR REPLACE FUNCTION get_teacher_feedback_summary(teacher_uuid TEXT)
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

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA: Initial pedagogical rules
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO learned_rules (rule_id, rule_name, rule_description, conditions, action, scaffolding_level, discovered_from, confidence, status, applicable_regions, applicable_grades, applicable_subjects)
VALUES
  (
    'use_matatu_for_nairobi_ratios',
    'Use Matatu Examples for Nairobi Students (Ratios)',
    'When teaching ratios to Nairobi students, use matatu fare examples',
    '{"region": "nairobi", "competency": "MATH.G4.FRACTIONS", "topic": "ratios"}'::jsonb,
    'Use matatu fare examples (50 bob, 100 bob) to explain ratios',
    'moderate',
    'manual',
    0.85,
    'active',
    ARRAY['nairobi'],
    ARRAY['Grade 4', 'Grade 5', 'Grade 6'],
    ARRAY['Mathematics']
  ),
  (
    'use_shamba_for_rural_measurement',
    'Use Shamba Examples for Rural Students (Measurement)',
    'When teaching measurement to rural students, use shamba/farm examples',
    '{"region": "rural", "competency": "MATH.G4.MEASUREMENT"}'::jsonb,
    'Use shamba examples (plot sizes, harvest quantities) for measurement',
    'moderate',
    'manual',
    0.82,
    'active',
    ARRAY['rural'],
    ARRAY['Grade 4', 'Grade 5', 'Grade 6'],
    ARRAY['Mathematics']
  ),
  (
    'high_erasure_needs_scaffolding',
    'High Erasure Count = Increase Scaffolding',
    'When student has high erasure count (>5), increase scaffolding level',
    '{"telemetry": {"erasure_count": {"$gt": 5}}}'::jsonb,
    'Provide step-by-step breakdown with examples',
    'substantial',
    'manual',
    0.90,
    'active',
    NULL,
    NULL,
    NULL
  )
ON CONFLICT (rule_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

-- Verify tables were created
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'ai_decisions',
      'learned_rules',
      'cultural_patterns',
      'teacher_rule_proposals',
      'rule_votes',
      'rule_ab_tests'
    );
  
  RAISE NOTICE '✅ Created % tables for Mwalimu AI Teacher Feedback Loop', table_count;
END $$;

-- Show initial rules
SELECT 
  rule_name,
  status,
  confidence,
  applicable_regions,
  applicable_grades
FROM learned_rules
WHERE status = 'active';
