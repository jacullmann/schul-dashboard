use super::handlers::*;
use crate::state::AppState;
use axum::{
    Router,
    routing::{delete, get, post},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/auth/login", post(login))
        .route("/auth/mfa/verify", post(verify_mfa))
        .route("/auth/mfa/cancel", post(cancel_mfa))
        .route("/auth/register", post(register))
        .route("/auth/me", get(get_me))
        .route("/auth/me", delete(delete_me))
        .route("/auth/verify", get(verify_email))
        .route("/auth/forgot", post(forgot_password))
        .route("/auth/reset/verify", post(verify_reset_token))
        .route("/auth/reset", post(reset_password))
        .route("/auth/change-password", post(change_password))
        .route("/auth/groups", get(get_groups))
        .route("/auth/refresh", post(refresh))
        .route("/auth/logout", post(logout))
        .route("/auth/logout-all", post(logout_all))
        .route("/auth/sessions", get(list_sessions))
        .route("/auth/sessions/{family_id}", delete(revoke_session))
}