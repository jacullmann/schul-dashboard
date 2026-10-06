use super::{
    dto::*,
    service::{SuperAdminService, read_server_metrics, superadmin_caller},
};
use crate::{
    common::{
        extractors::SuperAdmin,
        pagination::Page,
        role::{MemberRole, Role},
    },
    error::AppResult,
    group::admin::service::GroupAdminService,
    reports::service::ReportsService,
    state::AppState,
};
use axum::{
    Json,
    extract::{Path, Query, State},
};
use serde::Deserialize;
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct MembershipPath {
    pub id: Uuid,
    pub group_id: Uuid,
}

pub async fn get_stats(State(s): State<AppState>, _: SuperAdmin) -> AppResult<Json<StatsDto>> {
    Ok(Json(SuperAdminService::from_state(&s).get_stats().await?))
}

pub async fn get_daily_activity(
    State(s): State<AppState>,
    _: SuperAdmin,
) -> AppResult<Json<Vec<DailyActivityDto>>> {
    Ok(Json(
        SuperAdminService::from_state(&s)
            .get_daily_activity()
            .await?,
    ))
}

pub async fn get_server_metrics(
    State(s): State<AppState>,
    _: SuperAdmin,
    Query(q): Query<ServerMetricsQuery>,
) -> AppResult<Json<ServerMetricsDto>> {
    Ok(Json(read_server_metrics(&s.hetzner, q.range).await?))
}

pub async fn get_cleanup_jobs(
    State(s): State<AppState>,
    _: SuperAdmin,
) -> AppResult<Json<Vec<CleanupJobDto>>> {
    Ok(Json(
        SuperAdminService::from_state(&s).get_cleanup_jobs().await?,
    ))
}

pub async fn list_groups(
    State(s): State<AppState>,
    _: SuperAdmin,
    Query(q): Query<GroupsQuery>,
) -> AppResult<Json<Page<AdminGroupDto>>> {
    Ok(Json(
        SuperAdminService::from_state(&s).list_groups(&q).await?,
    ))
}

pub async fn delete_group(
    State(s): State<AppState>,
    SuperAdmin(admin): SuperAdmin,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let body = SuperAdminService::from_state(&s)
        .delete_group(id, admin.user_id)
        .await?;
    s.message_bus.membership_changed(id).await;

    Ok(Json(body))
}

pub async fn list_users(
    State(s): State<AppState>,
    _: SuperAdmin,
    Query(q): Query<UsersQuery>,
) -> AppResult<Json<Page<AdminUserDto>>> {
    Ok(Json(
        SuperAdminService::from_state(&s).list_users(&q).await?,
    ))
}

pub async fn get_user_activity(
    State(s): State<AppState>,
    _: SuperAdmin,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        SuperAdminService::from_state(&s)
            .get_user_activity(id)
            .await?,
    ))
}

pub async fn get_user_memberships(
    State(s): State<AppState>,
    SuperAdmin(admin): SuperAdmin,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Vec<UserMembershipDto>>> {
    Ok(Json(
        SuperAdminService::from_state(&s)
            .get_user_memberships(id, admin.user_id)
            .await?,
    ))
}

/// Picking "owner" hands the group over; the previous owner stays as admin.
pub async fn change_membership_role(
    State(s): State<AppState>,
    SuperAdmin(admin): SuperAdmin,
    Path(MembershipPath { id, group_id }): Path<MembershipPath>,
    Json(dto): Json<ChangeMembershipRoleDto>,
) -> AppResult<Json<Value>> {
    let groups = GroupAdminService::from_state(&s);
    let caller = superadmin_caller(admin.user_id);

    let body = match dto.role {
        MemberRole::Owner => groups.transfer_ownership(group_id, caller, id).await?,
        MemberRole::Admin => {
            groups
                .change_member_role(group_id, caller, id, Role::Admin)
                .await?
        }
        MemberRole::Moderator => {
            groups
                .change_member_role(group_id, caller, id, Role::Moderator)
                .await?
        }
        MemberRole::User => {
            groups
                .change_member_role(group_id, caller, id, Role::User)
                .await?
        }
    };

    Ok(Json(body))
}

pub async fn ban_user(
    State(s): State<AppState>,
    SuperAdmin(admin): SuperAdmin,
    Path(target): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let body = SuperAdminService::from_state(&s)
        .ban_user(target, admin.user_id)
        .await?;
    s.message_bus.end_sessions(target);

    Ok(Json(body))
}

pub async fn unban_user(
    State(s): State<AppState>,
    SuperAdmin(admin): SuperAdmin,
    Path(target): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        SuperAdminService::from_state(&s)
            .unban_user(target, admin.user_id)
            .await?,
    ))
}

pub async fn delete_user(
    State(s): State<AppState>,
    SuperAdmin(admin): SuperAdmin,
    Path(target): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let body = SuperAdminService::from_state(&s)
        .delete_user(target, admin.user_id)
        .await?;
    s.message_bus.end_sessions(target);

    Ok(Json(body))
}

pub async fn update_user_role(
    State(s): State<AppState>,
    SuperAdmin(admin): SuperAdmin,
    Path(target): Path<Uuid>,
    Json(dto): Json<UpdateUserRoleDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        SuperAdminService::from_state(&s)
            .update_user_role(target, dto.role, admin.user_id)
            .await?,
    ))
}

pub async fn get_reports(State(s): State<AppState>, _: SuperAdmin) -> AppResult<Json<Value>> {
    Ok(Json(ReportsService::from_state(&s).list().await?))
}

pub async fn delete_report(
    State(s): State<AppState>,
    SuperAdmin(admin): SuperAdmin,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        ReportsService::from_state(&s)
            .delete(id, admin.user_id)
            .await?,
    ))
}
