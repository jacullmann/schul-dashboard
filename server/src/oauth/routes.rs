use super::handlers::*;
use crate::state::AppState;
use axum::{
    Router,
    routing::{delete, get, post},
};
use std::sync::Arc;
use tower_governor::{
    GovernorLayer, governor::GovernorConfigBuilder, key_extractor::SmartIpKeyExtractor,
};

pub fn router() -> Router<AppState> {
    let oauth_limiter = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(5)
            .burst_size(10)
            .key_extractor(SmartIpKeyExtractor)
            .finish()
            .expect("valid oauth rate limit config"),
    );

    let sensitive = Router::new()
        .route("/auth/google", get(initiate_google_oauth))
        .route("/auth/google/callback", get(handle_google_callback))
        .route("/auth/google/link", post(link_google_account))
        .layer(GovernorLayer::new(oauth_limiter));

    let normal = Router::new()
        .route("/auth/google/unlink", delete(unlink_google_account))
        .route("/auth/providers", get(get_linked_providers));

    Router::new().merge(sensitive).merge(normal)
}
