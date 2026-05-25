use super::{dto::*, service::UserService};
use crate::{
    common::extractors::{AuthUser, TenantContext},
    error::AppResult,
    state::AppState,
};
use axum::{
    Json,
    extract::{Path, State},
    http::HeaderMap,
};
use serde_json::Value;
use uuid::Uuid;

pub async fn update_personalization(
    State(s): State<AppState>,
    user: AuthUser,
    Json(dto): Json<UpdatePersonalizationDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        UserService::from_state(&s)
            .update_personalization(user.user_id, dto.personalized)
            .await?,
    ))
}

pub async fn update_preferences(
    State(s): State<AppState>,
    user: AuthUser,
    Json(dto): Json<UpdatePreferencesDto>,
) -> AppResult<Json<Value>> {
    let prefs = serde_json::to_value(dto).unwrap_or_default();
    Ok(Json(
        UserService::from_state(&s)
            .update_preferences(user.user_id, prefs)
            .await?,
    ))
}

pub async fn update_setup(
    State(s): State<AppState>,
    user: AuthUser,
    Json(dto): Json<UpdateSetupDto>,
) -> AppResult<Json<Value>> {
    let courses = dto
        .courses
        .into_iter()
        .map(|c| (c.subject_id, c.course_id))
        .collect();
    Ok(Json(
        UserService::from_state(&s)
            .update_setup(user.user_id, &user.global_role, courses)
            .await?,
    ))
}

pub async fn get_checks(State(s): State<AppState>, user: AuthUser) -> AppResult<Json<Value>> {
    Ok(Json(
        UserService::from_state(&s).get_checks(user.user_id).await?,
    ))
}

pub async fn get_pins(State(s): State<AppState>, user: AuthUser) -> AppResult<Json<Value>> {
    Ok(Json(
        UserService::from_state(&s).get_pins(user.user_id).await?,
    ))
}

pub async fn get_visibility(State(s): State<AppState>, user: AuthUser) -> AppResult<Json<Value>> {
    Ok(Json(
        UserService::from_state(&s)
            .get_visibility(user.user_id)
            .await?,
    ))
}

pub async fn set_visibility(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(item_id): Path<Uuid>,
    Json(dto): Json<VisibilityStatusDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        UserService::from_state(&s)
            .set_visibility(tc.tenant_id, item_id, tc.user.user_id, &dto.status)
            .await?,
    ))
}

pub async fn remove_visibility(
    State(s): State<AppState>,
    user: AuthUser,
    Path(item_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        UserService::from_state(&s)
            .remove_visibility(item_id, user.user_id)
            .await?,
    ))
}

pub async fn log_page_load(
    State(s): State<AppState>,
    user: AuthUser,
    headers: HeaderMap,
) -> AppResult<Json<Value>> {
    let ua = headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown");
    Ok(Json(
        UserService::from_state(&s)
            .log_page_load(user.user_id, ua)
            .await?,
    ))
}

pub async fn check_item(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(item_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        UserService::from_state(&s)
            .check_item(tc.tenant_id, item_id, tc.user.user_id)
            .await?,
    ))
}

pub async fn uncheck_item(
    State(s): State<AppState>,
    user: AuthUser,
    Path(item_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        UserService::from_state(&s)
            .uncheck_item(item_id, user.user_id)
            .await?,
    ))
}

pub async fn pin_item(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(item_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        UserService::from_state(&s)
            .pin_item(tc.tenant_id, item_id, tc.user.user_id)
            .await?,
    ))
}

pub async fn unpin_item(
    State(s): State<AppState>,
    user: AuthUser,
    Path(item_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        UserService::from_state(&s)
            .unpin_item(item_id, user.user_id)
            .await?,
    ))
}
