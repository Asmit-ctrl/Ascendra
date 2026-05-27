-- Teacher Feedback System
-- Allows teachers to rate AI-generated content and provide improvement suggestions

-- Create teacher_feedback table
CREATE TABLE IF NOT EXISTS teacher_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('scheme', 'lesson_plan', 'assessment', 'worksheet', 'text_leveler', 'standards_unpacker')),
  content_id UUID NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('thumbs_up', 'thumbs_down')),
  feedback_text TEXT,
  improvement_suggestions TEXT,
  context JSONB, -- Store generation parameters for learning
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_feedback_teacher_id ON teacher_feedback(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_feedback_content_type ON teacher_feedback(content_type);
CREATE INDEX IF NOT EXISTS idx_teacher_feedback_content_id ON teacher_feedback(content_id);
CREATE INDEX IF NOT EXISTS idx_teacher_feedback_rating ON teacher_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_teacher_feedback_created_at ON teacher_feedback(created_at DESC);

-- Enable RLS
ALTER TABLE teacher_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Teachers can view their own feedback"
  ON teacher_feedback FOR SELECT
  USING (auth.uid()::text = teacher_id);

CREATE POLICY "Teachers can insert their own feedback"
  ON teacher_feedback FOR INSERT
  WITH CHECK (auth.uid()::text = teacher_id);

CREATE POLICY "Teachers can update their own feedback"
  ON teacher_feedback FOR UPDATE
  USING (auth.uid()::text = teacher_id);

CREATE POLICY "Teachers can delete their own feedback"
  ON teacher_feedback FOR DELETE
  USING (auth.uid()::text = teacher_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teacher_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER teacher_feedback_updated_at
  BEFORE UPDATE ON teacher_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_feedback_updated_at();

-- Create view for feedback analytics
CREATE OR REPLACE VIEW teacher_feedback_analytics AS
SELECT 
  teacher_id,
  content_type,
  rating,
  COUNT(*) as feedback_count,
  COUNT(CASE WHEN rating = 'thumbs_down' THEN 1 END) as negative_count,
  COUNT(CASE WHEN rating = 'thumbs_up' THEN 1 END) as positive_count,
  ROUND(
    (COUNT(CASE WHEN rating = 'thumbs_up' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
    2
  ) as satisfaction_rate,
  MAX(created_at) as last_feedback_at
FROM teacher_feedback
GROUP BY teacher_id, content_type, rating;

-- Grant access to authenticated users
GRANT SELECT ON teacher_feedback_analytics TO authenticated;

COMMENT ON TABLE teacher_feedback IS 'Stores teacher feedback on AI-generated content for continuous improvement';
COMMENT ON COLUMN teacher_feedback.content_type IS 'Type of content: scheme, lesson_plan, assessment, worksheet, text_leveler, standards_unpacker';
COMMENT ON COLUMN teacher_feedback.rating IS 'Teacher rating: thumbs_up or thumbs_down';
COMMENT ON COLUMN teacher_feedback.feedback_text IS 'What went wrong or what was good';
COMMENT ON COLUMN teacher_feedback.improvement_suggestions IS 'How the AI should handle it differently next time';
COMMENT ON COLUMN teacher_feedback.context IS 'Generation parameters (grade, subject, topic, etc.) for learning';

-- Made with Bob
