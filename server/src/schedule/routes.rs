use super::handlers::*;
use crate::state::AppState;
use axum::{
    Router,
    routing::{get, post},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/schedule", get(get_schedule))
        .route("/schedule/subs", get(get_subs))
        .route("/schedule/subjects", get(get_subjects))
        .route("/schedule/announcements", get(get_announcements))
        .route(
            "/schedule/announcements/read-status",
            get(get_announcement_read_status),
        )
        .route(
            "/schedule/announcements/{id}/read",
            post(mark_announcement_read),
        )
}
