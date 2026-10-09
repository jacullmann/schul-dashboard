use super::{
    dto::{AccessStatusDto, AdminAccessControlsDto, UpdateAccessControlsDto},
    service::{self, AccessControlService},
};
use crate::{common::extractors::SuperAdmin, error::AppResult, state::AppState};
use axum::{Json, extract::State};

pub async fn get_access_status(State(s): State<AppState>) -> AppResult<Json<AccessStatusDto>> {
    Ok(Json(service::load(&s.db).await?.into()))
}

pub async fn get_access_controls(
    State(s): State<AppState>,
    _: SuperAdmin,
) -> AppResult<Json<AdminAccessControlsDto>> {
    Ok(Json(
        AccessControlService::from_state(&s).get_for_admin().await?,
    ))
}

pub async fn update_access_controls(
    State(s): State<AppState>,
    SuperAdmin(admin): SuperAdmin,
    Json(changes): Json<UpdateAccessControlsDto>,
) -> AppResult<Json<AdminAccessControlsDto>> {
    Ok(Json(
        AccessControlService::from_state(&s)
            .update(&changes, admin.user_id)
            .await?,
    ))
}
