-- ═══════════════════════════════════════════════════════════════════════════
-- TEACHER GRADE & SUBJECT ASSIGNMENTS - CBC CURRICULUM
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose: Track teacher assignments to grades and subjects per CBC structure
-- Lower Primary (Grades 1-3): Generalist model - no subject specialization
-- Upper Primary (Grades 4-6): Specialist model - subject-specific teaching
-- Junior Secondary (Grades 7-9): Specialist model - subject-specific teaching
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════
-- TEACHER GRADE ASSIGNMENTS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS teacher_grade_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Teacher Reference
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Grade Assignment
  grade TEXT NOT NULL CHECK (grade IN (
    'PP1', 'PP2', 
    'Grade 1', 'Grade 2', 'Grade 3',
    'Grade 4', 'Grade 5', 'Grade 6',
    'Grade 7', 'Grade 8', 'Grade 9'
  )),
  
  -- CBC Level Classification
  level TEXT NOT NULL CHECK (level IN (
    'pre-primary',
    'lower-primary',
    'upper-primary',
    'junior-secondary'
  )),
  
  -- Teaching Model
  teaching_model TEXT NOT NULL DEFAULT 'generalist' CHECK (teaching_model IN (
    'generalist',  -- Lower Primary: teaches all subjects
    'specialist'   -- Upper Primary+: teaches specific subjects
  )),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one assignment per teacher per grade
  UNIQUE(teacher_id, grade)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_grade_teacher ON teacher_grade_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_grade_level ON teacher_grade_assignments(level);
CREATE INDEX IF NOT EXISTS idx_teacher_grade_active ON teacher_grade_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_teacher_grade_model ON teacher_grade_assignments(teaching_model);

-- ═══════════════════════════════════════════════════════════════════════════
-- TEACHER SUBJECT ASSIGNMENTS (Upper Primary & Junior Secondary Only)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Teacher & Grade Reference
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  
  -- Subject Assignment
  subject TEXT NOT NULL,
  
  -- Subject Category (for filtering/grouping)
  subject_category TEXT CHECK (subject_category IN (
    'core',           -- Mathematics, English, Kiswahili
    'science',        -- Science & Technology, Biology, Physics, Chemistry
    'humanities',     -- Social Studies, History, Geography
    'religious',      -- CRE, IRE, HRE
    'practical',      -- Agriculture, Home Science, Computer Science
    'creative'        -- Creative Arts, Physical Education
  )),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one subject assignment per teacher per grade
  UNIQUE(teacher_id, grade, subject),
  
  -- Foreign key to grade assignment
  FOREIGN KEY (teacher_id, grade) 
    REFERENCES teacher_grade_assignments(teacher_id, grade) 
    ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_subject_teacher ON teacher_subject_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_grade ON teacher_subject_assignments(grade);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_subject ON teacher_subject_assignments(subject);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_category ON teacher_subject_assignments(subject_category);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_active ON teacher_subject_assignments(is_active);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE teacher_grade_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subject_assignments ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own grade assignments
CREATE POLICY "Teachers can view own grade assignments"
  ON teacher_grade_assignments FOR SELECT
  USING (auth.uid() = teacher_id);

-- Teachers can insert their own grade assignments (during signup)
CREATE POLICY "Teachers can insert own grade assignments"
  ON teacher_grade_assignments FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Teachers can update their own grade assignments
CREATE POLICY "Teachers can update own grade assignments"
  ON teacher_grade_assignments FOR UPDATE
  USING (auth.uid() = teacher_id);

-- Teachers can delete their own grade assignments
CREATE POLICY "Teachers can delete own grade assignments"
  ON teacher_grade_assignments FOR DELETE
  USING (auth.uid() = teacher_id);

-- Teachers can view their own subject assignments
CREATE POLICY "Teachers can view own subject assignments"
  ON teacher_subject_assignments FOR SELECT
  USING (auth.uid() = teacher_id);

-- Teachers can insert their own subject assignments
CREATE POLICY "Teachers can insert own subject assignments"
  ON teacher_subject_assignments FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Teachers can update their own subject assignments
CREATE POLICY "Teachers can update own subject assignments"
  ON teacher_subject_assignments FOR UPDATE
  USING (auth.uid() = teacher_id);

-- Teachers can delete their own subject assignments
CREATE POLICY "Teachers can delete own subject assignments"
  ON teacher_subject_assignments FOR DELETE
  USING (auth.uid() = teacher_id);

-- Admins can view all assignments
CREATE POLICY "Admins can view all grade assignments"
  ON teacher_grade_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all subject assignments"
  ON teacher_subject_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Get all assignments for a teacher
