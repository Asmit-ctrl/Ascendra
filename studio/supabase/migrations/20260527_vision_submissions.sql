-- Vision Submissions and Intervention System
-- Stores student drawing/handwriting submissions and AI analysis results

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
  image_data TEXT, -- Base64 for quick preview
  
  -- AI Analysis Results
  score INTEGER CHECK (score >= 0 AND score <= 100),
  accuracy DECIMAL(3,2) CHECK (accuracy >= 0 AND accuracy <= 1),
  detected_content TEXT,
  strengths JSONB DEFAULT '[]'::jsonb,
  areas_for_improvement JSONB DEFAULT '[]'::jsonb,
  specific_errors JSONB DEFAULT '[]'::jsonb,
  student_feedback TEXT,
  teacher_notes TEXT,
  
  -- Intervention flags
  requires_intervention BOOLEAN DEFAULT false,
  intervention_reason TEXT,
  intervention_status TEXT DEFAULT 'pending' CHECK (intervention_status IN ('pending', 'reviewed', 'addressed', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Metadata
  term INTEGER CHECK (term IN (1, 2, 3)),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intervention alerts table
CREATE TABLE IF NOT EXISTS intervention_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES auth.users(id),
  
  -- Alert details
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_performance', 'repeated_errors', 'skill_gap', 'manual')),
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Related data
  related_submissions UUID[] DEFAULT ARRAY[]::UUID[],
  common_errors JSONB DEFAULT '[]'::jsonb,
  recommended_actions JSONB DEFAULT '[]'::jsonb,
  
  -- Status tracking
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  
  -- Metadata
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  term INTEGER CHECK (term IN (1, 2, 3)),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student progress tracking
CREATE TABLE IF NOT EXISTS vision_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  
  -- Progress metrics
  total_submissions INTEGER DEFAULT 0,
  average_score DECIMAL(5,2),
  improvement_rate DECIMAL(5,2), -- Percentage improvement over time
  last_submission_date TIMESTAMPTZ,
  
  -- Skill tracking
  mastered_skills JSONB DEFAULT '[]'::jsonb,
  struggling_skills JSONB DEFAULT '[]'::jsonb,
  
  -- Term tracking
  term INTEGER CHECK (term IN (1, 2, 3)),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(student_id, grade, subject, activity_type, term)
);

-- Indexes for performance
CREATE INDEX idx_vision_submissions_student ON vision_submissions(student_id);
CREATE INDEX idx_vision_submissions_activity ON vision_submissions(activity_id);
CREATE INDEX idx_vision_submissions_intervention ON vision_submissions(requires_intervention) WHERE requires_intervention = true;
CREATE INDEX idx_vision_submissions_term ON vision_submissions(term);
CREATE INDEX idx_vision_submissions_grade_subject ON vision_submissions(grade, subject);

CREATE INDEX idx_intervention_alerts_student ON intervention_alerts(student_id);
CREATE INDEX idx_intervention_alerts_teacher ON intervention_alerts(teacher_id);
CREATE INDEX idx_intervention_alerts_status ON intervention_alerts(status);
CREATE INDEX idx_intervention_alerts_urgency ON intervention_alerts(urgency);

CREATE INDEX idx_vision_progress_student ON vision_progress(student_id);
CREATE INDEX idx_vision_progress_grade_subject ON vision_progress(grade, subject);

-- Row Level Security (RLS)
ALTER TABLE vision_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_progress ENABLE ROW LEVEL SECURITY;

-- Students can view and insert their own submissions
CREATE POLICY "Students can view own submissions"
  ON vision_submissions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own submissions"
  ON vision_submissions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Teachers can view all submissions in their school/grade
CREATE POLICY "Teachers can view submissions"
  ON vision_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Teachers can update intervention status
CREATE POLICY "Teachers can update submissions"
  ON vision_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Intervention alerts policies
CREATE POLICY "Students can view own alerts"
  ON intervention_alerts FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view and manage alerts"
  ON intervention_alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Progress tracking policies
CREATE POLICY "Students can view own progress"
  ON vision_progress FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view all progress"
  ON vision_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Function to update progress after submission
CREATE OR REPLACE FUNCTION update_vision_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if analysis is complete
  IF NEW.score IS NOT NULL THEN
    INSERT INTO vision_progress (
      student_id,
      grade,
      subject,
      activity_type,
      total_submissions,
      average_score,
      last_submission_date,
      term
    )
    VALUES (
      NEW.student_id,
      NEW.grade,
      NEW.subject,
      NEW.activity_type,
      1,
      NEW.score,
      NEW.submitted_at,
      NEW.term
    )
    ON CONFLICT (student_id, grade, subject, activity_type, term)
    DO UPDATE SET
      total_submissions = vision_progress.total_submissions + 1,
      average_score = (vision_progress.average_score * vision_progress.total_submissions + NEW.score) / (vision_progress.total_submissions + 1),
      last_submission_date = NEW.submitted_at,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update progress
CREATE TRIGGER trigger_update_vision_progress
  AFTER INSERT OR UPDATE ON vision_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_vision_progress();

-- Function to auto-create intervention alerts
CREATE OR REPLACE FUNCTION check_intervention_needed()
RETURNS TRIGGER AS $$
DECLARE
  recent_submissions INTEGER;
  avg_recent_score DECIMAL;
BEGIN
  -- Only check if intervention is flagged
  IF NEW.requires_intervention = true AND NEW.intervention_status = 'pending' THEN
    -- Check recent performance
    SELECT COUNT(*), AVG(score)
    INTO recent_submissions, avg_recent_score
    FROM vision_submissions
    WHERE student_id = NEW.student_id
      AND grade = NEW.grade
      AND subject = NEW.subject
      AND activity_type = NEW.activity_type
      AND submitted_at >= NOW() - INTERVAL '7 days';
    
    -- Create alert if consistent low performance
    IF recent_submissions >= 3 AND avg_recent_score < 60 THEN
      INSERT INTO intervention_alerts (
        student_id,
        alert_type,
        urgency,
        title,
        description,
        related_submissions,
        grade,
        subject,
        term
      )
      VALUES (
        NEW.student_id,
        'low_performance',
        CASE 
          WHEN avg_recent_score < 40 THEN 'high'
          WHEN avg_recent_score < 50 THEN 'medium'
          ELSE 'low'
        END,
        'Consistent Low Performance in ' || NEW.subject,
        'Student has scored below 60% in ' || recent_submissions || ' recent submissions with an average of ' || ROUND(avg_recent_score, 1) || '%',
        ARRAY[NEW.id],
        NEW.grade,
        NEW.subject,
        NEW.term
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check for intervention
CREATE TRIGGER trigger_check_intervention
  AFTER INSERT OR UPDATE ON vision_submissions
  FOR EACH ROW
  EXECUTE FUNCTION check_intervention_needed();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_vision_submissions_updated_at
  BEFORE UPDATE ON vision_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intervention_alerts_updated_at
  BEFORE UPDATE ON intervention_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vision_progress_updated_at
  BEFORE UPDATE ON vision_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Made with Bob
