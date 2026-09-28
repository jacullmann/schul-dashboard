use super::{
    dto::{SubscribeDto, UnsubscribeDto},
    service::PushService,
    subscription::PushSubscription,
};
use crate::{
    auth::token::TokenService,
    common::extractors::AuthUser,
    config::REFRESH_COOKIE,
    error::{AppError, AppResult},
    state::AppState,
};
use axum::{Json, extract::State};
use axum_extra::extract::CookieJar;
use serde_json::{Value, json};

pub async fn get_public_key(State(s): State<AppState>) -> AppResult<Json<Value>> {
    let service = PushService::from_state(&s);
    let public_key = service
        .public_key()
        .ok_or_else(|| AppError::not_found("Push notifications are not configured."))?;

    Ok(Json(json!({ "publicKey": public_key })))
}

pub async fn subscribe(
    State(s): State<AppState>,
    user: AuthUser,
    jar: CookieJar,
    Json(dto): Json<SubscribeDto>,
) -> AppResult<Json<Value>> {
    let subscription = PushSubscription::parse(&dto.endpoint, &dto.keys.p256dh, &dto.keys.auth)
        .map_err(|e| AppError::bad_request(format!("Invalid push subscription: {e}.")))?;

    // Binding the device to this login session means ending the session also
    // ends its notifications, e.g. on a shared computer.
    let refresh_token = jar
        .get(REFRESH_COOKIE)
        .map(|c| c.value())
        .filter(|token| !token.is_empty())
        .ok_or(AppError::AuthRequired)?;
    let session_family_id = TokenService::from_state(&s)
        .active_family_for_user(refresh_token, user.user_id)
        .await?
        .ok_or(AppError::AuthRequired)?;

    PushService::from_state(&s)
        .upsert_subscription(user.user_id, session_family_id, &subscription)
        .await?;

    Ok(Json(json!({ "ok": true })))
}

pub async fn unsubscribe(
    State(s): State<AppState>,
    user: AuthUser,
    Json(dto): Json<UnsubscribeDto>,
) -> AppResult<Json<Value>> {
    PushService::from_state(&s)
        .remove_subscription(user.user_id, &dto.endpoint)
        .await?;

    Ok(Json(json!({ "ok": true })))
}
