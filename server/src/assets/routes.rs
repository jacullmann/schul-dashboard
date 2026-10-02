use super::{
    file_kind::{MAX_DOCUMENT_BYTES, MAX_IMAGE_BYTES},
    handlers::*,
};
use crate::{common::rate_limit, state::AppState};
use axum::{Router, extract::DefaultBodyLimit, handler::Handler, routing::post};

/// Room for the multipart framing around the file itself.
const MULTIPART_OVERHEAD_BYTES: usize = 64 * 1024;

pub fn router() -> Router<AppState> {
    let upload_group_avatar = upload_group_avatar
        .layer(DefaultBodyLimit::max(
            MAX_IMAGE_BYTES + MULTIPART_OVERHEAD_BYTES,
        ))
        .layer(rate_limit::uploads());

    Router::new().route("/uploads/group-avatar", post(upload_group_avatar))
}

/// Mounted under `/groups/{group_id}` behind the tenant middleware.
pub fn group_router() -> Router<AppState> {
    let upload_attachment = upload_attachment
        .layer(DefaultBodyLimit::max(
            MAX_DOCUMENT_BYTES + MULTIPART_OVERHEAD_BYTES,
        ))
        .layer(rate_limit::uploads());

    Router::new().route("/items/uploads", post(upload_attachment))
}
