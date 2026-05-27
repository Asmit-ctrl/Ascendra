-- ============================================================================
-- FIX TEACHER FEEDBACK SCHEMA
-- Drop and recreate teacher_feedback table with correct schema
-- Add teacher_preferences table
-- ============================================================================

-- Drop existing teacher_feedback table (it has wrong schema)
DROP TABLE IF EXISTS teacher_feedback CASCADE;

-- Create teacher_feedback with correct schema
CREATE TABLE teacher_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content identification
  content_type TEXT NOT NULL CHECK (content_type IN ('scheme', 'lesson_plan', 'assessment', 'worksheet', 'text_leveler', 'standards_unpacker')),
  content_id TEXT NOT NULL,
  
  -- Rating
  rating TEXT NOT NULL CHECK (rating IN ('thumbs_up', 'thumbs_down')),
  
  -- Detailed feedback (for thumbs_down)
  feedback_text TEXT,
  improvement_suggestions TEXT,
  
  -- Context (generation parameters for learning)
  context JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate feedback for same content
  UNIQUE(teacher_id, content_type, content_id)
);

-- Indexes
CREATE INDEX idx_teacher_feedback_teacher ON teacher_feedback(teacher_id);
CREATE INDEX idx_teacher_feedback_content ON teacher_feedback(content_type, content_id);
CREATE INDEX idx_teacher_feedback_rating ON teacher_feedback(rating);
CREATE INDEX idx_teacher_feedback_created_at ON teacher_feedback(created_at DESC);

-- Enable RLS
ALTER TABLE teacher_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Teachers can view own feedback"
  ON teacher_feedback FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert own feedback"
  ON teacher_feedback FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own feedback"
  ON teacher_feedback FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own feedback"
  ON teacher_feedback FOR DELETE
  USING (auth.uid() = teacher_id);

-- Service role has full access
CREATE POLICY "Service role full access on feedback"
  ON teacher_feedback FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- TEACHER PREFERENCES TABLE
-- Stores learned preferences from feedback
-- ============================================================================

CREATE TABLE teacher_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Preferences by content type
  content_type TEXT NOT NULL CHECK (content_type IN ('scheme', 'lesson_plan', 'assessment', 'worksheet', 'text_leveler', 'standards_unpacker')),
  
  -- Learned preferences (JSONB for flexibility)
  preferences JSONB NOT NULL DEFAULT '{}',
  -- Example structure:
  -- {
  --   "preferred_length": "detailed" | "concise",
  --   "activity_style": "hands_on" | "theoretical",
  --   "language_preference": "kiswahili_first" | "english_first" | "mixed",
  --   "assessment_frequency": "every_lesson" | "weekly" | "per_topic",
  --   "detail_level": "high" | "medium" | "low",
  --   "kenyan_context": "urban" | "rural" | "mixed"
  -- }
  
  -- Metadata
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(teacher_id, content_type)
);

-- Indexes
CREATE INDEX idx_teacher_preferences_teacher ON teacher_preferences(teacher_id);
CREATE INDEX idx_teacher_preferences_content_type ON teacher_preferences(content_type);

-- Enable RLS
ALTER TABLE teacher_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Teachers can view own preferences"
  ON teacher_preferences FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can manage own preferences"
  ON teacher_preferences FOR ALL
  USING (auth.uid() = teacher_id);

-- Service role has full access
CREATE POLICY "Service role full access on preferences"
  ON teacher_preferences FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teacher_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teacher_feedback_updated_at
  BEFORE UPDATE ON teacher_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_feedback_updated_at();

CREATE TRIGGER update_teacher_preferences_updated_at
  BEFORE UPDATE ON teacher_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_feedback_updated_at();

