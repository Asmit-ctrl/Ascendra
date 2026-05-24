-- ============================================================================
-- TIER 2 TEACHER TOOLS TABLES
-- Migration for differentiations table (three-tier differentiation suggestions
-- generated against a Tier 1 lesson plan).
--
-- Row shape mirrors LessonArchitectAgent._save_differentiation in
-- ai-agents/src/syncsenta_agents/agents/lesson_architect.py:
--   differentiation_id, teacher_id, lesson_plan_id, grade, subject, strand,
--   sub_strand, payload JSONB, created_at.
--
-- payload contains the full Differentiation Pydantic model dump:
--   { title, grade, subject, strand, subStrand, objectives[],
--     support{learnerProfile, adaptations[{activity, note, ksa}],
--             resourceSwaps[], assessmentCues[]},
--     onGrade{...}, extension{...},
--     inclusionStrategies[], coreCompetencies[] }
-- ============================================================================

-- Differentiations Table
CREATE TABLE IF NOT EXISTS differentiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  differentiation_id TEXT UNIQUE NOT NULL,
  teacher_id TEXT NOT NULL,
  -- Nullable: caller may generate against an in-memory plan that wasn't saved.
  lesson_plan_id TEXT,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  strand TEXT,
  sub_strand TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_differentiations_teacher_id ON differentiations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_differentiations_grade_subject ON differentiations(grade, subject);
CREATE INDEX IF NOT EXISTS idx_differentiations_lesson_plan_id ON differentiations(lesson_plan_id);
CREATE INDEX IF NOT EXISTS idx_differentiations_created_at ON differentiations(created_at DESC);
