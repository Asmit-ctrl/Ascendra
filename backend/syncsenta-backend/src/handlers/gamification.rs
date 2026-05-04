//! Gamification API handlers
//!
//! Routes:
//! - GET  /api/v1/students/:id/gamification — Get student's gamification data
//! - POST /api/v1/students/:id/points       — Award points to student

use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde_json::{json, Value};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    config::AppConfig,
    middleware::auth::AuthUser,
    services::gamification,
};

#[derive(Clone)]
pub struct GamificationState {
    pub db: PgPool,
    pub config: AppConfig,
}

pub fn router(db: PgPool, cfg: AppConfig) -> Router {
    let state = GamificationState { db, config: cfg };
    Router::new()
        .route("/students/:id/gamification", get(get_gamification))
        .route("/students/:id/points", post(award_points))
        .route("/students/:id/streak", post(update_streak))
        .with_state(state)
}

/// GET /api/v1/students/:id/gamification
async fn get_gamification(
    State(s): State<GamificationState>,
    Extension(AuthUser(_claims)): Extension<AuthUser>,
    Path(student_id): Path<Uuid>,
) -> (StatusCode, Json<Value>) {
    match gamification::get_student_gamification(&s.db, student_id).await {
        Ok(data) => (StatusCode::OK, Json(serde_json::to_value(data).unwrap_or_default())),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

#[derive(serde::Deserialize)]
struct AwardPointsRequest {
    points: i32,
    reason: String,
}

/// POST /api/v1/students/:id/points
async fn award_points(
    State(s): State<GamificationState>,
    Extension(AuthUser(_claims)): Extension<AuthUser>,
    Path(student_id): Path<Uuid>,
    Json(req): Json<AwardPointsRequest>,
) -> (StatusCode, Json<Value>) {
    match gamification::award_points(&s.db, student_id, req.points, &req.reason).await {
        Ok(()) => (
            StatusCode::OK,
            Json(json!({
                "success": true,
                "message": format!("Awarded {} points", req.points)
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

/// POST /api/v1/students/:id/streak
async fn update_streak(
    State(s): State<GamificationState>,
    Extension(AuthUser(_claims)): Extension<AuthUser>,
    Path(student_id): Path<Uuid>,
) -> (StatusCode, Json<Value>) {
    match gamification::update_streak(&s.db, student_id).await {
        Ok(streak) => (
            StatusCode::OK,
            Json(json!({
                "success": true,
                "streak": streak
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}
