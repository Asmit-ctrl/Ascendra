-- ============================================================================
-- TIER 1 TEACHER TOOLS TABLES
-- Migration for worksheets and unpacked_outcomes tables
-- ============================================================================

-- Worksheets Table
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

-- Unpacked Outcomes Table
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
