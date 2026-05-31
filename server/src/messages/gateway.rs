use crate::{common::name_generator::generate_user_name, config::ACCESS_COOKIE, state::AppState};
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::{extract::State, response::Response};
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

    let mut rx: Option<broadcast::Receiver<BusEvent>> = None;

    let mut joined_group: Option<Uuid> = None;

    let mut sender_name: Option<String> = None;

    loop {
        tokio::select! {
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        if let Ok(event) = serde_json::from_str::<ClientEvent>(&text) {
                            match event {
                                ClientEvent::JoinGroup { group_id } => {
                                    let mut has_access = claims.g_role == "superadmin";
                                    if !has_access {
                                        let is_member = sqlx::query(
                                            r#"SELECT 1 FROM user_roles WHERE user_id = $1 AND tenant_id = $2"#,
                                        )
                                        .bind(user_id)
                                        .bind(group_id)
                                        .fetch_optional(&state.db)
                                        .await
                                        .unwrap_or(None);

                                        if is_member.is_some() {
                                            has_access = true;
                                        }
                                    }

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
