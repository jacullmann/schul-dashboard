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
    let brute_force_limiter = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(10)
            .burst_size(5)
            .key_extractor(SmartIpKeyExtractor)
            .finish()
            .expect("valid auth rate limit config"),
    );

    let sensitive = Router::new()
        .route("/auth/login", post(login))
        .route("/auth/register", post(register))
        .route("/auth/forgot", post(forgot_password))
        .route("/auth/reset/verify", post(verify_reset_token))
        .route("/auth/reset", post(reset_password))
        .layer(GovernorLayer::new(brute_force_limiter));

    let normal = Router::new()
        .route("/auth/mfa/verify", post(verify_mfa))
        .route("/auth/mfa/cancel", post(cancel_mfa))
        .route("/auth/me", get(get_me).delete(delete_me))
        .route("/auth/verify", get(verify_email))
        .route("/auth/change-password", post(change_password))
        .route("/auth/groups", get(get_groups))
        .route("/auth/refresh", post(refresh))
        .route("/auth/logout", post(logout))
        .route("/auth/logout-all", post(logout_all))
        .route("/auth/logout-others", post(logout_all_others))
        .route("/auth/sessions", get(list_sessions))
        .route("/auth/sessions/{family_id}", delete(revoke_session));

    Router::new().merge(sensitive).merge(normal)
}
