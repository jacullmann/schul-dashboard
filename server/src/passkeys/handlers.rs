use super::{
    dto::*,
    service::{PasskeyName, PasskeyService},
};
use crate::{
    auth::service::ClientInfo,
    common::{
        extractors::{AuthUser, ClientIp, RecentAuth, UserAgent, ValidatedJson},
        path_params::IdPath,
    },
    error::AppResult,
    state::AppState,
};
use axum::{
    Json,
    extract::{Path, State},
};
use axum_extra::extract::CookieJar;
use serde_json::{Value, json};

pub async fn list_passkeys(
    State(state): State<AppState>,
    user: AuthUser,
) -> AppResult<Json<PasskeyList>> {
    Ok(Json(
        PasskeyService::from_state(&state)
            .list(user.user_id)
            .await?,
    ))
}

/// A new passkey is a lasting way in, so adding one needs a recent sign-in:
/// otherwise a stolen session could outlive its own revocation. Finishing only
/// redeems the registration started here.
pub async fn start_registration(
    State(state): State<AppState>,
    RecentAuth(user): RecentAuth,
) -> AppResult<Json<Value>> {
    let options = PasskeyService::from_state(&state)
        .start_registration(user.user_id)
        .await?;

    Ok(Json(json!({ "options": options })))
}

pub async fn finish_registration(
    State(state): State<AppState>,
    user: AuthUser,
    ValidatedJson(dto): ValidatedJson<FinishRegistrationDto>,
) -> AppResult<Json<PasskeySummary>> {
    let name = PasskeyName::parse(&dto.name)?;

    Ok(Json(
        PasskeyService::from_state(&state)
            .finish_registration(user.user_id, name, &dto.credential)
            .await?,
    ))
}

pub async fn rename_passkey(
    State(state): State<AppState>,
    user: AuthUser,
    Path(path): Path<IdPath>,
    ValidatedJson(dto): ValidatedJson<RenamePasskeyDto>,
) -> AppResult<Json<Value>> {
    let name = PasskeyName::parse(&dto.name)?;

    PasskeyService::from_state(&state)
        .rename(user.user_id, path.id, name)
        .await?;

    Ok(Json(json!({ "ok": true })))
}

pub async fn remove_passkey(
    State(state): State<AppState>,
    RecentAuth(user): RecentAuth,
    ClientIp(ip): ClientIp,
    Path(path): Path<IdPath>,
) -> AppResult<Json<Value>> {
    PasskeyService::from_state(&state)
        .remove(user.user_id, path.id, ip.as_deref())
        .await?;

    Ok(Json(json!({ "ok": true })))
}

pub async fn start_sign_in(State(state): State<AppState>) -> AppResult<Json<Value>> {
    let (challenge_id, options) = PasskeyService::from_state(&state).start_sign_in().await?;

    Ok(Json(
        json!({ "challengeId": challenge_id, "options": options }),
    ))
}

pub async fn finish_sign_in(
    State(state): State<AppState>,
    ClientIp(ip): ClientIp,
    UserAgent(ua): UserAgent,
    ValidatedJson(dto): ValidatedJson<SignInDto>,
) -> AppResult<(CookieJar, Json<Value>)> {
    let client = ClientInfo {
        user_agent: ua.as_deref(),
        ip: ip.as_deref(),
    };

    let jar = PasskeyService::from_state(&state)
        .finish_sign_in(dto.challenge_id, &dto.credential, client)
        .await?;

    Ok((jar, Json(json!({ "ok": true }))))
}
