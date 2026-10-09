use super::handlers::*;
use crate::{common::rate_limit, state::AppState};
use axum::{
    Router,
    routing::{delete, get, post},
};
use std::time::Duration;

pub fn router() -> Router<AppState> {
    // A Google sign-in takes two requests (start and callback) per person.
    let sensitive = Router::new()
        .route("/auth/google", get(initiate_google_oauth))
        .route("/auth/google/signup", post(sign_up_with_google))
        .route("/auth/google/callback", get(handle_google_callback))
        .route("/auth/google/link/start", post(start_google_link))
        .layer(rate_limit::per_client(60, Duration::from_millis(500)));

    let normal = Router::new()
        .route("/auth/google/unlink", delete(unlink_google_account))
        .route("/auth/providers", get(get_linked_providers));

    Router::new().merge(sensitive).merge(normal)
}
