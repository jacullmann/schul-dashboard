use super::handlers::*;
use crate::state::AppState;
use axum::{Router, routing::get};

pub fn router() -> Router<AppState> {
    Router::new().route("/system/access", get(get_access_status))
}

/// Merged into the super admin router, behind its `require_superadmin` layer.
pub fn admin_router() -> Router<AppState> {
    Router::new().route(
        "/admin/access-controls",
        get(get_access_controls).patch(update_access_controls),
    )
}
