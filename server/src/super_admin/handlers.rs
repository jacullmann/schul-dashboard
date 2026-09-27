use super::{dto::*, service::SuperAdminService};
use crate::{
    common::extractors::SuperAdmin, error::AppResult, reports::service::ReportsService,
    state::AppState,
};
use axum::{
    Json,
    extract::{Path, State},
};
use serde_json::Value;
use uuid::Uuid;

pub async fn get_stats(State(s): State<AppState>, _: SuperAdmin) -> AppResult<Json<Value>> {
    Ok(Json(SuperAdminService::from_state(&s).get_stats().await?))
}

pub async fn cleanup_old_items(
    State(s): State<AppState>,
    SuperAdmin(admin): SuperAdmin,
) -> AppResult<Json<Value>> {
    Ok(Json(
        SuperAdminService::from_state(&s)
            .cleanup_old_items(admin.user_id)
            .await?,
    ))
}

pub async fn get_groups(State(s): State<AppState>, _: SuperAdmin) -> AppResult<Json<Value>> {
    Ok(Json(SuperAdminService::from_state(&s).get_groups().await?))
}

pub async fn delete_group(
    State(s): State<AppState>,
    _: SuperAdmin,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        SuperAdminService::from_state(&s).delete_group(id).await?,
    ))
}

pub async fn get_all_users(State(s): State<AppState>, _: SuperAdmin) -> AppResult<Json<Value>> {
    Ok(Json(
        SuperAdminService::from_state(&s).get_all_users().await?,
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

pub async fn ban_user(
    State(s): State<AppState>,
    SuperAdmin(admin): SuperAdmin,
    Path(target): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        SuperAdminService::from_state(&s)
            .ban_user(target, admin.user_id)
            .await?,
    ))
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
    _: SuperAdmin,
    Path(target): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        SuperAdminService::from_state(&s)
            .delete_user(target)
            .await?,
    ))
}

pub async fn update_user_role(
    State(s): State<AppState>,
    SuperAdmin(admin): SuperAdmin,
    Path(target): Path<Uuid>,
    Json(dto): Json<UpdateUserRoleDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        SuperAdminService::from_state(&s)
            .update_user_role(target, &dto.role, admin.user_id)
            .await?,
    ))
}

pub async fn prune_activity(
    State(s): State<AppState>,
    SuperAdmin(admin): SuperAdmin,
    Path(target): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        SuperAdminService::from_state(&s)
            .prune_activity(target, admin.user_id)
            .await?,
    ))
}

pub async fn get_reports(State(s): State<AppState>, _: SuperAdmin) -> AppResult<Json<Value>> {
    Ok(Json(ReportsService::from_state(&s).list().await?))
}

pub async fn process_report(
    State(s): State<AppState>,
    SuperAdmin(admin): SuperAdmin,
    Path(id): Path<Uuid>,
    Json(dto): Json<ProcessReportDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        ReportsService::from_state(&s)
            .set_processed(id, admin.user_id, dto.processed)
            .await?,
    ))
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
