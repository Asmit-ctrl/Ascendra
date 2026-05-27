-- ============================================================================
-- TRAINING DATA EXPORT SUPPORT
-- Add storage references and export tracking to schemes table
-- ============================================================================

-- Add storage tracking columns to schemes table
ALTER TABLE schemes 
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS exported_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS export_format TEXT DEFAULT 'json',
ADD COLUMN IF NOT EXISTS is_training_data BOOLEAN DEFAULT false;

-- Create index for training data queries
CREATE INDEX IF NOT EXISTS idx_schemes_training_data ON schemes(is_training_data, exported_at DESC);
CREATE INDEX IF NOT EXISTS idx_schemes_storage_path ON schemes(storage_path) WHERE storage_path IS NOT NULL;

-- Create training_exports table to track batch exports
CREATE TABLE IF NOT EXISTS training_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id TEXT UNIQUE NOT NULL,
  export_type TEXT NOT NULL, -- 'schemes', 'worksheets', 'lesson_plans', 'full'
  bucket_name TEXT NOT NULL DEFAULT 'training-data',
  storage_path TEXT NOT NULL,
  scheme_count INTEGER DEFAULT 0,
  worksheet_count INTEGER DEFAULT 0,
  lesson_plan_count INTEGER DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  file_size_bytes BIGINT,
  metadata JSONB,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_training_exports_status ON training_exports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_exports_type ON training_exports(export_type);
CREATE INDEX IF NOT EXISTS idx_training_exports_created_by ON training_exports(created_by);

-- Function to mark scheme as training data
CREATE OR REPLACE FUNCTION mark_scheme_as_training_data(
  p_scheme_id TEXT,
  p_storage_path TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE schemes
  SET 
    is_training_data = true,
    storage_path = p_storage_path,
    exported_at = NOW(),
    updated_at = NOW()
  WHERE scheme_id = p_scheme_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get training data statistics
CREATE OR REPLACE FUNCTION get_training_data_stats()
RETURNS TABLE (
  total_schemes BIGINT,
  exported_schemes BIGINT,
  total_worksheets BIGINT,
  total_lesson_plans BIGINT,
  total_exports BIGINT,
  last_export_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM schemes)::BIGINT as total_schemes,
    (SELECT COUNT(*) FROM schemes WHERE is_training_data = true)::BIGINT as exported_schemes,
    (SELECT COUNT(*) FROM worksheets)::BIGINT as total_worksheets,
    (SELECT COUNT(*) FROM lesson_plans)::BIGINT as total_lesson_plans,
    (SELECT COUNT(*) FROM training_exports WHERE status = 'completed')::BIGINT as total_exports,
    (SELECT MAX(completed_at) FROM training_exports WHERE status = 'completed') as last_export_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get exportable schemes (not yet exported or updated since last export)
CREATE OR REPLACE FUNCTION get_exportable_schemes()
RETURNS TABLE (
  scheme_id TEXT,
  title TEXT,
  grade TEXT,
  subject TEXT,
  term TEXT,
  total_weeks INTEGER,
  lessons_per_week INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.scheme_id,
    s.title,
    s.grade,
    s.subject,
    s.term,
    s.total_weeks,
    s.lessons_per_week,
    s.created_at,
    s.updated_at
  FROM schemes s
  WHERE 
    s.is_training_data = false 
    OR s.exported_at IS NULL 
    OR s.updated_at > s.exported_at
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON COLUMN schemes.storage_path IS 'Path to exported file in Supabase Storage (e.g., schemes/grade-4-mathematics-term-1-abc123.json)';
COMMENT ON COLUMN schemes.exported_at IS 'Timestamp when scheme was last exported to storage for training data';
COMMENT ON COLUMN schemes.is_training_data IS 'Flag indicating if this scheme has been exported as training data';
COMMENT ON TABLE training_exports IS 'Tracks batch exports of training data to Supabase Storage';
