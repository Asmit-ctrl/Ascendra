-- ESP32 CAMERA FRAME INGESTION TABLE (moved from studio/supabase/migrations)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS camera_frames (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id TEXT NOT NULL,
  image_path TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_camera_frames_device_id ON camera_frames(device_id);
CREATE INDEX IF NOT EXISTS idx_camera_frames_status ON camera_frames(status);
CREATE INDEX IF NOT EXISTS idx_camera_frames_timestamp ON camera_frames(timestamp DESC);

ALTER TABLE camera_frames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert from server ingest routes"
  ON camera_frames FOR INSERT
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow read by admins only"
  ON camera_frames FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Allow update status by admins only"
  ON camera_frames FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
