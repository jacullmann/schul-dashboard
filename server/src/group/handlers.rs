use super::{dto::*, service::GroupService};
use crate::{
    common::extractors::{AuthUser, ClientIp, OptionalAuth, TenantContext, UserAgent},
    error::{AppError, AppResult},
    state::AppState,
};
use axum::{
    Json,
    extract::{Path, Query, State},
};
use axum_extra::extract::CookieJar;
use serde::Deserialize;
use serde_json::{Value, json};
use uuid::Uuid;

use super::admin::service::GroupAdminService;

pub async fn join_group(
    State(s): State<AppState>,
    user: AuthUser,
    ClientIp(ip): ClientIp,
    UserAgent(ua): UserAgent,
    Json(dto): Json<JoinGroupDto>,
) -> AppResult<(CookieJar, Json<Value>)> {
    let (jar, body) = GroupService::from_state(&s)
        .join_group(
            user.user_id,
            &user.email,
            &user.global_role,
            &dto.group_name,
            &dto.password,
            ip.as_deref(),
            ua.as_deref(),
        )
        .await?;

    Ok((jar, Json(body)))
}

pub async fn create_group(
    State(s): State<AppState>,
    user: AuthUser,
    ClientIp(ip): ClientIp,
    UserAgent(ua): UserAgent,
    Json(dto): Json<CreateGroupDto>,
) -> AppResult<(CookieJar, Json<Value>)> {
    let (jar, body) = GroupService::from_state(&s)
        .create_group(
            user.user_id,
            &user.email,
            &user.global_role,
            &dto.group_name,
            &dto.password,
            ip.as_deref(),
            ua.as_deref(),
        )
        .await?;

    Ok((jar, Json(body)))
}

pub async fn get_status(State(s): State<AppState>, opt: OptionalAuth) -> AppResult<Json<Value>> {
    let (uid, gid, role) = match opt.0 {
        Some(u) => (Some(u.user_id), u.active_group_id, Some(u.global_role)),
        None => (None, None, None),
    };

    Ok(Json(
        GroupService::from_state(&s)
            .get_status(uid, gid, role.as_deref())
            .await?,
    ))
}

pub async fn switch_group(
    State(s): State<AppState>,
    user: AuthUser,
    Json(dto): Json<SwitchGroupDto>,
) -> AppResult<(CookieJar, Json<Value>)> {
    let (jar, body) = GroupService::from_state(&s)
        .switch_group(user.user_id, &user.email, &user.global_role, dto.group_id)
        .await?;

    Ok((jar, Json(body)))
}

pub async fn leave_group(
    State(s): State<AppState>,
    user: AuthUser,
    Path(group_id): Path<Uuid>,
) -> AppResult<(CookieJar, Json<Value>)> {
    let jar = GroupService::from_state(&s)
        .leave_group(user.user_id, group_id, user.active_group_id)
        .await?;

    Ok((jar, Json(json!({ "ok": true }))))
}

pub async fn logout(
    State(s): State<AppState>,
    jar: CookieJar,
    ClientIp(ip): ClientIp,
    UserAgent(ua): UserAgent,
) -> AppResult<(CookieJar, Json<Value>)> {
    let jar = GroupService::from_state(&s)
        .logout(jar, ip.as_deref(), ua.as_deref())
        .await?;

    Ok((jar, Json(json!({ "ok": true }))))
}

pub async fn get_stats(State(s): State<AppState>, tc: TenantContext) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .get_stats(tc.tenant_id)
            .await?,
    ))
}

pub async fn get_members(State(s): State<AppState>, tc: TenantContext) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .get_members(tc.tenant_id)
            .await?,
    ))
}

pub async fn get_banned_users(
    State(s): State<AppState>,
    tc: TenantContext,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .get_banned_users(tc.tenant_id)
            .await?,
    ))
}

pub async fn revert_ban(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(target): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .revert_ban(tc.tenant_id, tc.user.user_id, target)
            .await?,
    ))
}

