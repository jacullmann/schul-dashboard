use super::{dto::*, service::MfaService};
use crate::{
    common::extractors::{AuthUser, ClientIp, ValidatedJson},
    error::AppResult,
    state::AppState,
};
use axum::{Json, extract::State};
use serde_json::Value;

pub async fn get_status(State(s): State<AppState>, user: AuthUser) -> AppResult<Json<Value>> {
    Ok(Json(
        MfaService::from_state(&s).get_status(user.user_id).await?,
    ))
}

pub async fn setup(State(s): State<AppState>, user: AuthUser) -> AppResult<Json<Value>> {
    Ok(Json(MfaService::from_state(&s).setup(user.user_id).await?))
}

pub async fn activate(
    State(s): State<AppState>,
    user: AuthUser,
    ValidatedJson(dto): ValidatedJson<MfaCodeDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        MfaService::from_state(&s)
            .activate(user.user_id, &dto.code)
            .await?,
    ))
}

pub async fn deactivate(
    State(s): State<AppState>,
    user: AuthUser,
    ClientIp(ip): ClientIp,
    ValidatedJson(dto): ValidatedJson<MfaCodeDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        MfaService::from_state(&s)
            .deactivate(user.user_id, &dto.code, ip.as_deref())
            .await?,
    ))
}
