-- Teacher feedback and ai decision schemas (moved from ai-agents)

-- AI Decision Log: Every tutoring/teaching decision made by AI
CREATE TABLE IF NOT EXISTS ai_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id TEXT UNIQUE NOT NULL,
  student_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  session_id TEXT,
  competency TEXT,
  grade TEXT,
  subject TEXT,
  decision_type TEXT NOT NULL,
  ai_action TEXT NOT NULL,
  ai_reasoning TEXT,
  student_telemetry JSONB,
  interaction_history JSONB,
  fired_rules JSONB,
  scaffolding_level TEXT,
  ai_response TEXT,
  examples_used JSONB,
  student_region TEXT,
  language_preference TEXT,
  teacher_feedback TEXT,
  teacher_comment TEXT,
  teacher_suggested_alternative TEXT,
  student_outcome TEXT,
  student_outcome_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  feedback_received_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_decisions_teacher_id ON ai_decisions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_student_id ON ai_decisions(student_id);
