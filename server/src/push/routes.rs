use super::handlers::*;
use crate::state::AppState;
use axum::{
    Router,
    routing::{get, put},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/push/public-key", get(get_public_key))
        .route("/push/subscription", put(subscribe).delete(unsubscribe))
}
