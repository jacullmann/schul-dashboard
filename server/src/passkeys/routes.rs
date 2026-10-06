use super::handlers::*;
use crate::{common::rate_limit, state::AppState};
use axum::{
    Router,
    routing::{get, patch, post},
};
use std::time::Duration;

pub fn router() -> Router<AppState> {
    // The login page asks for a challenge as soon as it opens, so the burst
    // covers a class opening it together. A signature cannot be guessed; the
    // limit only stops floods of stored challenges.
    let sign_in = Router::new()
        .route("/auth/passkey/challenge", post(start_sign_in))
        .route("/auth/passkey/verify", post(finish_sign_in))
        .layer(rate_limit::per_client(60, Duration::from_secs(1)));

    let registration = Router::new()
        .route("/passkeys/registration/start", post(start_registration))
        .route("/passkeys/registration/finish", post(finish_registration))
        .layer(rate_limit::per_client(10, Duration::from_secs(2)));

    let normal = Router::new().route("/passkeys", get(list_passkeys)).route(
        "/passkeys/{id}",
        patch(rename_passkey).delete(remove_passkey),
    );

    Router::new()
        .merge(sign_in)
        .merge(registration)
        .merge(normal)
}
