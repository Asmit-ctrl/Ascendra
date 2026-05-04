-- Generated content table for Magic School AI
-- Stores teacher-generated lessons, quizzes, and reports

CREATE TABLE IF NOT EXISTS generated_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('lesson', 'quiz', 'report')),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_generated_content_teacher_id ON generated_content(teacher_id);
CREATE INDEX idx_generated_content_type ON generated_content(content_type);
CREATE INDEX idx_generated_content_generated_at ON generated_content(generated_at DESC);
