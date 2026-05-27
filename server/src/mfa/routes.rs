use super::handlers::*;
use crate::state::AppState;
use axum::{
    Router,
    routing::{get, post},
};
use std::sync::Arc;
use tower_governor::{
    GovernorLayer, governor::GovernorConfigBuilder, key_extractor::SmartIpKeyExtractor,
};

pub fn router() -> Router<AppState> {
    let totp_limiter = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(30)
            .burst_size(3)
            .key_extractor(SmartIpKeyExtractor)
            .finish()
            .expect("valid mfa rate limit config"),
    );

    let sensitive = Router::new()
        .route("/mfa/activate", post(activate))
        .route("/mfa/deactivate", post(deactivate))
        .layer(GovernorLayer::new(totp_limiter));

    let normal = Router::new()
        .route("/mfa/status", get(get_status))
        .route("/mfa/setup", post(setup));

    Router::new().merge(sensitive).merge(normal)
}
