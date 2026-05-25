use super::handlers::*;
use crate::state::AppState;
use axum::{
    Router,
    routing::{delete, get, patch, post, put},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/todos", get(get_todos).post(create_todo))
        .route("/todos/{id}", put(update_todo).delete(delete_todo))
        .route("/todos/{id}/toggle", patch(toggle_todo))
        .route("/todos/{id}/reorder", patch(reorder_todo))
}
