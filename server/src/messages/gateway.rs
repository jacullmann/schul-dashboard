use crate::{
    common::{
        extractors::{AuthUser, TenantContext},
        jwt::now_secs,
        name_generator::generate_user_name,
    },
    config::ACCESS_COOKIE,
    error::AppError,
    state::AppState,
};
use axum::extract::ws::{CloseFrame, Message, WebSocket, WebSocketUpgrade};
use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use axum_extra::extract::CookieJar;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{collections::HashMap, sync::Arc, time::Duration};
use tokio::sync::broadcast;
use uuid::Uuid;
/// A socket lives no longer than the access token that opened it; the client
/// refreshes its session and reconnects.
const CLOSE_TOKEN_EXPIRED: u16 = 4001;
/// The caller lost access to the group the socket is subscribed to.
const CLOSE_ACCESS_REVOKED: u16 = 4003;
/// Membership changes announce themselves on the bus, so this only bounds
/// revocations that do not (e.g. a withdrawn superadmin role). Checking on
/// every broadcast instead would cost a query per recipient per message.
const ACCESS_RECHECK_INTERVAL: Duration = Duration::from_secs(30);

#[derive(Clone, Default)]
pub struct MessageBus {
    inner: Arc<tokio::sync::Mutex<HashMap<Uuid, broadcast::Sender<BusEvent>>>>,
}
#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum BusEvent {
    NewMessage {
        message: Value,
    },
    #[serde(rename_all = "camelCase")]
    MessageDeleted {
        message_id: Uuid,
    },
    #[serde(rename_all = "camelCase")]
    UserTyping {
        user_id: Uuid,
        sender_name: String,
        is_typing: bool,
    },
    /// Server-internal: subscribers recheck their access, clients never see it.
    #[serde(skip)]
    MembershipChanged,
}
impl MessageBus {
    pub async fn sender_for(&self, tenant_id: Uuid) -> broadcast::Sender<BusEvent> {
        let mut map = self.inner.lock().await;
        map.entry(tenant_id)
            .or_insert_with(|| broadcast::channel(128).0)
            .clone()
    }
    pub async fn broadcast(&self, tenant_id: Uuid, event: BusEvent) {
        let tx = self.sender_for(tenant_id).await;
        let _ = tx.send(event);
    }

    /// Lets open sockets of the group drop a subscription the moment its
    /// member loses access, instead of at the next periodic recheck.
    pub async fn membership_changed(&self, tenant_id: Uuid) {
        self.broadcast(tenant_id, BusEvent::MembershipChanged).await;
    }
}
#[derive(Deserialize)]
#[serde(tag = "type")]
enum ClientEvent {
    #[serde(rename = "joinGroup")]
    JoinGroup {
        #[serde(rename = "groupId")]
        group_id: Uuid,
    },
    #[serde(rename = "typing")]
    Typing {
        #[serde(rename = "groupId")]
        group_id: Uuid,
    },
    #[serde(rename = "stopTyping")]
    StopTyping {
        #[serde(rename = "groupId")]
        group_id: Uuid,
    },
}
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    jar: CookieJar,
    headers: axum::http::HeaderMap,
) -> Response {
    // Cross-site WebSocket hijacking guard: browsers always send Origin on the
    // upgrade handshake. The SameSite=Lax access cookie already blocks the
    // cross-site case, but rejecting a mismatched Origin closes the gap for
    // browsers that relax SameSite. A missing Origin (non-browser client) falls
    // through to the cookie/JWT check below.
    if let Some(origin) = headers
        .get(axum::http::header::ORIGIN)
        .and_then(|v| v.to_str().ok())
        && origin != state.config.cors_origin
    {
        return StatusCode::FORBIDDEN.into_response();
    }

    let Some(claims) = jar
        .get(ACCESS_COOKIE)
        .and_then(|c| state.jwt.verify_access(c.value()).ok())
    else {
        return StatusCode::UNAUTHORIZED.into_response();
    };
    let Ok(user_id) = claims.sub.parse::<Uuid>() else {
        return StatusCode::UNAUTHORIZED.into_response();
    };

    let user = AuthUser {
        user_id,
        email: claims.email,
    };
    let token_ttl = Duration::from_secs(claims.exp.saturating_sub(now_secs()));

    ws.on_upgrade(move |socket| handle_socket(socket, state, user, token_ttl))
}

