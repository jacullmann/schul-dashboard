use super::{
    dto::*,
    service::{OAUTH_PENDING_COOKIE, OAuthService},
};
use crate::{
    common::extractors::AuthUser,
    error::{AppError, AppResult},
    state::AppState,
};
use axum::{
    Json,
    extract::{Query, State},
    response::Redirect,
};
use axum_extra::extract::CookieJar;
use serde::Deserialize;
use serde_json::Value;

#[derive(Deserialize)]
pub struct OAuthCallbackQuery {
    pub code: Option<String>,
    pub state: Option<String>,
    pub error: Option<String>,
}

pub async fn initiate_google_oauth(State(s): State<AppState>) -> AppResult<(CookieJar, Redirect)> {
    let (url, jar) = OAuthService::from_state(&s).build_google_auth_url()?;
    Ok((jar, Redirect::temporary(&url)))
}

pub async fn handle_google_callback(
    State(s): State<AppState>,
    jar: CookieJar,
    Query(q): Query<OAuthCallbackQuery>,
) -> (CookieJar, Redirect) {
    let state_cookie = jar.get("oauth_state_token").map(|c| c.value().to_string());

    let (new_jar, url) = OAuthService::from_state(&s)
        .handle_callback(
            q.code.as_deref(),
            q.state.as_deref(),
            q.error.as_deref(),
            state_cookie.as_deref(),
        )
        .await;

    (new_jar, Redirect::temporary(&url))
}

pub async fn link_google_account(
    State(s): State<AppState>,
    jar: CookieJar,
    Json(dto): Json<LinkGoogleAccountDto>,
) -> AppResult<(CookieJar, Json<Value>)> {
    let pending_token = jar
        .get(OAUTH_PENDING_COOKIE)
        .map(|c| c.value().to_string())
        .ok_or_else(|| AppError::Unauthorized("Authentication failed.".into()))?;

    let mut v = jsonwebtoken::Validation::default();

    v.algorithms = vec![jsonwebtoken::Algorithm::HS256];

    let data = jsonwebtoken::decode::<super::service::OAuthPendingClaims>(
        &pending_token,
        &jsonwebtoken::DecodingKey::from_secret(s.config.oauth_pending_jwt_secret.as_bytes()),
        &v,
    )
    .map_err(|_| AppError::Unauthorized("Authentication failed.".into()))?;

    let (new_jar, body) = OAuthService::from_state(&s)
        .link_google_account(
            &data.claims.google_id,
            &data.claims.google_email,
            &dto.password,
        )
        .await?;

    Ok((new_jar, Json(body)))
}

pub async fn unlink_google_account(
    State(s): State<AppState>,
    user: AuthUser,
) -> AppResult<Json<Value>> {
    Ok(Json(
        OAuthService::from_state(&s)
            .unlink_google_account(user.user_id)
            .await?,
    ))
}

pub async fn get_linked_providers(
    State(s): State<AppState>,
    user: AuthUser,
) -> AppResult<Json<Value>> {
    Ok(Json(
        OAuthService::from_state(&s)
            .get_linked_providers(user.user_id)
            .await?,
    ))
}
