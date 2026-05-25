use super::{dto::*, service::TodoService};
use crate::{common::extractors::AuthUser, error::AppResult, state::AppState};
use axum::{
    Json,
    extract::{Path, State},
};
use serde_json::Value;
use uuid::Uuid;

pub async fn get_todos(State(s): State<AppState>, user: AuthUser) -> AppResult<Json<Value>> {
    Ok(Json(serde_json::json!(
        TodoService::from_state(&s).get_todos(user.user_id).await?
    )))
}

pub async fn create_todo(
    State(s): State<AppState>,
    user: AuthUser,
    Json(dto): Json<CreateTodoDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        TodoService::from_state(&s)
            .create_todo(user.user_id, &dto.title, dto.description.as_deref())
            .await?,
    ))
}

pub async fn update_todo(
    State(s): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(dto): Json<UpdateTodoDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        TodoService::from_state(&s)
            .update_todo(user.user_id, id, &dto.title, dto.description.as_deref())
            .await?,
    ))
}

pub async fn toggle_todo(
    State(s): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        TodoService::from_state(&s)
            .toggle_todo(user.user_id, id)
            .await?,
    ))
}

pub async fn reorder_todo(
    State(s): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(dto): Json<ReorderTodoDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        TodoService::from_state(&s)
            .reorder_todo(
                user.user_id,
                id,
                dto.prev_position.as_deref(),
                dto.next_position.as_deref(),
            )
            .await?,
    ))
}

pub async fn delete_todo(
    State(s): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        TodoService::from_state(&s)
            .delete_todo(user.user_id, id)
            .await?,
    ))
}
