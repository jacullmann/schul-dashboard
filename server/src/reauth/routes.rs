use super::handlers::*;
use crate::{common::rate_limit, state::AppState};
use axum::{
    Router,
    routing::{get, post},
};
use std::time::Duration;

pub fn router() -> Router<AppState> {
    // Shares the pace of the password sign-in; the per-account lock bounds
    // guessing by anyone who holds a session.
    let confirm = Router::new()
        .route("/auth/reauth/password", post(confirm_with_password))
        .route("/auth/reauth/passkey/start", post(start_passkey))
        .route("/auth/reauth/passkey/finish", post(confirm_with_passkey))
        .route("/auth/reauth/google/start", post(start_google))
        .route(
            "/auth/reauth/google/second-factor",
            post(confirm_google_second_factor),
        )
        .layer(rate_limit::per_client(30, Duration::from_secs(3)));

    Router::new()
        .route("/auth/reauth", get(status))
        .merge(confirm)
}
