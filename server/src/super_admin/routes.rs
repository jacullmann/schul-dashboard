use super::handlers::*;
use crate::state::AppState;
use axum::{
    Router,
    routing::{delete, get, patch, post},
};

pub fn router() -> Router<AppState> {
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
        .route("/admin/subjects", post(upsert_subject))
        .route("/admin/subjects/{name}", delete(delete_subject))
        .route(
            "/admin/schedule/subs",
            get(get_schedule_subs_admin).post(create_schedule_sub_admin),
        )
        .route(
            "/admin/schedule/subs/{id}",
            delete(delete_schedule_sub_admin),
        )
}
