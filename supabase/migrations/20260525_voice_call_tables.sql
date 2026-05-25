-- Voice Call System Tables
-- Stores conversation history and analytics for the voice call feature

-- Voice conversations table
CREATE TABLE IF NOT EXISTS voice_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  context JSONB NOT NULL DEFAULT '{}',
  transitions JSONB NOT NULL DEFAULT '[]',
  stats JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Voice messages table
CREATE TABLE IF NOT EXISTS voice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL REFERENCES voice_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  audio_url TEXT,
  interrupted BOOLEAN DEFAULT false,
  topic TEXT,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Voice call analytics table
CREATE TABLE IF NOT EXISTS voice_call_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL REFERENCES voice_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  latency_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_conversations_user_id ON voice_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_conversations_is_active ON voice_conversations(is_active);
CREATE INDEX IF NOT EXISTS idx_voice_messages_conversation_id ON voice_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_voice_messages_user_id ON voice_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_messages_timestamp ON voice_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_voice_call_analytics_conversation_id ON voice_call_analytics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_voice_call_analytics_user_id ON voice_call_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_call_analytics_event_type ON voice_call_analytics(event_type);

-- Row Level Security (RLS) policies
ALTER TABLE voice_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_call_analytics ENABLE ROW LEVEL SECURITY;

-- Users can only access their own conversations
CREATE POLICY "Users can view their own conversations"
  ON voice_conversations FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON voice_conversations FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own conversations"
  ON voice_conversations FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Users can only access their own messages
CREATE POLICY "Users can view their own messages"
  ON voice_messages FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own messages"
  ON voice_messages FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can only access their own analytics
CREATE POLICY "Users can view their own analytics"
  ON voice_call_analytics FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own analytics"
  ON voice_call_analytics FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_voice_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_voice_conversations_updated_at
  BEFORE UPDATE ON voice_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_conversation_updated_at();

-- Function to get conversation statistics
CREATE OR REPLACE FUNCTION get_voice_conversation_stats(conv_id TEXT)
RETURNS TABLE (
  message_count BIGINT,
  user_message_count BIGINT,
  assistant_message_count BIGINT,
  interruption_count BIGINT,
  average_latency NUMERIC,
  duration_seconds NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as message_count,
    COUNT(*) FILTER (WHERE role = 'user')::BIGINT as user_message_count,
    COUNT(*) FILTER (WHERE role = 'assistant')::BIGINT as assistant_message_count,
    COUNT(*) FILTER (WHERE interrupted = true)::BIGINT as interruption_count,
    COALESCE(AVG(a.latency_ms), 0)::NUMERIC as average_latency,
    COALESCE(
      EXTRACT(EPOCH FROM (MAX(m.timestamp) - MIN(m.timestamp))),
      0
    )::NUMERIC as duration_seconds
  FROM voice_messages m
  LEFT JOIN voice_call_analytics a ON a.conversation_id = m.conversation_id
  WHERE m.conversation_id = conv_id;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE voice_conversations IS 'Stores voice conversation sessions with context and metadata';
COMMENT ON TABLE voice_messages IS 'Stores individual messages within voice conversations';
COMMENT ON TABLE voice_call_analytics IS 'Stores analytics events and latency metrics for voice calls';
COMMENT ON FUNCTION get_voice_conversation_stats IS 'Returns comprehensive statistics for a voice conversation';

-- Made with Bob
