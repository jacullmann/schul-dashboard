use super::handlers::*;
use crate::{common::extractors::require_superadmin, state::AppState};
use axum::{
    Router, middleware,
    routing::{delete, get, patch, post},
};

/// Every route here sits behind the `require_superadmin` layer.
pub fn router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/admin/stats", get(get_stats))
        .route("/admin/cleanup/old-items", delete(cleanup_old_items))
        .route("/admin/groups", get(get_groups))
        .route("/admin/groups/{id}", delete(delete_group))
        .route("/admin/all-users", get(get_all_users))
        .route("/admin/users/{id}/activity", get(get_user_activity))
        .route("/admin/users/{id}/ban", post(ban_user))
        .route("/admin/users/{id}/ban", delete(unban_user))
        .route(
            "/admin/users/{id}",
            delete(delete_user).patch(update_user_role),
        )
        .route("/admin/users/{id}/activity/prune", delete(prune_activity))
        .route("/admin/reports", get(get_reports))
        .route("/admin/reports/{id}/processed", patch(process_report))
        .route("/admin/reports/{id}", delete(delete_report))
        .route_layer(middleware::from_fn_with_state(state, require_superadmin))
}
