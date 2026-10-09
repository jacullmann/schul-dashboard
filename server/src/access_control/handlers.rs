use super::{
    dto::{AccessStatusDto, UpdateAccessControlsDto},
    service::{self, AccessControlService, AccessControls},
};
use crate::{
    common::{client::ClientInfo, extractors::SuperAdmin},
    error::AppResult,
    state::AppState,
};
use axum::{Json, extract::State};

pub async fn get_access_status(State(s): State<AppState>) -> AppResult<Json<AccessStatusDto>> {
    Ok(Json(service::load(&s.db).await?.into()))
}

pub async fn get_access_controls(
    State(s): State<AppState>,
    _: SuperAdmin,
) -> AppResult<Json<AccessControls>> {
    Ok(Json(service::load(&s.db).await?))
}

pub async fn update_access_controls(
    State(s): State<AppState>,
    SuperAdmin(admin): SuperAdmin,
    client: ClientInfo,
    Json(changes): Json<UpdateAccessControlsDto>,
) -> AppResult<Json<AccessControls>> {
    Ok(Json(
        AccessControlService::from_state(&s)
            .update(&changes, admin.user_id, &client)
            .await?,
    ))
}
