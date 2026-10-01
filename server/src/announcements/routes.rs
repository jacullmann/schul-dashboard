use super::handlers::*;
use crate::state::AppState;
use axum::{
    Router,
    routing::{delete, get, post},
};

/// Mounted under `/groups/{group_id}` behind the tenant middleware.
pub fn group_router() -> Router<AppState> {
    Router::new()
        .route("/announcements", get(list_announcements))
        .route("/announcements/read", post(mark_announcements_read))
        .route("/admin/announcements", post(create_announcement))
        .route("/admin/announcements/{id}", delete(delete_announcement))
}
