-- Competency tracking tables for Mwalimu AI MVP
-- CBC competencies and student mastery tracking

-- CBC Competencies
CREATE TABLE IF NOT EXISTS competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(100) NOT NULL,
    topic VARCHAR(200) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    grade_level VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(subject, topic, name, grade_level)
);

CREATE INDEX idx_competencies_subject ON competencies(subject);
CREATE INDEX idx_competencies_topic ON competencies(topic);
CREATE INDEX idx_competencies_grade_level ON competencies(grade_level);

-- Student competency mastery
CREATE TABLE IF NOT EXISTS student_competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    competency_id UUID NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    mastery_percentage INTEGER NOT NULL DEFAULT 0 CHECK (mastery_percentage >= 0 AND mastery_percentage <= 100),
    status VARCHAR(20) NOT NULL DEFAULT 'not-started' CHECK (status IN ('not-started', 'in-progress', 'mastered')),
    games_recommended BOOLEAN NOT NULL DEFAULT FALSE,
    last_practiced TIMESTAMPTZ,
    total_practices INTEGER NOT NULL DEFAULT 0 CHECK (total_practices >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, competency_id)
);

CREATE INDEX idx_student_competencies_student_id ON student_competencies(student_id);
CREATE INDEX idx_student_competencies_competency_id ON student_competencies(competency_id);
CREATE INDEX idx_student_competencies_mastery ON student_competencies(mastery_percentage DESC);
CREATE INDEX idx_student_competencies_status ON student_competencies(status);
CREATE INDEX idx_student_competencies_games_recommended ON student_competencies(games_recommended) WHERE games_recommended = TRUE;

-- Insert default CBC competencies
INSERT INTO competencies (id, subject, topic, name, description, grade_level) VALUES
    -- Mathematics
    (gen_random_uuid(), 'Mathematics', 'Fractions', 'Understanding Fractions', 'CBC competency: Understanding Fractions', 'Grade 5'),
    (gen_random_uuid(), 'Mathematics', 'Fractions', 'Adding Fractions', 'CBC competency: Adding Fractions', 'Grade 5'),
    (gen_random_uuid(), 'Mathematics', 'Fractions', 'Subtracting Fractions', 'CBC competency: Subtracting Fractions', 'Grade 5'),
    (gen_random_uuid(), 'Mathematics', 'Fractions', 'Multiplying Fractions', 'CBC competency: Multiplying Fractions', 'Grade 6'),
    (gen_random_uuid(), 'Mathematics', 'Decimals', 'Understanding Decimals', 'CBC competency: Understanding Decimals', 'Grade 5'),
    (gen_random_uuid(), 'Mathematics', 'Decimals', 'Adding Decimals', 'CBC competency: Adding Decimals', 'Grade 5'),
    (gen_random_uuid(), 'Mathematics', 'Decimals', 'Multiplying Decimals', 'CBC competency: Multiplying Decimals', 'Grade 6'),
    (gen_random_uuid(), 'Mathematics', 'Ratios', 'Understanding Ratios', 'CBC competency: Understanding Ratios', 'Grade 6'),
    (gen_random_uuid(), 'Mathematics', 'Ratios', 'Solving Ratio Problems', 'CBC competency: Solving Ratio Problems', 'Grade 6'),
    
    -- English
    (gen_random_uuid(), 'English', 'Reading Comprehension', 'Main Idea', 'CBC competency: Main Idea', 'Grade 5'),
    (gen_random_uuid(), 'English', 'Reading Comprehension', 'Inference', 'CBC competency: Inference', 'Grade 5'),
    (gen_random_uuid(), 'English', 'Reading Comprehension', 'Context Clues', 'CBC competency: Context Clues', 'Grade 5'),
    (gen_random_uuid(), 'English', 'Writing', 'Essay Structure', 'CBC competency: Essay Structure', 'Grade 5'),
    (gen_random_uuid(), 'English', 'Writing', 'Grammar', 'CBC competency: Grammar', 'Grade 5'),
    (gen_random_uuid(), 'English', 'Writing', 'Punctuation', 'CBC competency: Punctuation', 'Grade 5'),
    
    -- Science
    (gen_random_uuid(), 'Science', 'Biology', 'Plant Parts', 'CBC competency: Plant Parts', 'Grade 5'),
    (gen_random_uuid(), 'Science', 'Biology', 'Photosynthesis', 'CBC competency: Photosynthesis', 'Grade 5'),
    (gen_random_uuid(), 'Science', 'Biology', 'Animal Classification', 'CBC competency: Animal Classification', 'Grade 5'),
    (gen_random_uuid(), 'Science', 'Physics', 'Forces and Motion', 'CBC competency: Forces and Motion', 'Grade 6'),
    (gen_random_uuid(), 'Science', 'Physics', 'Energy', 'CBC competency: Energy', 'Grade 6'),
    
    -- Kiswahili
    (gen_random_uuid(), 'Kiswahili', 'Kusoma', 'Uelewa wa Maandishi', 'CBC competency: Uelewa wa Maandishi', 'Grade 5'),
    (gen_random_uuid(), 'Kiswahili', 'Kuandika', 'Muundo wa Insha', 'CBC competency: Muundo wa Insha', 'Grade 5')
ON CONFLICT (subject, topic, name, grade_level) DO NOTHING;
