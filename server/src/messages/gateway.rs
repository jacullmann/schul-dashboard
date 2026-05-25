use crate::{common::jwt::JwtService, config::ACCESS_COOKIE, state::AppState};
use axum::{
    extract::{
        State, WebSocketUpgrade,
        ws::{Message, WebSocket},
    },
    response::Response,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{collections::HashMap, sync::Arc};
use tokio::sync::broadcast;
use uuid::Uuid;

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
    MessageDeleted {
        message_id: Uuid,
    },
    UserTyping {
        user_id: Uuid,
        sender_name: String,
        is_typing: bool,
    },
}

impl MessageBus {
    pub async fn sender_for(&self, tenant_id: Uuid) -> broadcast::Sender<BusEvent> {
        let mut map = self.inner.lock().await;
        map.entry(tenant_id)
            .or_insert_with(|| broadcast::channel(128).0)
            .clone()
    }

    pub async fn broadcast(&self, tenant_id: Uuid, event: BusEvent) {
        if let Some(tx) = self.inner.lock().await.get(&tenant_id) {
            let _ = tx.send(event);
        }
    }
}

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum ClientEvent {
    JoinGroup { group_id: Uuid },
    Typing { group_id: Uuid },
    StopTyping { group_id: Uuid },
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
) -> Response {
    let token = headers
        .get("cookie")
        .and_then(|v| v.to_str().ok())
        .and_then(|cookies| {
            cookies.split(';').find_map(|c| {
                let c = c.trim();

                c.strip_prefix(&format!("{}=", ACCESS_COOKIE))
                    .map(|v| v.to_string())
            })
        });

    ws.on_upgrade(move |socket| handle_socket(socket, state, token))
}

async fn handle_socket(mut socket: WebSocket, state: AppState, token: Option<String>) {
    let claims = match token
        .as_deref()
        .and_then(|t| state.jwt.verify_access(t).ok())
    {
        Some(c) => c,
        None => {
            let _ = socket.send(Message::Close(None)).await;
            return;
        }
    };

    let user_id: Uuid = match claims.sub.parse() {
        Ok(id) => id,
        Err(_) => return,
    };

    let active_group_id: Option<Uuid> = claims.g_id.as_deref().and_then(|s| s.parse().ok());

    let mut rx: Option<broadcast::Receiver<BusEvent>> = None;

    let mut joined_group: Option<Uuid> = None;

    loop {
        tokio::select! {
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        if let Ok(event) = serde_json::from_str::<ClientEvent>(&text) {
                            match event {
                                ClientEvent::JoinGroup { group_id } => {
                                    if active_group_id == Some(group_id) {
                                        let tx = state.message_bus.sender_for(group_id).await;

                                        rx = Some(tx.subscribe());

                                        joined_group = Some(group_id);
                                    }
                                }
                                ClientEvent::Typing { group_id } => {
                                    if joined_group == Some(group_id) {
                                        state.message_bus.broadcast(group_id, BusEvent::UserTyping {
                                            user_id,
                                            sender_name: format!("User-{}", user_id.as_u128() % 99999),
                                            is_typing: true,
                                        }).await;
                                    }
                                }
                                ClientEvent::StopTyping { group_id } => {
                                    if joined_group == Some(group_id) {
                                        state.message_bus.broadcast(group_id, BusEvent::UserTyping {
                                            user_id,
                                            sender_name: format!("User-{}", user_id.as_u128() % 99999),
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
                if let Some(ref mut r) = rx { r.recv().await.ok() } else { None }
            }, if rx.is_some() => {
                if let Some(ev) = event {
                    if let Ok(json) = serde_json::to_string(&ev) {
                        if socket.send(Message::Text(json.into())).await.is_err() {
                            break;
                        }
                    }
                }
            }
        }
    }
}