async fn close(socket: &mut WebSocket, code: u16, reason: &'static str) {
    let frame = CloseFrame {
        code,
        reason: reason.into(),
    };
    let _ = socket.send(Message::Close(Some(frame))).await;
}

/// Only a definite "no access" counts; a failing database keeps the
/// subscription rather than disconnecting every member.
async fn group_access_revoked(state: &AppState, user: &AuthUser, group_id: Uuid) -> bool {
    match TenantContext::resolve(&state.db, user.clone(), group_id).await {
        Ok(_) => false,
        Err(AppError::NotFound(_)) => true,
        Err(e) => {
            tracing::warn!("WebSocket access recheck failed: {e:?}");
            false
        }
    }
}

async fn handle_socket(
    mut socket: WebSocket,
    state: AppState,
    user: AuthUser,
    token_ttl: Duration,
) {
    let user_id = user.user_id;
    let token_expiry = tokio::time::sleep(token_ttl);
    tokio::pin!(token_expiry);
    let mut access_recheck = tokio::time::interval_at(
        tokio::time::Instant::now() + ACCESS_RECHECK_INTERVAL,
        ACCESS_RECHECK_INTERVAL,
    );
    let mut rx: Option<broadcast::Receiver<BusEvent>> = None;
    let mut joined_group: Option<Uuid> = None;
    let mut sender_name: Option<String> = None;
    loop {
        tokio::select! {
            () = &mut token_expiry => {
                close(&mut socket, CLOSE_TOKEN_EXPIRED, "Token expired").await;
                break;
            }
            _ = access_recheck.tick(), if joined_group.is_some() => {
                if let Some(group_id) = joined_group
                    && group_access_revoked(&state, &user, group_id).await
                {
                    close(&mut socket, CLOSE_ACCESS_REVOKED, "Group access revoked").await;
                    break;
                }
            }
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        if let Ok(event) = serde_json::from_str::<ClientEvent>(&text) {
                            match event {
                                ClientEvent::JoinGroup { group_id } => {
                                    // Same membership rule as every HTTP route under
                                    // /groups/{group_id}.
                                    let has_access =
                                        TenantContext::resolve(&state.db, user.clone(), group_id)
                                            .await
                                            .is_ok();
                                    if has_access {
                                        let tx = state.message_bus.sender_for(group_id).await;
                                        rx = Some(tx.subscribe());
                                        joined_group = Some(group_id);
                                        sender_name = Some(generate_user_name(
                                            &user_id.to_string(),
                                        ));
                                    }
                                }
                                ClientEvent::Typing { group_id } => {
                                    if joined_group == Some(group_id) && let Some(ref name) = sender_name {
                                        state.message_bus.broadcast(group_id, BusEvent::UserTyping {
                                            user_id,
                                            sender_name: name.clone(),
                                            is_typing: true,
                                        }).await;
                                    }
                                }
                                ClientEvent::StopTyping { group_id } => {
                                    if joined_group == Some(group_id) && let Some(ref name) = sender_name {
                                        state.message_bus.broadcast(group_id, BusEvent::UserTyping {
                                            user_id,
                                            sender_name: name.clone(),
                                            is_typing: false,
                                        }).await;
                                    }
                                }
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => break,
                    _ => {}
                }
            }
            event = async {
                match rx.as_mut() {
                    Some(r) => r.recv().await,
                    None => std::future::pending().await,
                }
            }, if rx.is_some() => {
                match event {
                    Ok(BusEvent::MembershipChanged) => {
                        if let Some(group_id) = joined_group
                            && group_access_revoked(&state, &user, group_id).await
                        {
                            close(&mut socket, CLOSE_ACCESS_REVOKED, "Group access revoked").await;
                            break;
                        }
                    }
                    Ok(ev) => {
                        if let Ok(json) = serde_json::to_string(&ev) && socket.send(Message::Text(json.into())).await.is_err() {
                            break;
                        }
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {
                        // Skip lagged messages to avoid breaking connection
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                        break;
                    }
                }
            }
        }
    }
}
