use super::{gateway::ws_handler, handlers::*};
use crate::state::AppState;
use axum::{
    Router,
    routing::{delete, get, post},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/messages", get(get_messages).post(create_message))
        .route("/messages/read", post(mark_read))
        .route("/messages/{id}", delete(delete_message))
        .route("/messages/ws", get(ws_handler))
}
