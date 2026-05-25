use super::handlers::*;
use crate::state::AppState;
use axum::{Router, routing::get};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/system/status", get(status))
        .route("/system/csrf/init", get(csrf_init))
}
