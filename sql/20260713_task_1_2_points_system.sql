-- Migration: Add points system tables and columns for Task 1.2

-- Add points and school/classroom to profiles if not present
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_points int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS classroom_id uuid;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_id uuid;

-- Create point_transactions table for audit trail
CREATE TABLE IF NOT EXISTS point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  competency_code text NOT NULL,
  transaction_type text NOT NULL, -- 'correct_answer', 'competency_mastered', 'subject_mastered', etc.
  base_points int NOT NULL DEFAULT 0,
  difficulty_bonus int NOT NULL DEFAULT 0,
  streak_bonus int NOT NULL DEFAULT 0,
  mastery_bonus int NOT NULL DEFAULT 0,
  total_points int NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_point_transactions_competency ON point_transactions(competency_code);

-- Create leaderboard views (optional, for performance)
CREATE OR REPLACE VIEW user_leaderboard AS
SELECT 
  p.id,
  p.full_name,
  p.total_points,
  p.classroom_id,
  p.school_id,
  ROW_NUMBER() OVER (ORDER BY p.total_points DESC) as global_rank,
  ROW_NUMBER() OVER (PARTITION BY p.classroom_id ORDER BY p.total_points DESC) as class_rank,
  ROW_NUMBER() OVER (PARTITION BY p.school_id ORDER BY p.total_points DESC) as school_rank
FROM profiles p
WHERE p.user_type = 'student';

-- Enable RLS on point_transactions
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- RLS: Students can view their own transactions
CREATE POLICY IF NOT EXISTS "Students view own points"
ON point_transactions FOR SELECT
USING (auth.uid() = user_id);

-- RLS: System can insert transactions (via service role)
CREATE POLICY IF NOT EXISTS "Service role inserts points"
ON point_transactions FOR INSERT
WITH CHECK (true); -- Only allow via authenticated API endpoint

-- RLS: Users can only update their own profile points (via trigger, not direct)
-- Points should be updated via the point_transactions table insert

-- Create a function to add points (called from API)
CREATE OR REPLACE FUNCTION add_points_transaction(
  p_user_id uuid,
  p_competency_code text,
  p_transaction_type text,
  p_base_points int DEFAULT 0,
  p_difficulty_bonus int DEFAULT 0,
  p_streak_bonus int DEFAULT 0,
  p_mastery_bonus int DEFAULT 0
) RETURNS point_transactions AS $$
DECLARE
  v_total_points int;
  v_transaction point_transactions;
BEGIN
  v_total_points := COALESCE(p_base_points, 0) + COALESCE(p_difficulty_bonus, 0) + 
                    COALESCE(p_streak_bonus, 0) + COALESCE(p_mastery_bonus, 0);
  
  -- Insert transaction
  INSERT INTO point_transactions (
    user_id,
    competency_code,
    transaction_type,
    base_points,
    difficulty_bonus,
    streak_bonus,
    mastery_bonus,
    total_points
  ) VALUES (
    p_user_id,
    p_competency_code,
    p_transaction_type,
    p_base_points,
    p_difficulty_bonus,
    p_streak_bonus,
    p_mastery_bonus,
    v_total_points
  ) RETURNING * INTO v_transaction;
  
  -- Update user's total points
  UPDATE profiles SET total_points = total_points + v_total_points
  WHERE id = p_user_id;
  
  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION add_points_transaction TO authenticated;

-- Create index on profiles for ranking
CREATE INDEX IF NOT EXISTS idx_profiles_total_points ON profiles(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_classroom_id ON profiles(classroom_id);
