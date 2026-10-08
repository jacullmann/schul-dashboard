use super::{
    dto::{GoogleReauthStart, PasskeyReauthDto, PasswordReauthDto, ReauthStatus},
    service::ReauthService,
};
use crate::{
    common::extractors::{AuthUser, ValidatedJson},
    config::REAUTH_PENDING_COOKIE,
    error::AppResult,
    mfa::second_factor::SecondFactorProof,
    state::AppState,
};
use axum::{Json, extract::State};
use axum_extra::extract::CookieJar;
use serde_json::{Value, json};

pub async fn status(
    State(state): State<AppState>,
    user: AuthUser,
) -> AppResult<Json<ReauthStatus>> {
    Ok(Json(ReauthService::from_state(&state).status(&user).await?))
}

pub async fn confirm_with_password(
    State(state): State<AppState>,
    user: AuthUser,
    ValidatedJson(dto): ValidatedJson<PasswordReauthDto>,
) -> AppResult<(CookieJar, Json<Value>)> {
    let jar = ReauthService::from_state(&state)
        .with_password(&user, dto.password, dto.second_factor.as_ref())
        .await?;

    Ok((jar, Json(json!({ "ok": true }))))
}

pub async fn start_passkey(
    State(state): State<AppState>,
    user: AuthUser,
) -> AppResult<Json<Value>> {
    let (challenge_id, options) = ReauthService::from_state(&state)
        .start_passkey(&user)
        .await?;

    Ok(Json(
        json!({ "challengeId": challenge_id, "options": options }),
    ))
}

pub async fn confirm_with_passkey(
    State(state): State<AppState>,
    user: AuthUser,
    Json(dto): Json<PasskeyReauthDto>,
) -> AppResult<(CookieJar, Json<Value>)> {
    let jar = ReauthService::from_state(&state)
        .finish_passkey(&user, dto.challenge_id, &dto.credential)
        .await?;

    Ok((jar, Json(json!({ "ok": true }))))
}

/// A POST rather than a navigation, like linking Google: it needs the CSRF
/// check and lets the client refresh an expired access token first.
pub async fn start_google(
    State(state): State<AppState>,
    user: AuthUser,
) -> AppResult<(CookieJar, Json<GoogleReauthStart>)> {
    let (url, jar) = ReauthService::from_state(&state)
        .start_google(&user)
        .await?;

    Ok((jar, Json(GoogleReauthStart { url })))
}

pub async fn confirm_google_second_factor(
    State(state): State<AppState>,
    user: AuthUser,
    jar: CookieJar,
    ValidatedJson(proof): ValidatedJson<SecondFactorProof>,
) -> AppResult<(CookieJar, Json<Value>)> {
    let pending = jar.get(REAUTH_PENDING_COOKIE).map(|c| c.value());
    let jar = ReauthService::from_state(&state)
        .finish_google(&user, pending, &proof)
        .await?;

    Ok((jar, Json(json!({ "ok": true }))))
}
