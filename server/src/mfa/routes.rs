use super::handlers::*;
use crate::{common::rate_limit, state::AppState};
use axum::{
    Router,
    routing::{get, post},
};
use std::time::Duration;

pub fn router() -> Router<AppState> {
    let sensitive = Router::new()
        .route("/mfa/activate", post(activate))
        .route("/mfa/deactivate", post(deactivate))
        .layer(rate_limit::per_client(10, Duration::from_secs(2)));

    let normal = Router::new()
        .route("/mfa/status", get(get_status))
        .route("/mfa/setup", post(setup));

    Router::new().merge(sensitive).merge(normal)
}
