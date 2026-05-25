use super::service::ScheduleService;
use crate::{
    common::extractors::{AuthUser, OptionalAuth, TenantContext},
    error::AppResult,
    state::AppState,
};
use axum::{
    Json,
    extract::{Path, State},
};
use serde_json::{Value, json};
use uuid::Uuid;

pub async fn get_schedule(
    State(s): State<AppState>,
    tc: TenantContext,
    opt: OptionalAuth,
) -> AppResult<Json<Value>> {
    Ok(Json(
        ScheduleService::from_state(&s)
            .get_schedule(tc.tenant_id, opt.0.map(|u| u.user_id))
            .await?,
    ))
}
pub async fn get_subs(State(s): State<AppState>, tc: TenantContext) -> AppResult<Json<Value>> {
    Ok(Json(
        ScheduleService::from_state(&s)
            .get_subs(tc.tenant_id)
            .await?,
    ))
}
pub async fn get_subjects(State(s): State<AppState>, tc: TenantContext) -> AppResult<Json<Value>> {
    Ok(Json(
        ScheduleService::from_state(&s)
            .get_subjects(tc.tenant_id)
            .await?,
    ))
}
pub async fn get_announcements(
    State(s): State<AppState>,
    tc: TenantContext,
) -> AppResult<Json<Value>> {
    Ok(Json(
        ScheduleService::from_state(&s)
            .get_announcements(tc.tenant_id)
            .await?,
    ))
}
pub async fn get_announcement_read_status(
    State(s): State<AppState>,
    tc: TenantContext,
) -> AppResult<Json<Value>> {
    let ids = ScheduleService::from_state(&s)
        .get_announcement_read_status(tc.user.user_id, tc.tenant_id)
        .await?;
    Ok(Json(json!(ids)))
}
pub async fn mark_announcement_read(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    ScheduleService::from_state(&s)
        .mark_announcement_read(tc.user.user_id, id)
        .await?;
    Ok(Json(json!({ "ok": true })))
}
