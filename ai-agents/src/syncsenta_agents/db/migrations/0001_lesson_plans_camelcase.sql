-- Phase 2 of scheme-scribe-merge: add a single JSONB blob column for the new
-- camelCase lesson-plan shape (matches scheme-scribe-ai's contract). The
-- legacy typed columns are kept around so older readers don't break, but new
-- inserts only populate `plan` plus the scalar columns needed for indexes.
--
-- Idempotent — safe to re-run.

ALTER TABLE lesson_plans
    ADD COLUMN IF NOT EXISTS plan JSONB,
    ADD COLUMN IF NOT EXISTS strand TEXT,
    ADD COLUMN IF NOT EXISTS sub_strand TEXT;

-- Legacy columns become nullable so the new save path can omit them.
ALTER TABLE lesson_plans
    ALTER COLUMN learning_outcomes DROP NOT NULL,
    ALTER COLUMN key_questions DROP NOT NULL,
    ALTER COLUMN introduction DROP NOT NULL,
    ALTER COLUMN main_activities DROP NOT NULL,
    ALTER COLUMN differentiation DROP NOT NULL,
    ALTER COLUMN assessment DROP NOT NULL,
    ALTER COLUMN conclusion DROP NOT NULL,
    ALTER COLUMN title DROP NOT NULL,
    ALTER COLUMN lesson_number DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lesson_plans_strand ON lesson_plans(strand);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_sub_strand ON lesson_plans(sub_strand);

COMMENT ON COLUMN lesson_plans.plan IS
    'Full validated LessonPlan JSON (scheme-scribe-ai contract). camelCase keys. Authoritative payload — legacy typed columns are deprecated and only kept for back-compat.';
