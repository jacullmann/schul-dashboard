use super::handlers::*;
use crate::state::AppState;
use axum::{
    Router,
    routing::{get, post, put},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/system-announcements", get(list_announcements))
        .route("/system-announcements/read", post(mark_announcements_read))
}

/// Merged into the super admin router, behind its `require_superadmin` layer.
pub fn admin_router() -> Router<AppState> {
    Router::new()
        .route(
            "/admin/system-announcements",
            get(list_admin_announcements).post(create_announcement),
        )
        .route(
            "/admin/system-announcements/{id}",
            put(update_announcement).delete(delete_announcement),
        )
}
