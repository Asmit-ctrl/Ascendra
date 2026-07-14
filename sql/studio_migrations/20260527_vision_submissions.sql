-- Vision Submissions and Intervention System (moved from studio/supabase/migrations)

-- Vision submissions table
CREATE TABLE IF NOT EXISTS vision_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('handwriting', 'fraction', 'drawing', 'number')),
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  expected_content TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_data TEXT,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  accuracy DECIMAL(3,2) CHECK (accuracy >= 0 AND accuracy <= 1),
  detected_content TEXT,
  strengths JSONB DEFAULT '[]'::jsonb,
  areas_for_improvement JSONB DEFAULT '[]'::jsonb,
  specific_errors JSONB DEFAULT '[]'::jsonb,
  student_feedback TEXT,
  teacher_notes TEXT,
  requires_intervention BOOLEAN DEFAULT false,
  intervention_reason TEXT,
  intervention_status TEXT DEFAULT 'pending' CHECK (intervention_status IN ('pending', 'reviewed', 'addressed', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  term INTEGER CHECK (term IN (1, 2, 3)),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intervention_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES auth.users(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_performance', 'repeated_errors', 'skill_gap', 'manual')),
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  related_submissions UUID[] DEFAULT ARRAY[]::UUID[],
  common_errors JSONB DEFAULT '[]'::jsonb,
  recommended_actions JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  term INTEGER CHECK (term IN (1, 2, 3)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vision_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  total_submissions INTEGER DEFAULT 0,
  average_score DECIMAL(5,2),
  improvement_rate DECIMAL(5,2),
  last_submission_date TIMESTAMPTZ,
  mastered_skills JSONB DEFAULT '[]'::jsonb,
  struggling_skills JSONB DEFAULT '[]'::jsonb,
  term INTEGER CHECK (term IN (1, 2, 3)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, grade, subject, activity_type, term)
);
