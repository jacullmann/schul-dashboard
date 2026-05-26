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
        .route("/user/setup", patch(update_setup))
        .route("/user/checks", get(get_checks))
        .route("/user/pins", get(get_pins))
        .route("/user/visibility", get(get_visibility))
        .route(
            "/user/items/{id}/visibility",
            post(set_visibility).delete(remove_visibility),
        )
        .route(
            "/user/items/{id}/check",
            post(check_item).delete(uncheck_item),
        )
        .route("/user/items/{id}/pin", post(pin_item).delete(unpin_item))
        .route("/user/activity/pageload", post(log_page_load))
}
