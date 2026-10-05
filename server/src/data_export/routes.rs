use super::handlers::*;
use crate::{common::rate_limit, state::AppState};
use axum::{Router, routing::get};
use std::time::Duration;

pub fn router() -> Router<AppState> {
    // Each export reads every table holding the user's data; the limit keeps
    // repeated clicks from turning that into load.
    Router::new()
        .route("/user/data-export", get(export_data))
        .layer(rate_limit::per_ip(10, Duration::from_secs(30)))
}