CREATE OR REPLACE FUNCTION get_teacher_assignments(p_teacher_id UUID)
RETURNS TABLE (
  grade TEXT,
  level TEXT,
  teaching_model TEXT,
  subjects TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tga.grade,
    tga.level,
    tga.teaching_model,
    COALESCE(
      ARRAY_AGG(tsa.subject ORDER BY tsa.subject) FILTER (WHERE tsa.subject IS NOT NULL),
      ARRAY[]::TEXT[]
    ) as subjects
  FROM teacher_grade_assignments tga
  LEFT JOIN teacher_subject_assignments tsa 
    ON tsa.teacher_id = tga.teacher_id 
    AND tsa.grade = tga.grade
    AND tsa.is_active = true
  WHERE tga.teacher_id = p_teacher_id
    AND tga.is_active = true
  GROUP BY tga.grade, tga.level, tga.teaching_model
  ORDER BY 
    CASE tga.level
      WHEN 'pre-primary' THEN 1
      WHEN 'lower-primary' THEN 2
      WHEN 'upper-primary' THEN 3
      WHEN 'junior-secondary' THEN 4
    END,
    tga.grade;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if teacher has access to a specific grade/subject combination
CREATE OR REPLACE FUNCTION teacher_has_access(
  p_teacher_id UUID,
  p_grade TEXT,
  p_subject TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_grade BOOLEAN;
  v_has_subject BOOLEAN;
  v_is_generalist BOOLEAN;
BEGIN
  -- Check if teacher is assigned to the grade
  SELECT EXISTS (
    SELECT 1 FROM teacher_grade_assignments
    WHERE teacher_id = p_teacher_id
      AND grade = p_grade
      AND is_active = true
  ) INTO v_has_grade;
  
  IF NOT v_has_grade THEN
    RETURN false;
  END IF;
  
  -- If no subject specified, just check grade access
  IF p_subject IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if this is a generalist grade (Lower Primary)
  SELECT teaching_model = 'generalist' INTO v_is_generalist
  FROM teacher_grade_assignments
  WHERE teacher_id = p_teacher_id
    AND grade = p_grade
    AND is_active = true;
  
  -- Generalist teachers have access to all subjects in their grade
  IF v_is_generalist THEN
    RETURN true;
  END IF;
  
  -- For specialist teachers, check specific subject assignment
  SELECT EXISTS (
    SELECT 1 FROM teacher_subject_assignments
    WHERE teacher_id = p_teacher_id
      AND grade = p_grade
      AND subject = p_subject
      AND is_active = true
  ) INTO v_has_subject;
  
  RETURN v_has_subject;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teacher_grade_assignments_updated_at
  BEFORE UPDATE ON teacher_grade_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_subject_assignments_updated_at
  BEFORE UPDATE ON teacher_subject_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA: DEMO TEACHER (teacher0)
-- ═══════════════════════════════════════════════════════════════════════════

-- Insert demo teacher profile if not exists
INSERT INTO profiles (
  id, 
  email, 
  full_name, 
  role,
  created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'teacher0@demo.syncsenta.com',
  'Demo Teacher',
  'teacher',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Assign Grade 4 (Upper Primary - Specialist)
INSERT INTO teacher_grade_assignments (
  teacher_id,
  grade,
  level,
  teaching_model
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Grade 4',
  'upper-primary',
  'specialist'
) ON CONFLICT (teacher_id, grade) DO UPDATE SET
  level = EXCLUDED.level,
  teaching_model = EXCLUDED.teaching_model,
  is_active = true;

-- Assign Mathematics for Grade 4
INSERT INTO teacher_subject_assignments (
  teacher_id,
  grade,
  subject,
  subject_category
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Grade 4',
  'Mathematics',
  'core'
) ON CONFLICT (teacher_id, grade, subject) DO UPDATE SET
  subject_category = EXCLUDED.subject_category,
  is_active = true;

-- Assign Grade 5 (Upper Primary - Specialist)
INSERT INTO teacher_grade_assignments (
  teacher_id,
  grade,
  level,
  teaching_model
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Grade 5',
  'upper-primary',
  'specialist'
) ON CONFLICT (teacher_id, grade) DO UPDATE SET
  level = EXCLUDED.level,
  teaching_model = EXCLUDED.teaching_model,
  is_active = true;

-- Assign English for Grade 5
INSERT INTO teacher_subject_assignments (
  teacher_id,
  grade,
  subject,
  subject_category
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Grade 5',
  'English',
  'core'
) ON CONFLICT (teacher_id, grade, subject) DO UPDATE SET
  subject_category = EXCLUDED.subject_category,
  is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  table_count INTEGER;
  teacher0_assignments INTEGER;
BEGIN
  -- Check tables created
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'teacher_grade_assignments',
      'teacher_subject_assignments'
    );
  
  RAISE NOTICE '✅ Created % tables for Teacher Grade/Subject Assignments', table_count;
  
  -- Check teacher0 assignments
  SELECT COUNT(*) INTO teacher0_assignments
  FROM teacher_grade_assignments
  WHERE teacher_id = '00000000-0000-0000-0000-000000000001';
  
  RAISE NOTICE '✅ Teacher0 has % grade assignments', teacher0_assignments;
  
  -- Test helper function
  RAISE NOTICE '✅ Testing get_teacher_assignments function...';
  PERFORM get_teacher_assignments('00000000-0000-0000-0000-000000000001');
  
  RAISE NOTICE '✅ Migration 003_teacher_grade_assignments completed successfully';
END $$;

-- Made with Bob
