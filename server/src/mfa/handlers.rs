use super::{dto::*, service::MfaService};
use crate::{
    common::extractors::{AuthUser, ClientIp, RecentAuth, ValidatedJson},
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

/// Shows a new secret, so it needs a recent sign-in: otherwise a stolen
/// session could tie the account to the thief's authenticator.
pub async fn setup(
    State(s): State<AppState>,
    RecentAuth(user): RecentAuth,
) -> AppResult<Json<Value>> {
    Ok(Json(MfaService::from_state(&s).setup(user.user_id).await?))
}

/// Only a secret from a recent `setup` can be activated, which already
/// required a recent sign-in.
pub async fn activate(
    State(s): State<AppState>,
    user: AuthUser,
    ValidatedJson(dto): ValidatedJson<MfaCodeDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        MfaService::from_state(&s)
            .activate(user.user_id, user.session_id, &dto.code)
            .await?,
    ))
}

pub async fn deactivate(
    State(s): State<AppState>,
    RecentAuth(user): RecentAuth,
    ClientIp(ip): ClientIp,
) -> AppResult<Json<Value>> {
    Ok(Json(
        MfaService::from_state(&s)
            .deactivate(user.user_id, user.session_id, ip.as_deref())
            .await?,
    ))
}

pub async fn regenerate_recovery_codes(
    State(s): State<AppState>,
    RecentAuth(user): RecentAuth,
) -> AppResult<Json<Value>> {
    Ok(Json(
        MfaService::from_state(&s)
            .regenerate_recovery_codes(user.user_id)
            .await?,
    ))
}
