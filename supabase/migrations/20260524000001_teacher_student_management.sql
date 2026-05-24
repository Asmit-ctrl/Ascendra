-- ============================================================================
-- TEACHER & STUDENT MANAGEMENT ENHANCEMENT
-- Migration to add proper teacher profile storage, student management,
-- and teacher preferences for saved materials
-- ============================================================================

-- ============================================================================
-- 1. TEACHER PROFILES TABLE
-- Store teacher-specific information beyond the base profiles table
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Teaching Assignment
  school_name TEXT,
  employee_id TEXT,
  grades_taught TEXT[] NOT NULL DEFAULT '{}', -- ['Grade 4', 'Grade 5', 'Grade 6']
  subjects_taught TEXT[] NOT NULL DEFAULT '{}', -- ['Mathematics', 'Science', 'English']
  classes TEXT[] DEFAULT '{}', -- ['Grade 4A', 'Grade 5B']
  
  -- Preferences
  preferred_language TEXT DEFAULT 'english' CHECK (preferred_language IN ('english', 'kiswahili', 'mixed')),
  default_term TEXT DEFAULT 'Term 1',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user_id ON teacher_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_school ON teacher_profiles(school_name);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_grades ON teacher_profiles USING GIN(grades_taught);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_subjects ON teacher_profiles USING GIN(subjects_taught);

COMMENT ON TABLE teacher_profiles IS 'Extended teacher profile information including grades and subjects taught';
COMMENT ON COLUMN teacher_profiles.grades_taught IS 'Array of grades this teacher teaches (e.g., [''Grade 4'', ''Grade 5''])';
COMMENT ON COLUMN teacher_profiles.subjects_taught IS 'Array of subjects this teacher teaches (e.g., [''Mathematics'', ''Science''])';

-- ============================================================================
-- 2. STUDENTS TABLE (Enhanced)
-- Proper student records with teacher assignments
-- ============================================================================

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Student Info
  student_name TEXT NOT NULL,
  student_id TEXT, -- School-assigned ID
  grade TEXT NOT NULL,
  class_name TEXT, -- 'Grade 4A', 'Grade 5B'
  school_name TEXT,
  
  -- Demographics
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  
  -- Learning Profile
  preferred_language TEXT DEFAULT 'english' CHECK (preferred_language IN ('english', 'kiswahili', 'mixed')),
  learning_style TEXT, -- 'visual', 'auditory', 'kinesthetic', 'reading_writing'
  special_needs TEXT,
  interests TEXT[],
  
  -- Parent/Guardian Info
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'transferred')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_name);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_name);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

COMMENT ON TABLE students IS 'Student records with learning profiles and parent information';
COMMENT ON COLUMN students.user_id IS 'Optional link to auth.users if student has login account';

-- ============================================================================
-- 3. TEACHER-STUDENT ASSIGNMENTS
-- Link teachers to their students
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_student_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationship
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  -- Assignment Details
  subject TEXT, -- Optional: specific subject assignment
  class_name TEXT NOT NULL,
  academic_year TEXT, -- '2024/2025'
  term TEXT, -- 'Term 1', 'Term 2', 'Term 3'
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  
  -- Metadata
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(teacher_id, student_id, class_name, subject)
);

CREATE INDEX IF NOT EXISTS idx_teacher_student_teacher ON teacher_student_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_student_student ON teacher_student_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_student_class ON teacher_student_assignments(class_name);
CREATE INDEX IF NOT EXISTS idx_teacher_student_status ON teacher_student_assignments(status);

COMMENT ON TABLE teacher_student_assignments IS 'Links teachers to their students for specific classes and subjects';

