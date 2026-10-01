use super::handlers::*;
use crate::state::AppState;
use axum::{Router, routing::get};

/// Mounted under `/groups/{group_id}` behind the tenant middleware.
pub fn group_router() -> Router<AppState> {
    Router::new()
        .route("/schedule", get(get_schedule))
        .route("/schedule/subs", get(get_subs))
        .route("/schedule/subjects", get(get_subjects))
}
