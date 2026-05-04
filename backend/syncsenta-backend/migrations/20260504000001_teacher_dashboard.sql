-- Teacher Dashboard Schema
-- Real-time monitoring and analytics for teachers

-- Student Activity Log
CREATE TABLE IF NOT EXISTS student_activities (
    id BIGSERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    session_id UUID NOT NULL,
    activity_type VARCHAR(50) NOT NULL, -- 'chat', 'quiz', 'idle', 'login', 'logout'
    subject VARCHAR(100),
    topic VARCHAR(255),
    agent_used VARCHAR(50), -- 'tutor', 'assessment', 'translation', 'cbc_advisor'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'struggling', 'idle', 'completed'
    duration_seconds INT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_student_activities_student_id ON student_activities(student_id);
CREATE INDEX idx_student_activities_session_id ON student_activities(session_id);
CREATE INDEX idx_student_activities_created_at ON student_activities(created_at DESC);
CREATE INDEX idx_student_activities_status ON student_activities(status);

-- AI Agent Interactions
CREATE TABLE IF NOT EXISTS agent_interactions (
    id BIGSERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    session_id UUID NOT NULL,
    agent_type VARCHAR(50) NOT NULL,
    request_text TEXT,
    response_text TEXT,
    response_time_ms INT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    tokens_used INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_interactions_student_id ON agent_interactions(student_id);
CREATE INDEX idx_agent_interactions_agent_type ON agent_interactions(agent_type);
CREATE INDEX idx_agent_interactions_created_at ON agent_interactions(created_at DESC);

-- Student Progress Tracking
CREATE TABLE IF NOT EXISTS student_progress (
    id BIGSERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    mastery_level FLOAT DEFAULT 0.0, -- 0.0 to 1.0
    quiz_scores JSONB, -- Array of quiz results
    time_spent_seconds INT DEFAULT 0,
    attempts INT DEFAULT 0,
    last_activity TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, subject, topic)
);

CREATE INDEX idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX idx_student_progress_subject ON student_progress(subject);
CREATE INDEX idx_student_progress_mastery ON student_progress(mastery_level);

-- Teacher Interventions
CREATE TABLE IF NOT EXISTS teacher_interventions (
    id BIGSERIAL PRIMARY KEY,
    teacher_id VARCHAR(255) NOT NULL,
    student_id VARCHAR(255) NOT NULL,
    intervention_type VARCHAR(50) NOT NULL, -- 'message', 'assignment', 'flag', 'redirect'
    content TEXT,
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teacher_interventions_teacher_id ON teacher_interventions(teacher_id);
CREATE INDEX idx_teacher_interventions_student_id ON teacher_interventions(student_id);
CREATE INDEX idx_teacher_interventions_resolved ON teacher_interventions(resolved);

-- Real-time Student Sessions
CREATE TABLE IF NOT EXISTS student_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(255) NOT NULL,
    student_name VARCHAR(255),
    grade VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'idle', 'offline'
    current_subject VARCHAR(100),
    current_topic VARCHAR(255),
    current_agent VARCHAR(50),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    session_start TIMESTAMPTZ DEFAULT NOW(),
    session_end TIMESTAMPTZ,
    total_duration_seconds INT DEFAULT 0
);

CREATE INDEX idx_student_sessions_student_id ON student_sessions(student_id);
CREATE INDEX idx_student_sessions_status ON student_sessions(status);
CREATE INDEX idx_student_sessions_last_activity ON student_sessions(last_activity DESC);

-- Dashboard Alerts
CREATE TABLE IF NOT EXISTS dashboard_alerts (
    id BIGSERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL, -- 'idle', 'struggling', 'progress', 'error'
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high'
    student_id VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dashboard_alerts_student_id ON dashboard_alerts(student_id);
CREATE INDEX idx_dashboard_alerts_acknowledged ON dashboard_alerts(acknowledged);
CREATE INDEX idx_dashboard_alerts_severity ON dashboard_alerts(severity);
CREATE INDEX idx_dashboard_alerts_created_at ON dashboard_alerts(created_at DESC);