-- ============================================================================
-- 4. TEACHER SAVED MATERIALS
-- Store references to teacher's saved schemes, lesson plans, worksheets
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_saved_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Teacher
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Material Reference
  material_type TEXT NOT NULL CHECK (material_type IN ('scheme', 'lesson_plan', 'worksheet', 'exam', 'unpacked_outcome')),
  material_id TEXT NOT NULL, -- scheme_id, lesson_plan_id, worksheet_id, etc.
  
  -- Material Metadata (denormalized for quick access)
  title TEXT,
  grade TEXT,
  subject TEXT,
  term TEXT,
  
  -- Organization
  folder TEXT, -- Optional folder/category for organization
  tags TEXT[], -- Custom tags for filtering
  is_favorite BOOLEAN DEFAULT false,
  
  -- Usage Tracking
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(teacher_id, material_type, material_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_materials_teacher ON teacher_saved_materials(teacher_id);
CREATE INDEX IF NOT EXISTS idx_saved_materials_type ON teacher_saved_materials(material_type);
CREATE INDEX IF NOT EXISTS idx_saved_materials_grade_subject ON teacher_saved_materials(grade, subject);
CREATE INDEX IF NOT EXISTS idx_saved_materials_favorite ON teacher_saved_materials(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_saved_materials_folder ON teacher_saved_materials(folder) WHERE folder IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_saved_materials_tags ON teacher_saved_materials USING GIN(tags);

COMMENT ON TABLE teacher_saved_materials IS 'Tracks teacher''s saved and favorited materials for quick access';
COMMENT ON COLUMN teacher_saved_materials.material_id IS 'References the ID from the respective table (schemes, lesson_plans, worksheets, etc.)';

-- ============================================================================
-- 5. SCHEMES TABLE (if not exists)
-- Store generated schemes of work
-- ============================================================================

CREATE TABLE IF NOT EXISTS schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id TEXT UNIQUE NOT NULL,
  teacher_id TEXT NOT NULL,
  
  -- Scheme Details
  title TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  term TEXT NOT NULL,
  mode TEXT DEFAULT 'standard',
  language TEXT DEFAULT 'english',
  
  -- Content
  rows JSONB NOT NULL, -- Array of SchemeRow objects
  total_weeks INTEGER,
  lessons_per_week INTEGER,
  
  -- Storage & Export
  storage_path TEXT,
  exported_at TIMESTAMP WITH TIME ZONE,
  export_format TEXT DEFAULT 'json',
  is_training_data BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schemes_teacher_id ON schemes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schemes_grade_subject ON schemes(grade, subject);
CREATE INDEX IF NOT EXISTS idx_schemes_term ON schemes(term);
CREATE INDEX IF NOT EXISTS idx_schemes_created_at ON schemes(created_at DESC);

-- ============================================================================
-- 6. LESSON PLANS TABLE (if not exists)
-- Store generated lesson plans
-- ============================================================================

CREATE TABLE IF NOT EXISTS lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id TEXT UNIQUE NOT NULL,
  teacher_id TEXT NOT NULL,
  
  -- Lesson Details
  title TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  term TEXT,
  strand TEXT,
  sub_strand TEXT,
  
  -- Content
  payload JSONB NOT NULL,
  
  -- Link to Scheme
  scheme_id TEXT, -- Optional reference to parent scheme
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher_id ON lesson_plans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_grade_subject ON lesson_plans(grade, subject);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_scheme_id ON lesson_plans(scheme_id) WHERE scheme_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lesson_plans_created_at ON lesson_plans(created_at DESC);

-- ============================================================================
-- 7. EXAMS TABLE (if not exists)
-- Store generated exams
-- ============================================================================

CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id TEXT UNIQUE NOT NULL,
  teacher_id TEXT NOT NULL,
  
  -- Exam Details
  title TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  term TEXT,
  exam_type TEXT, -- 'formative', 'summative', 'mid-term', 'end-term'
  
  -- Content
  payload JSONB NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_teacher_id ON exams(teacher_id);
CREATE INDEX IF NOT EXISTS idx_exams_grade_subject ON exams(grade, subject);
CREATE INDEX IF NOT EXISTS idx_exams_created_at ON exams(created_at DESC);

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Function to get teacher's materials
CREATE OR REPLACE FUNCTION get_teacher_materials(
  p_teacher_id UUID,
  p_material_type TEXT DEFAULT NULL,
  p_grade TEXT DEFAULT NULL,
  p_subject TEXT DEFAULT NULL
)
RETURNS TABLE (
  material_id TEXT,
  material_type TEXT,
  title TEXT,
  grade TEXT,
  subject TEXT,
  term TEXT,
  is_favorite BOOLEAN,
  folder TEXT,
  tags TEXT[],
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tsm.material_id,
    tsm.material_type,
    tsm.title,
    tsm.grade,
    tsm.subject,
    tsm.term,
    tsm.is_favorite,
    tsm.folder,
    tsm.tags,
    tsm.last_accessed_at,
    tsm.access_count,
    tsm.created_at
  FROM teacher_saved_materials tsm
  WHERE tsm.teacher_id = p_teacher_id
    AND (p_material_type IS NULL OR tsm.material_type = p_material_type)
    AND (p_grade IS NULL OR tsm.grade = p_grade)
    AND (p_subject IS NULL OR tsm.subject = p_subject)
  ORDER BY tsm.is_favorite DESC, tsm.last_accessed_at DESC NULLS LAST, tsm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to save/bookmark a material
CREATE OR REPLACE FUNCTION save_teacher_material(
  p_teacher_id UUID,
  p_material_type TEXT,
  p_material_id TEXT,
  p_title TEXT,
  p_grade TEXT,
  p_subject TEXT,
  p_term TEXT DEFAULT NULL,
  p_folder TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO teacher_saved_materials (
    teacher_id,
    material_type,
    material_id,
    title,
    grade,
    subject,
    term,
    folder,
    tags
  ) VALUES (
    p_teacher_id,
    p_material_type,
    p_material_id,
    p_title,
    p_grade,
    p_subject,
    p_term,
    p_folder,
    p_tags
  )
  ON CONFLICT (teacher_id, material_type, material_id) 
  DO UPDATE SET
    title = EXCLUDED.title,
    grade = EXCLUDED.grade,
    subject = EXCLUDED.subject,
    term = EXCLUDED.term,
    folder = COALESCE(EXCLUDED.folder, teacher_saved_materials.folder),
    tags = COALESCE(EXCLUDED.tags, teacher_saved_materials.tags)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get teacher's students
CREATE OR REPLACE FUNCTION get_teacher_students(
  p_teacher_id UUID,
  p_class_name TEXT DEFAULT NULL,
  p_subject TEXT DEFAULT NULL
)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  grade TEXT,
  class_name TEXT,
  subject TEXT,
  status TEXT,
  parent_name TEXT,
  parent_phone TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.student_name,
    s.grade,
    tsa.class_name,
    tsa.subject,
    tsa.status,
    s.parent_name,
    s.parent_phone
  FROM students s
  INNER JOIN teacher_student_assignments tsa ON tsa.student_id = s.id
  WHERE tsa.teacher_id = p_teacher_id
    AND tsa.status = 'active'
    AND (p_class_name IS NULL OR tsa.class_name = p_class_name)
    AND (p_subject IS NULL OR tsa.subject = p_subject)
  ORDER BY s.student_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update material access tracking
CREATE OR REPLACE FUNCTION track_material_access(
  p_teacher_id UUID,
  p_material_type TEXT,
  p_material_id TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE teacher_saved_materials
  SET 
    last_accessed_at = NOW(),
    access_count = access_count + 1
  WHERE teacher_id = p_teacher_id
    AND material_type = p_material_type
    AND material_id = p_material_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_student_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_saved_materials ENABLE ROW LEVEL SECURITY;

-- Teacher Profiles: Teachers can view and update their own profile
CREATE POLICY "Teachers can view own profile"
  ON teacher_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers can update own profile"
  ON teacher_profiles FOR ALL
  USING (auth.uid() = user_id);

-- Students: Teachers can view their assigned students
CREATE POLICY "Teachers can view assigned students"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teacher_student_assignments tsa
      WHERE tsa.teacher_id = auth.uid()
        AND tsa.student_id = students.id
        AND tsa.status = 'active'
    )
  );

-- Students: Students can view their own profile
CREATE POLICY "Students can view own profile"
  ON students FOR SELECT
  USING (auth.uid() = user_id);

-- Teacher-Student Assignments: Teachers can manage their assignments
CREATE POLICY "Teachers can manage student assignments"
  ON teacher_student_assignments FOR ALL
  USING (auth.uid() = teacher_id);

-- Saved Materials: Teachers can manage their own saved materials
CREATE POLICY "Teachers can manage own materials"
  ON teacher_saved_materials FOR ALL
  USING (auth.uid() = teacher_id);

-- ============================================================================
-- 10. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teacher_profiles_updated_at
  BEFORE UPDATE ON teacher_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schemes_updated_at
  BEFORE UPDATE ON schemes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_plans_updated_at
  BEFORE UPDATE ON lesson_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'teacher_profiles',
      'students',
      'teacher_student_assignments',
      'teacher_saved_materials',
      'schemes',
      'lesson_plans',
      'exams'
    );
  
  RAISE NOTICE '✅ Created/verified % tables for Teacher & Student Management', table_count;
END $$;
