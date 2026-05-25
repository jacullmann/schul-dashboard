use super::handlers::*;
use crate::state::AppState;
use axum::{
    Router,
    routing::{delete, get, post},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/auth/google", get(initiate_google_oauth))
        .route("/auth/google/callback", get(handle_google_callback))
        .route("/auth/google/link", post(link_google_account))
        .route("/auth/google/unlink", delete(unlink_google_account))
        .route("/auth/providers", get(get_linked_providers))
}
