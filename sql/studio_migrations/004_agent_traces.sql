-- AGENT TRACES & KEY MANAGEMENT (moved from studio/supabase/migrations)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS agent_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  public_key TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_keys_agent_id ON agent_keys(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_keys_is_active ON agent_keys(is_active);

CREATE TABLE IF NOT EXISTS agent_traces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trace_id TEXT UNIQUE NOT NULL,
  agent_id TEXT NOT NULL,
  session_id UUID NULL REFERENCES chat_sessions(id) ON DELETE SET NULL,
  user_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  input JSONB NOT NULL,
  prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  output JSONB NOT NULL,
  confidence NUMERIC NULL,
  signed_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_traces_agent_id ON agent_traces(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_traces_session_id ON agent_traces(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_traces_user_id ON agent_traces(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_traces_created_at ON agent_traces(created_at DESC);

ALTER TABLE agent_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_traces DISABLE ROW LEVEL SECURITY;
