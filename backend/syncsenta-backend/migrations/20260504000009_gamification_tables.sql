-- Gamification tables for Mwalimu AI MVP
-- Points, levels, badges, and streaks

-- Student gamification data
CREATE TABLE IF NOT EXISTS student_gamification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
    streak_days INTEGER NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
    last_activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    rank INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_gamification_student_id ON student_gamification(student_id);
CREATE INDEX idx_student_gamification_points ON student_gamification(points DESC);
CREATE INDEX idx_student_gamification_level ON student_gamification(level DESC);

-- Badges
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    criteria JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_badges_rarity ON badges(rarity);

-- Student badges (earned)
CREATE TABLE IF NOT EXISTS student_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, badge_id)
);

CREATE INDEX idx_student_badges_student_id ON student_badges(student_id);
CREATE INDEX idx_student_badges_badge_id ON student_badges(badge_id);
CREATE INDEX idx_student_badges_earned_at ON student_badges(earned_at DESC);

-- Insert default badges
INSERT INTO badges (id, name, description, icon, rarity, criteria) VALUES
    (gen_random_uuid(), 'first-steps', 'Completed your first lesson', 'star', 'common', '{"name": "first-steps"}'::jsonb),
    (gen_random_uuid(), 'week-warrior', '7-day learning streak', 'flame', 'rare', '{"name": "week-warrior"}'::jsonb),
    (gen_random_uuid(), 'math-master', 'Mastered 10 math competencies', 'trophy', 'epic', '{"name": "math-master"}'::jsonb),
    (gen_random_uuid(), 'perfect-score', 'Got 100% on a quiz', 'crown', 'legendary', '{"name": "perfect-score"}'::jsonb),
    (gen_random_uuid(), 'helping-hand', 'Helped 5 classmates', 'award', 'rare', '{"name": "helping-hand"}'::jsonb),
    (gen_random_uuid(), 'speed-demon', 'Completed 10 lessons in one day', 'zap', 'epic', '{"name": "speed-demon"}'::jsonb),
    (gen_random_uuid(), 'level-5', 'Reached level 5', 'target', 'rare', '{"name": "level-5"}'::jsonb),
    (gen_random_uuid(), 'points-1000', 'Earned 1000 points', 'sparkles', 'epic', '{"name": "points-1000"}'::jsonb)
ON CONFLICT (name) DO NOTHING;
