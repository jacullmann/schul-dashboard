use super::{
    dto::*,
    service::{OAUTH_PENDING_COOKIE, OAuthIntent, OAuthService},
};
use crate::{
    auth::service::{ClientInfo, LoginResult},
    common::extractors::{AuthUser, ClientIp, RecentAuth, UserAgent, ValidatedJson},
    config::REFRESH_COOKIE,
    error::AppResult,
    state::AppState,
};
use axum::{
    Json,
    extract::{Query, State},
    response::Redirect,
};
use axum_extra::extract::{CookieJar, cookie::Cookie};
use serde::Deserialize;
use serde_json::{Value, json};

#[derive(Deserialize)]
pub struct OAuthCallbackQuery {
    pub code: Option<String>,
    pub state: Option<String>,
    pub error: Option<String>,
}

pub async fn initiate_google_oauth(State(s): State<AppState>) -> AppResult<(CookieJar, Redirect)> {
    redirect_to_google(&s, OAuthIntent::Login)
}

fn redirect_to_google(s: &AppState, intent: OAuthIntent) -> AppResult<(CookieJar, Redirect)> {
    let (url, jar) = OAuthService::from_state(s).build_google_auth_url(intent)?;
    Ok((jar, Redirect::temporary(&url)))
}

/// A POST rather than a navigation: it needs the CSRF check and lets the
/// client refresh an expired access token before the flow starts. A linked
/// Google account is a lasting way in, so it needs a recent sign-in.
pub async fn start_google_link(
    State(s): State<AppState>,
    RecentAuth(user): RecentAuth,
) -> AppResult<(CookieJar, Json<GoogleAuthUrlResponse>)> {
    let (url, jar) = OAuthService::from_state(&s).build_google_auth_url(OAuthIntent::Link {
        user_id: user.user_id,
    })?;
    Ok((jar, Json(GoogleAuthUrlResponse { url })))
}

pub async fn handle_google_callback(
    State(s): State<AppState>,
    ClientIp(ip): ClientIp,
    UserAgent(ua): UserAgent,
    jar: CookieJar,
    Query(q): Query<OAuthCallbackQuery>,
) -> (CookieJar, Redirect) {
    let state_cookie = jar.get("oauth_state_token").map(|c| c.value());
    let refresh_token = jar.get(REFRESH_COOKIE).map(|c| c.value());

    let (new_jar, url) = OAuthService::from_state(&s)
        .handle_callback(
            q.code.as_deref(),
            q.state.as_deref(),
            q.error.as_deref(),
            state_cookie,
            refresh_token,
            ClientInfo {
                user_agent: ua.as_deref(),
                ip: ip.as_deref(),
            },
        )
        .await;

    (new_jar, Redirect::temporary(&url))
}

/// Finishes a Google sign-up the callback could not complete on its own: the
/// user has to accept the terms before an account is created.
pub async fn sign_up_with_google(
    State(s): State<AppState>,
    ClientIp(ip): ClientIp,
    UserAgent(ua): UserAgent,
    jar: CookieJar,
    ValidatedJson(_accepted): ValidatedJson<GoogleSignUpDto>,
) -> AppResult<(CookieJar, Json<Value>)> {
    let svc = OAuthService::from_state(&s);
    let pending = svc.verify_pending_cookie(pending_cookie(&jar))?;

    let result = svc
        .sign_up_with_google(
            &pending,
            ClientInfo {
                user_agent: ua.as_deref(),
                ip: ip.as_deref(),
            },
        )
        .await?;

    Ok(sign_in_response(result, svc.clear_pending_cookie()))
}

fn pending_cookie(jar: &CookieJar) -> Option<&str> {
    jar.get(OAUTH_PENDING_COOKIE).map(|c| c.value())
}

fn sign_in_response(
    result: LoginResult,
    clear_pending: Cookie<'static>,
) -> (CookieJar, Json<Value>) {
    match result {
        LoginResult::Success(jar) => (jar.add(clear_pending), Json(json!({ "ok": true }))),
        LoginResult::MfaRequired(jar) => (
            jar.add(clear_pending),
            Json(json!({ "ok": true, "requiresMfa": true })),
        ),
    }
}

pub async fn unlink_google_account(
    State(s): State<AppState>,
    RecentAuth(user): RecentAuth,
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
