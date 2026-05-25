use crate::{
    auth::{
        cookies::*,
        dto::*,
        service::{AuthService, LoginResult},
        token::{TokenService, *},
    },
    common::extractors::{AuthUser, MfaPending, OptionalAuth},
    error::{AppError, AppResult},
    state::AppState,
};
use axum::{
    Json,
    extract::{Query, State},
    http::HeaderMap,
};
use axum_extra::extract::CookieJar;
use serde::Deserialize;
use serde_json::{Value, json};
use validator::Validate;

fn extract_ip(headers: &HeaderMap) -> Option<String> {
    headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .map(|s| s.trim().to_string())
}

fn extract_ua(headers: &HeaderMap) -> Option<String> {
    headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(String::from)
}

pub async fn login(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(dto): Json<LoginDto>,
) -> AppResult<(CookieJar, Json<Value>)> {
    dto.validate()
        .map_err(|e| AppError::Validation(e.field_errors().keys().map(|k| k.to_string()).collect()))?;

    let ip = extract_ip(&headers);
    let ua = extract_ua(&headers);
    let svc = AuthService::from_state(&state);

    match svc.login(dto, ua.as_deref(), ip.as_deref()).await? {
        LoginResult::Success(jar) => Ok((jar, Json(json!({ "ok": true })))),
        LoginResult::MfaRequired(jar) => {
            Ok((jar, Json(json!({ "ok": true, "requiresMfa": true }))))
        }
    }
}

pub async fn verify_mfa(
    State(state): State<AppState>,
    pending: MfaPending,
    headers: HeaderMap,
    Json(dto): Json<VerifyMfaDto>,
) -> AppResult<(CookieJar, Json<Value>)> {
    dto.validate()
        .map_err(|e| AppError::Validation(e.field_errors().keys().map(|k| k.to_string()).collect()))?;

    let ip = extract_ip(&headers);
    let ua = extract_ua(&headers);
    let svc = AuthService::from_state(&state);

    let jar = svc
        .verify_mfa(&dto.code, pending.user_id, &pending.email, ua.as_deref(), ip.as_deref())
        .await?;

    Ok((jar, Json(json!({ "ok": true }))))
}

