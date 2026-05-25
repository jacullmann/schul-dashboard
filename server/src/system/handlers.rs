use crate::{common::csrf::generate_csrf_token, error::AppResult, state::AppState};
use axum::{Json, extract::State};
use axum_extra::extract::CookieJar;
use serde_json::{Value, json};

pub async fn status() -> Json<Value> {
    Json(json!({
        "status": "ok",
        "timestamp": chrono::Utc::now().to_rfc3339(),
    }))
}

pub async fn csrf_init(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<(CookieJar, Json<Value>)> {
    let token = generate_csrf_token();
    let opts = state.config.base_cookie_options();
    let cookie = crate::common::csrf::csrf_cookie(&token, &opts);
    let new_jar = jar.add(cookie);
    Ok((new_jar, Json(json!({ "ok": true }))))
}
