use super::handlers::*;
use crate::state::AppState;
use axum::{
    Router,
    routing::{get, patch, post},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/user/personalization", patch(update_personalization))
        .route("/user/preferences", patch(update_preferences))
        .route("/user/checks", get(get_checks))
        .route("/user/pins", get(get_pins))
        .route("/user/visibility", get(get_visibility))
        .route("/user/activity/pageload", post(log_page_load))
}

/// Mounted under `/groups/{group_id}` behind the tenant middleware: the
/// caller's own state for this group and its items.
pub fn group_router() -> Router<AppState> {
    Router::new()
        .route("/me/courses", patch(update_setup))
        .route(
            "/items/{id}/visibility",
            post(set_visibility).delete(remove_visibility),
        )
        .route("/items/{id}/check", post(check_item).delete(uncheck_item))
        .route("/items/{id}/pin", post(pin_item).delete(unpin_item))
}
