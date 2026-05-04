//! Competency tracking API handlers
//!
//! Routes:
//! - GET  /api/v1/students/:id/competencies — Get student's competency map
//! - POST /api/v1/students/:id/competencies/:comp_id/mastery — Update mastery
//! - GET  /api/v1/students/:id/recommended — Get recommended next competency

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
    services::competency,
};

#[derive(Clone)]
pub struct CompetencyState {
    pub db: PgPool,
    pub config: AppConfig,
}

pub fn router(db: PgPool, cfg: AppConfig) -> Router {
    let state = CompetencyState { db, config: cfg };
    Router::new()
        .route("/students/:id/competencies", get(get_competencies))
        .route("/students/:id/competencies/:comp_id/mastery", post(update_mastery))
        .route("/students/:id/recommended", get(get_recommended))
        .with_state(state)
}

/// GET /api/v1/students/:id/competencies
async fn get_competencies(
    State(s): State<CompetencyState>,
    Extension(AuthUser(_claims)): Extension<AuthUser>,
    Path(student_id): Path<Uuid>,
) -> (StatusCode, Json<Value>) {
    match competency::get_student_competencies(&s.db, student_id).await {
        Ok(subjects) => (
            StatusCode::OK,
            Json(json!({
                "subjects": subjects
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

#[derive(serde::Deserialize)]
struct UpdateMasteryRequest {
    mastery_delta: i32,
}

/// POST /api/v1/students/:id/competencies/:comp_id/mastery
async fn update_mastery(
    State(s): State<CompetencyState>,
    Extension(AuthUser(_claims)): Extension<AuthUser>,
    Path((student_id, comp_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateMasteryRequest>,
) -> (StatusCode, Json<Value>) {
    match competency::update_competency_mastery(&s.db, student_id, comp_id, req.mastery_delta).await {
        Ok(new_mastery) => (
            StatusCode::OK,
            Json(json!({
                "success": true,
                "mastery": new_mastery
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

/// GET /api/v1/students/:id/recommended
async fn get_recommended(
    State(s): State<CompetencyState>,
    Extension(AuthUser(_claims)): Extension<AuthUser>,
    Path(student_id): Path<Uuid>,
) -> (StatusCode, Json<Value>) {
    match competency::get_recommended_competency(&s.db, student_id).await {
        Ok(Some(comp)) => (
            StatusCode::OK,
            Json(serde_json::to_value(comp).unwrap_or_default()),
        ),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(json!({"message": "No recommendations available"})),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}
