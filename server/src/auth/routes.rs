use super::handlers::*;
use crate::{common::rate_limit, state::AppState};
use axum::{
    Router,
    routing::{delete, get, post},
};
use std::time::Duration;

pub fn router() -> Router<AppState> {
    // A separate bucket from the password routes, so mistyped 2FA codes do not
    // eat into the login budget of everyone sharing an IP (e.g. a school NAT).
    let mfa = Router::new()
        .route("/auth/mfa/verify", post(verify_mfa))
        .layer(rate_limit::per_ip(20, Duration::from_secs(1)));

    let sensitive = Router::new()
        .route("/auth/login", post(login))
        .route("/auth/register", post(register))
        .route("/auth/forgot", post(forgot_password))
        .route("/auth/reset/verify", post(verify_reset_token))
        .route("/auth/reset", post(reset_password))
        .route("/auth/set-password/code", post(request_password_setup_code))
        .route("/auth/set-password", post(set_password))
        .layer(rate_limit::per_ip(30, Duration::from_secs(1)));

    let normal = Router::new()
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

    Router::new().merge(mfa).merge(sensitive).merge(normal)
}
