use super::handlers::*;
use crate::state::AppState;
use axum::{Router, routing::{delete, get, patch, post}};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/groups/join", post(join_group))
        .route("/groups/create", post(create_group))
        .route("/groups/status", get(get_status))
        .route("/groups/switch", post(switch_group))
        .route("/groups/{id}/leave", delete(leave_group))
        .route("/groups/logout", post(logout))
        .route("/group-admin/stats", get(get_stats))
        .route("/group-admin/members", get(get_members))
        .route("/group-admin/banned-users", get(get_banned_users))
        .route("/group-admin/banned-users/{userId}", delete(revert_ban))
        .route("/group-admin/members/{userId}/role", patch(change_member_role))
        .route("/group-admin/transfer-ownership", post(transfer_ownership))
        .route("/group-admin/members/{userId}", delete(remove_member))
        .route("/group-admin/settings", patch(rename_group))
        .route("/group-admin/permissions", get(get_permissions).patch(update_permissions))
        .route("/group-admin/password", patch(update_group_password))
        .route("/group-admin/schedule-config", patch(update_schedule_config))
        .route("/group-admin", delete(delete_group))
        .route("/group-admin/cleanup/old-items", delete(cleanup_old_items))
        .route("/group-admin/subjects", get(get_subjects_admin).post(create_subject))
        .route("/group-admin/subjects/{id}", patch(update_subject).delete(delete_subject))
        .route("/group-admin/schedule", get(get_schedule_admin))
        .route("/group-admin/schedule/subs", get(get_schedule_subs_admin).post(create_schedule_sub))
        .route("/group-admin/schedule/subs/{id}", delete(delete_schedule_sub))
        .route("/group-admin/announcements", post(create_announcement))
        .route("/group-admin/announcements/{id}", delete(delete_announcement))
}
