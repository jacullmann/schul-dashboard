use super::handlers::*;
use crate::{common::rate_limit, state::AppState};
use axum::{
    Router,
    handler::Handler,
    routing::{delete, get, patch, post},
};
use std::time::Duration;

/// Mounted under `/groups/{group_id}` behind the tenant middleware.
pub fn group_router() -> Router<AppState> {
    // 50 tasks per minute per IP: a whole class behind one school NAT never
    // gets near it, while a spam script is throttled to under one per second.
    let create_item = create_item.layer(rate_limit::per_client(50, Duration::from_millis(1200)));

    Router::new()
        .route("/items", get(get_items).post(create_item))
        .route("/items/reports", post(report_item))
        .route(
            "/items/{id}",
            get(get_item_by_id).patch(update_item).delete(delete_item),
        )
        .route("/items/{id}/note", patch(update_item_note))
        .route("/items/{id}/attachments", post(add_attachment))
        .route(
            "/items/{id}/attachments/{attachment_id}",
            delete(remove_attachment),
        )
}
