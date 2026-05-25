use super::{dto::*, service::MfaService};
use crate::{common::extractors::AuthUser, error::AppResult, state::AppState};
use axum::{
    Json,
    extract::{ConnectInfo, State},
    http::HeaderMap,
};
use serde_json::Value;
use std::net::SocketAddr;

fn extract_ip(headers: &HeaderMap, addr: Option<SocketAddr>) -> Option<String> {
    headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .map(|s| s.trim().to_string())
        .or_else(|| addr.map(|a| a.ip().to_string()))
}

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
    Json(dto): Json<MfaCodeDto>,
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
    headers: HeaderMap,
    Json(dto): Json<MfaCodeDto>,
) -> AppResult<Json<Value>> {
    let ip = extract_ip(&headers, None);
    
    Ok(Json(
        MfaService::from_state(&s)
            .deactivate(user.user_id, &dto.code, ip.as_deref())
            .await?,
    ))
}