-- Function to get feedback summary for a teacher
CREATE OR REPLACE FUNCTION get_teacher_feedback_summary(p_teacher_id UUID)
RETURNS TABLE (
  content_type TEXT,
  total_feedback BIGINT,
  thumbs_up_count BIGINT,
  thumbs_down_count BIGINT,
  satisfaction_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tf.content_type,
    COUNT(*)::BIGINT as total_feedback,
    COUNT(*) FILTER (WHERE tf.rating = 'thumbs_up')::BIGINT as thumbs_up_count,
    COUNT(*) FILTER (WHERE tf.rating = 'thumbs_down')::BIGINT as thumbs_down_count,
    ROUND(
      (COUNT(*) FILTER (WHERE tf.rating = 'thumbs_up')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) as satisfaction_rate
  FROM teacher_feedback tf
  WHERE tf.teacher_id = p_teacher_id
  GROUP BY tf.content_type
  ORDER BY tf.content_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to learn preferences from feedback
CREATE OR REPLACE FUNCTION learn_preferences_from_feedback(p_teacher_id UUID, p_content_type TEXT)
RETURNS JSONB AS $$
DECLARE
  v_preferences JSONB := '{}';
  v_feedback_count INTEGER;
  v_common_issues TEXT[];
BEGIN
  -- Get count of feedback
  SELECT COUNT(*) INTO v_feedback_count
  FROM teacher_feedback
  WHERE teacher_id = p_teacher_id
    AND content_type = p_content_type
    AND rating = 'thumbs_down';
  
  -- Only learn if there's enough feedback
  IF v_feedback_count >= 3 THEN
    -- Analyze feedback text for common patterns
    -- This is a simple implementation - can be enhanced with NLP
    
    -- Check for length preferences
    IF EXISTS (
      SELECT 1 FROM teacher_feedback
      WHERE teacher_id = p_teacher_id
        AND content_type = p_content_type
        AND (feedback_text ILIKE '%too long%' OR feedback_text ILIKE '%too detailed%')
    ) THEN
      v_preferences := jsonb_set(v_preferences, '{preferred_length}', '"concise"');
    ELSIF EXISTS (
      SELECT 1 FROM teacher_feedback
      WHERE teacher_id = p_teacher_id
        AND content_type = p_content_type
        AND (feedback_text ILIKE '%too short%' OR feedback_text ILIKE '%not detailed%')
    ) THEN
      v_preferences := jsonb_set(v_preferences, '{preferred_length}', '"detailed"');
    END IF;
    
    -- Check for activity style preferences
    IF EXISTS (
      SELECT 1 FROM teacher_feedback
      WHERE teacher_id = p_teacher_id
        AND content_type = p_content_type
        AND (improvement_suggestions ILIKE '%hands-on%' OR improvement_suggestions ILIKE '%practical%')
    ) THEN
      v_preferences := jsonb_set(v_preferences, '{activity_style}', '"hands_on"');
    END IF;
    
    -- Check for Kenyan context preferences
    IF EXISTS (
      SELECT 1 FROM teacher_feedback
      WHERE teacher_id = p_teacher_id
        AND content_type = p_content_type
        AND (improvement_suggestions ILIKE '%kenyan%' OR improvement_suggestions ILIKE '%local context%')
    ) THEN
      v_preferences := jsonb_set(v_preferences, '{kenyan_context}', '"high"');
    END IF;
    
    -- Upsert preferences
    INSERT INTO teacher_preferences (teacher_id, content_type, preferences)
    VALUES (p_teacher_id, p_content_type, v_preferences)
    ON CONFLICT (teacher_id, content_type)
    DO UPDATE SET
      preferences = EXCLUDED.preferences,
      updated_at = NOW();
  END IF;
  
  RETURN v_preferences;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE teacher_feedback IS 'Stores teacher feedback on AI-generated content for quality control and learning';
COMMENT ON TABLE teacher_preferences IS 'Stores learned preferences from teacher feedback to personalize future generations';
COMMENT ON FUNCTION get_teacher_feedback_summary IS 'Returns feedback summary statistics for a teacher';
COMMENT ON FUNCTION learn_preferences_from_feedback IS 'Analyzes feedback to extract and store teacher preferences';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Teacher feedback system tables created successfully';
  RAISE NOTICE '   - teacher_feedback: Stores ratings and detailed feedback';
  RAISE NOTICE '   - teacher_preferences: Stores learned preferences';
  RAISE NOTICE '   - Helper functions: get_teacher_feedback_summary, learn_preferences_from_feedback';
END $$;

-- Made with Bob