pub async fn cancel_mfa(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<(CookieJar, Json<Value>)> {
    let opts = state.config.base_cookie_options();
    let jar = jar.add(clear_mfa_pending_cookie(&opts));
    Ok((jar, Json(json!({ "ok": true }))))
}

pub async fn register(
    State(state): State<AppState>,
    Json(dto): Json<RegisterDto>,
) -> AppResult<Json<Value>> {
    dto.validate()
        .map_err(|e| AppError::Validation(e.field_errors().keys().map(|k| k.to_string()).collect()))?;

    let svc = AuthService::from_state(&state);
    Ok(Json(svc.register(dto).await?))
}

pub async fn get_me(
    State(state): State<AppState>,
    opt: OptionalAuth,
) -> AppResult<Json<Value>> {
    match opt.0 {
        None => Ok(Json(json!({ "authenticated": false }))),
        Some(user) => {
            let svc = AuthService::from_state(&state);
            Ok(Json(svc.get_me(user.user_id, user.active_group_id).await?))
        }
    }
}

pub async fn delete_me(
    State(state): State<AppState>,
    user: AuthUser,
) -> AppResult<(CookieJar, Json<Value>)> {
    let svc = AuthService::from_state(&state);
    let jar = svc.delete_me(user.user_id).await?;
    Ok((jar, Json(json!({ "ok": true }))))
}

#[derive(Deserialize)]
pub struct VerifyQuery {
    pub token: String,
}

pub async fn verify_email(
    State(state): State<AppState>,
    Query(q): Query<VerifyQuery>,
) -> AppResult<Json<Value>> {
    let svc = AuthService::from_state(&state);
    Ok(Json(svc.verify_email(&q.token).await?))
}

pub async fn forgot_password(
    State(state): State<AppState>,
    Json(dto): Json<ForgotPasswordDto>,
) -> AppResult<Json<Value>> {
    dto.validate()
        .map_err(|e| AppError::Validation(e.field_errors().keys().map(|k| k.to_string()).collect()))?;
    let svc = AuthService::from_state(&state);
    Ok(Json(svc.forgot_password(&dto.email).await?))
}

pub async fn verify_reset_token(
    State(state): State<AppState>,
    Json(dto): Json<ResetPasswordVerifyDto>,
) -> AppResult<Json<Value>> {
    dto.validate()
        .map_err(|e| AppError::Validation(e.field_errors().keys().map(|k| k.to_string()).collect()))?;
    let svc = AuthService::from_state(&state);
    Ok(Json(svc.verify_reset_token(&dto.email, &dto.code).await?))
}

pub async fn reset_password(
    State(state): State<AppState>,
    Json(dto): Json<ResetPasswordDto>,
) -> AppResult<Json<Value>> {
    let svc = AuthService::from_state(&state);
    Ok(Json(svc.reset_password(&dto.reset_token, &dto.password).await?))
}

pub async fn change_password(
    State(state): State<AppState>,
    user: AuthUser,
    headers: HeaderMap,
    Json(dto): Json<ChangePasswordDto>,
) -> AppResult<(CookieJar, Json<Value>)> {
    dto.validate()
        .map_err(|e| AppError::Validation(e.field_errors().keys().map(|k| k.to_string()).collect()))?;

    let ip = extract_ip(&headers);
    let ua = extract_ua(&headers);
    let svc = AuthService::from_state(&state);

    let (jar, body) = svc
        .change_password(user.user_id, dto.current_password, dto.new_password, ua.as_deref(), ip.as_deref())
        .await?;

    Ok((jar, Json(body)))
}

pub async fn get_groups(
    State(state): State<AppState>,
    user: AuthUser,
) -> AppResult<Json<Value>> {
    let svc = AuthService::from_state(&state);
    Ok(Json(svc.get_groups(user.user_id).await?))
}

pub async fn refresh(
    State(state): State<AppState>,
    jar: CookieJar,
    headers: HeaderMap,
) -> AppResult<(CookieJar, Json<Value>)> {
    use crate::config::REFRESH_COOKIE;

    let presented = jar
        .get(REFRESH_COOKIE)
        .map(|c| c.value().to_string())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| {
            AppError::Unauthorized("No refresh token.".into())
        })?;

    let ip = extract_ip(&headers);
    let ua = extract_ua(&headers);
    let svc = TokenService::from_state(&state);

    let issued = svc
        .rotate(&presented, ua.as_deref(), ip.as_deref())
        .await?
        .ok_or_else(|| AppError::Unauthorized("Refresh token invalid.".into()))?;

    let opts = state.config.base_cookie_options();
    let new_jar = jar
        .add(access_cookie(issued.access_token, &opts))
        .add(refresh_cookie(issued.refresh_token, &opts));

    Ok((new_jar, Json(json!({ "ok": true }))))
}

pub async fn logout(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<(CookieJar, Json<Value>)> {
    use crate::config::REFRESH_COOKIE;

    if let Some(token) = jar.get(REFRESH_COOKIE).map(|c| c.value().to_string()) {
        if !token.is_empty() {
            let svc = TokenService::from_state(&state);
            let _ = svc.revoke_by_token(&token, LOGOUT).await;
        }
    }

    let opts = state.config.base_cookie_options();
    let new_jar = jar
        .add(clear_access_cookie(&opts))
        .add(clear_refresh_cookie(&opts));

    Ok((new_jar, Json(json!({ "ok": true }))))
}

pub async fn logout_all(
    State(state): State<AppState>,
    user: AuthUser,
    jar: CookieJar,
) -> AppResult<(CookieJar, Json<Value>)> {
    let svc = TokenService::from_state(&state);
    svc.revoke_all_for_user(user.user_id, LOGOUT_ALL, None).await?;

    let opts = state.config.base_cookie_options();
    let new_jar = jar
        .add(clear_access_cookie(&opts))
        .add(clear_refresh_cookie(&opts));

    Ok((new_jar, Json(json!({ "ok": true }))))
}

pub async fn list_sessions(
    State(state): State<AppState>,
    user: AuthUser,
) -> AppResult<Json<Value>> {
    let svc = TokenService::from_state(&state);
    let sessions = svc.list_active_sessions(user.user_id).await?;
    Ok(Json(json!({ "sessions": sessions })))
}

pub async fn revoke_session(
    State(state): State<AppState>,
    user: AuthUser,
    axum::extract::Path(family_id): axum::extract::Path<uuid::Uuid>,
) -> AppResult<Json<Value>> {
    let svc = TokenService::from_state(&state);
    let sessions = svc.list_active_sessions(user.user_id).await?;

    if !sessions.iter().any(|s| s.family_id == family_id) {
        return Err(AppError::Unauthorized("Session not found.".into()));
    }

    svc.revoke_family(family_id, ADMIN_REVOKE).await?;
    Ok(Json(json!({ "ok": true })))
}