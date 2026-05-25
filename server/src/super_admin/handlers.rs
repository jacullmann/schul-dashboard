use super::{dto::*, service::SuperAdminService};
use crate::{
    common::extractors::{AuthUser, TenantContext},
    error::{AppError, AppResult},
    group::admin::service::GroupAdminService,
    group::dto::CreateScheduleSubDto,
    state::AppState,
};
use axum::{
    Json,
    extract::{Path, State},
};
use serde_json::Value;
use uuid::Uuid;

fn require_superadmin(user: &AuthUser) -> AppResult<()> {
    if !user.is_superadmin() {
        Err(AppError::forbidden("Super-admin privileges required."))
    } else {
        Ok(())
    }
}

pub async fn get_stats(State(s): State<AppState>, tc: TenantContext) -> AppResult<Json<Value>> {
    require_superadmin(&tc.user)?;
    Ok(Json(
        SuperAdminService::from_state(&s)
            .get_stats(tc.tenant_id)
            .await?,
    ))
}

pub async fn cleanup_old_items(
    State(s): State<AppState>,
    tc: TenantContext,
) -> AppResult<Json<Value>> {
    require_superadmin(&tc.user)?;
    Ok(Json(
        SuperAdminService::from_state(&s)
            .cleanup_old_items(tc.tenant_id, tc.user.user_id)
            .await?,
    ))
}

pub async fn get_groups(State(s): State<AppState>, user: AuthUser) -> AppResult<Json<Value>> {
    require_superadmin(&user)?;

    Ok(Json(SuperAdminService::from_state(&s).get_groups().await?))
}

pub async fn delete_group(
    State(s): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    require_superadmin(&user)?;

    Ok(Json(
        SuperAdminService::from_state(&s).delete_group(id).await?,
    ))
}

pub async fn get_all_users(State(s): State<AppState>, user: AuthUser) -> AppResult<Json<Value>> {
    require_superadmin(&user)?;

    Ok(Json(
        SuperAdminService::from_state(&s).get_all_users().await?,
    ))
}

pub async fn get_user_activity(
    State(s): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    require_superadmin(&user)?;

    Ok(Json(
        SuperAdminService::from_state(&s)
            .get_user_activity(id)
            .await?,
    ))
}

pub async fn ban_user(
    State(s): State<AppState>,
    user: AuthUser,
    Path(target): Path<Uuid>,
) -> AppResult<Json<Value>> {
    require_superadmin(&user)?;

    Ok(Json(
        SuperAdminService::from_state(&s)
            .ban_user(target, user.user_id)
            .await?,
    ))
}

pub async fn unban_user(
    State(s): State<AppState>,
    user: AuthUser,
    Path(target): Path<Uuid>,
) -> AppResult<Json<Value>> {
    require_superadmin(&user)?;

    Ok(Json(
        SuperAdminService::from_state(&s)
            .unban_user(target, user.user_id)
            .await?,
    ))
}

pub async fn delete_user(
    State(s): State<AppState>,
    user: AuthUser,
    Path(target): Path<Uuid>,
) -> AppResult<Json<Value>> {
    require_superadmin(&user)?;

    Ok(Json(
        SuperAdminService::from_state(&s)
            .delete_user(target)
            .await?,
    ))
}

pub async fn update_user_role(
    State(s): State<AppState>,
    user: AuthUser,
    Path(target): Path<Uuid>,
    Json(dto): Json<UpdateUserRoleDto>,
) -> AppResult<Json<Value>> {
    require_superadmin(&user)?;

    Ok(Json(
        SuperAdminService::from_state(&s)
            .update_user_role(target, &dto.role, user.user_id)
            .await?,
    ))
}

pub async fn prune_activity(
    State(s): State<AppState>,
    user: AuthUser,
    Path(target): Path<Uuid>,
) -> AppResult<Json<Value>> {
    require_superadmin(&user)?;

    Ok(Json(
        SuperAdminService::from_state(&s)
            .prune_activity(target, user.user_id)
            .await?,
    ))
}

pub async fn get_reports(State(s): State<AppState>, user: AuthUser) -> AppResult<Json<Value>> {
    require_superadmin(&user)?;

    Ok(Json(SuperAdminService::from_state(&s).get_reports().await?))
}

pub async fn process_report(
    State(s): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(dto): Json<ProcessReportDto>,
) -> AppResult<Json<Value>> {
    require_superadmin(&user)?;

    Ok(Json(
        SuperAdminService::from_state(&s)
            .process_report(id, user.user_id, dto.processed)
            .await?,
    ))
}

pub async fn delete_report(
    State(s): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    require_superadmin(&user)?;

    Ok(Json(
        SuperAdminService::from_state(&s)
            .delete_report(id, user.user_id)
            .await?,
    ))
}

pub async fn upsert_subject(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<CreateSubjectDto>,
) -> AppResult<Json<Value>> {
    require_superadmin(&tc.user)?;

    Ok(Json(
        SuperAdminService::from_state(&s)
            .upsert_subject(tc.tenant_id, &dto.name)
            .await?,
    ))
}

pub async fn delete_subject(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(name): Path<String>,
) -> AppResult<Json<Value>> {
    require_superadmin(&tc.user)?;

    Ok(Json(
        SuperAdminService::from_state(&s)
            .delete_subject_by_name(tc.tenant_id, &name)
            .await?,
    ))
}

pub async fn get_schedule_subs_admin(
    State(s): State<AppState>,
    tc: TenantContext,
) -> AppResult<Json<Value>> {
    require_superadmin(&tc.user)?;

    Ok(Json(
        GroupAdminService::from_state(&s)
            .get_schedule_subs(tc.tenant_id)
            .await?,
    ))
}

pub async fn create_schedule_sub_admin(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<CreateScheduleSubDto>,
) -> AppResult<Json<Value>> {
    require_superadmin(&tc.user)?;

    Ok(Json(
        GroupAdminService::from_state(&s)
            .create_schedule_sub(tc.tenant_id, tc.user.user_id, dto)
            .await?,
    ))
}

pub async fn delete_schedule_sub_admin(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    require_superadmin(&tc.user)?;

    Ok(Json(
        GroupAdminService::from_state(&s)
            .delete_schedule_sub(tc.tenant_id, id)
            .await?,
    ))
}