pub async fn change_member_role(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(target): Path<Uuid>,
    Json(dto): Json<ChangeMemberRoleDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .change_member_role(tc.tenant_id, tc.user.user_id, target, &dto.role)
            .await?,
    ))
}

pub async fn transfer_ownership(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(body): Json<Value>,
) -> AppResult<Json<Value>> {
    let target: Uuid = body["targetUserId"]
        .as_str()
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| AppError::bad_request("Invalid targetUserId"))?;
    Ok(Json(
        GroupAdminService::from_state(&s)
            .transfer_ownership(tc.tenant_id, tc.user.user_id, target)
            .await?,
    ))
}

#[derive(Deserialize)]
pub struct BanQuery {
    pub ban: Option<String>,
}

pub async fn remove_member(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(target): Path<Uuid>,
    Query(q): Query<BanQuery>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .remove_member(
                tc.tenant_id,
                tc.user.user_id,
                target,
                q.ban.as_deref() == Some("true"),
            )
            .await?,
    ))
}

pub async fn rename_group(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<RenameGroupDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .rename_group(
                tc.tenant_id,
                tc.user.user_id,
                dto.name.as_deref(),
                dto.avatar_url.as_deref(),
            )
            .await?,
    ))
}

pub async fn get_permissions(
    State(s): State<AppState>,
    tc: TenantContext,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .get_permissions(tc.tenant_id)
            .await?,
    ))
}

pub async fn update_permissions(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<UpdateGroupPermissionsDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .update_permissions(tc.tenant_id, tc.user.user_id, dto.permissions)
            .await?,
    ))
}

pub async fn update_group_password(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<UpdateGroupPasswordDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .update_password(
                tc.tenant_id,
                tc.user.user_id,
                &dto.old_password,
                &dto.new_password,
            )
            .await?,
    ))
}

pub async fn update_schedule_config(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<UpdateScheduleConfigDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .update_schedule_config(tc.tenant_id, tc.user.user_id, dto.schedule_config)
            .await?,
    ))
}

pub async fn delete_group(State(s): State<AppState>, tc: TenantContext) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .delete_group(tc.tenant_id, tc.user.user_id)
            .await?,
    ))
}

pub async fn cleanup_old_items(
    State(s): State<AppState>,
    tc: TenantContext,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .cleanup_old_items(tc.tenant_id, tc.user.user_id)
            .await?,
    ))
}

pub async fn get_subjects_admin(
    State(s): State<AppState>,
    tc: TenantContext,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .get_subjects(tc.tenant_id)
            .await?,
    ))
}

pub async fn create_subject(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<CreateSubjectDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .create_subject(tc.tenant_id, tc.user.user_id, &dto.name)
            .await?,
    ))
}

pub async fn update_subject(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(id): Path<Uuid>,
    Json(dto): Json<UpdateSubjectDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .update_subject(
                tc.tenant_id,
                tc.user.user_id,
                id,
                dto.name.as_deref(),
                dto.is_active,
            )
            .await?,
    ))
}

pub async fn delete_subject(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .delete_subject(tc.tenant_id, tc.user.user_id, id)
            .await?,
    ))
}

pub async fn get_schedule_admin(
    State(s): State<AppState>,
    tc: TenantContext,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .get_schedule(tc.tenant_id)
            .await?,
    ))
}

pub async fn get_schedule_subs_admin(
    State(s): State<AppState>,
    tc: TenantContext,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .get_schedule_subs(tc.tenant_id)
            .await?,
    ))
}

pub async fn create_schedule_sub(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<CreateScheduleSubDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .create_schedule_sub(tc.tenant_id, tc.user.user_id, dto)
            .await?,
    ))
}

pub async fn delete_schedule_sub(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .delete_schedule_sub(tc.tenant_id, id)
            .await?,
    ))
}

pub async fn create_announcement(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<CreateAnnouncementDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .create_announcement(
                tc.tenant_id,
                tc.user.user_id,
                &dto.content,
                dto.color.as_deref(),
            )
            .await?,
    ))
}

pub async fn delete_announcement(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .delete_announcement(tc.tenant_id, id)
            .await?,
    ))
}
