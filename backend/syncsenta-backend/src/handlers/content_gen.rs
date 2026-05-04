//! Content generation API handlers (Magic School AI)
//!
//! Routes:
//! - POST /api/v1/teachers/generate/lesson — Generate lesson plan
//! - POST /api/v1/teachers/generate/quiz   — Generate quiz
//! - POST /api/v1/teachers/generate/report — Generate student report

use axum::{
    extract::{Extension, State},
    http::StatusCode,
    routing::post,
    Json, Router,
};
use serde_json::{json, Value};
use sqlx::PgPool;

use crate::{
    config::AppConfig,
    middleware::auth::AuthUser,
    services::content_generation::{
        self, LessonPlanRequest, QuizRequest, ReportRequest,
    },
};

#[derive(Clone)]
pub struct ContentGenState {
    pub db: PgPool,
    pub config: AppConfig,
}

pub fn router(db: PgPool, cfg: AppConfig) -> Router {
    let state = ContentGenState { db, config: cfg };
    Router::new()
        .route("/teachers/generate/lesson", post(generate_lesson))
        .route("/teachers/generate/quiz", post(generate_quiz))
        .route("/teachers/generate/report", post(generate_report))
        .with_state(state)
}

/// POST /api/v1/teachers/generate/lesson
async fn generate_lesson(
    State(s): State<ContentGenState>,
    Extension(AuthUser(_claims)): Extension<AuthUser>,
    Json(req): Json<LessonPlanRequest>,
) -> (StatusCode, Json<Value>) {
    match content_generation::generate_lesson_plan(&s.config, req).await {
        Ok(content) => (
            StatusCode::OK,
            Json(serde_json::to_value(content).unwrap_or_default()),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

/// POST /api/v1/teachers/generate/quiz
async fn generate_quiz(
    State(s): State<ContentGenState>,
    Extension(AuthUser(_claims)): Extension<AuthUser>,
    Json(req): Json<QuizRequest>,
) -> (StatusCode, Json<Value>) {
    match content_generation::generate_quiz(&s.config, req).await {
        Ok(content) => (
            StatusCode::OK,
            Json(serde_json::to_value(content).unwrap_or_default()),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

/// POST /api/v1/teachers/generate/report
async fn generate_report(
    State(s): State<ContentGenState>,
    Extension(AuthUser(_claims)): Extension<AuthUser>,
    Json(req): Json<ReportRequest>,
) -> (StatusCode, Json<Value>) {
    // Fetch student data from database
    let student_data = match fetch_student_data(&s.db, req.student_id).await {
        Ok(data) => data,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("Failed to fetch student data: {}", e)})),
            )
        }
    };

    match content_generation::generate_report(&s.config, req, student_data).await {
        Ok(content) => (
            StatusCode::OK,
            Json(serde_json::to_value(content).unwrap_or_default()),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

/// Fetch student data for report generation
async fn fetch_student_data(db: &PgPool, student_id: uuid::Uuid) -> anyhow::Result<Value> {
    // Fetch student info
    let student = sqlx::query!(
        r#"SELECT name, grade_level FROM students WHERE user_id = $1"#,
        student_id
    )
    .fetch_optional(db)
    .await?;

    // Fetch gamification data
    let gamification = sqlx::query!(
        r#"SELECT points, level, streak_days FROM student_gamification WHERE student_id = $1"#,
        student_id
    )
    .fetch_optional(db)
    .await?;

    // Fetch competency summary
    let competencies = sqlx::query!(
        r#"
        SELECT 
            c.subject,
            AVG(sc.mastery_percentage) as "avg_mastery"
        FROM student_competencies sc
        JOIN competencies c ON sc.competency_id = c.id
        WHERE sc.student_id = $1
        GROUP BY c.subject
        "#,
        student_id
    )
    .fetch_all(db)
    .await?;

    Ok(json!({
        "student": {
            "name": student.as_ref().map(|s| &s.name),
            "grade": student.as_ref().map(|s| &s.grade_level),
        },
        "gamification": {
            "points": gamification.as_ref().map(|g| g.points),
            "level": gamification.as_ref().map(|g| g.level),
            "streak": gamification.as_ref().map(|g| g.streak_days),
        },
        "competencies": competencies.iter().map(|c| json!({
            "subject": c.subject,
            "mastery": c.avg_mastery
        })).collect::<Vec<_>>(),
    }))
}
