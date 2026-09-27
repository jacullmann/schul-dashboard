use super::handlers::*;
use crate::state::AppState;
use axum::{
    Router,
    routing::{delete, get, patch, post},
};

/// Mounted under `/groups/{group_id}` behind the tenant middleware.
pub fn group_router() -> Router<AppState> {
    Router::new()
        .route("/items", get(get_items).post(create_item))
        .route("/items/reports", post(report_item))
        .route("/items/uploads/sign", post(create_upload_signature))
        .route(
            "/items/{id}",
            get(get_item_by_id).patch(update_item).delete(delete_item),
        )
        .route("/items/{id}/note", patch(update_item_note))
        .route("/items/{id}/images", post(add_image))
        .route("/items/{id}/images/{public_id}", delete(remove_image))
}
