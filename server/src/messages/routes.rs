use super::{gateway::ws_handler, handlers::*};
use crate::state::AppState;
use axum::{
    Router,
    routing::{delete, get, post},
};

/// The socket is per user; it joins groups explicitly and checks membership
/// for each one.
pub fn router() -> Router<AppState> {
    Router::new().route("/messages/ws", get(ws_handler))
}

/// Mounted under `/groups/{group_id}` behind the tenant middleware.
pub fn group_router() -> Router<AppState> {
    Router::new()
        .route("/messages", get(get_messages).post(create_message))
        .route("/messages/read", post(mark_read))
        .route("/messages/reports", post(report_message))
        .route("/messages/{id}", delete(delete_message))
}
