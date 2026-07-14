-- TEACHER GRADE & SUBJECT ASSIGNMENTS - CBC CURRICULUM
-- (moved from studio/supabase/migrations)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS teacher_grade_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  grade TEXT NOT NULL CHECK (grade IN (
    'PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3',
    'Grade 4', 'Grade 5', 'Grade 6',
    'Grade 7', 'Grade 8', 'Grade 9'
  )),
  level TEXT NOT NULL CHECK (level IN (
    'pre-primary','lower-primary','upper-primary','junior-secondary'
  )),
  teaching_model TEXT NOT NULL DEFAULT 'generalist' CHECK (teaching_model IN ('generalist','specialist')),
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, grade)
);

CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  subject_category TEXT CHECK (subject_category IN ('core','science','humanities','religious','practical','creative')),
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, grade, subject)
);

CREATE INDEX IF NOT EXISTS idx_teacher_grade_teacher ON teacher_grade_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_teacher ON teacher_subject_assignments(teacher_id);
