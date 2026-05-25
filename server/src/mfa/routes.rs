use super::handlers::*;
use crate::state::AppState;
use axum::{
    Router,
    routing::{get, post},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/mfa/status", get(get_status))
        .route("/mfa/setup", post(setup))
        .route("/mfa/activate", post(activate))
        .route("/mfa/deactivate", post(deactivate))
}
