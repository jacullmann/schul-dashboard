use super::{dto::*, service::ItemsService};
use crate::{
    common::extractors::{AuthUser, TenantContext},
    error::AppResult,
    state::AppState,
};
use axum::{
    Json,
    extract::{Path, Query, State},
};
use serde_json::Value;
use uuid::Uuid;

pub async fn get_items(
    State(s): State<AppState>,
    tc: TenantContext,
    Query(q): Query<ItemsQuery>,
) -> AppResult<Json<Value>> {
    let items = ItemsService::from_state(&s)
        .get_items(
            tc.tenant_id,
            tc.user.user_id,
            q.r#type.as_deref(),
            q.filter.as_deref(),
        )
        .await?;
    Ok(Json(serde_json::json!(items)))
}

pub async fn get_item_by_id(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        ItemsService::from_state(&s)
            .get_item_by_id(tc.tenant_id, id)
            .await?,
    ))
}

pub async fn create_item(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<CreateItemDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        ItemsService::from_state(&s)
            .create_item(tc.tenant_id, tc.user.user_id, &dto)
            .await?,
    ))
}

pub async fn update_item(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(id): Path<Uuid>,
    Json(dto): Json<UpdateItemDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        ItemsService::from_state(&s)
            .update_item(tc.tenant_id, id, tc.user.user_id, &dto)
            .await?,
    ))
}

pub async fn delete_item(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        ItemsService::from_state(&s)
            .delete_item(crate::items::service::DeleteItemParams {
                tenant_id: tc.tenant_id,
                id,
                user_id: tc.user.user_id,
                global_role: &tc.user.global_role,
                tenant_role: &tc.tenant_role,
                group_owner_id: tc.group_owner_id,
                group_permissions: &tc.group_permissions,
            })
            .await?,
    ))
}

pub async fn update_item_note(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(id): Path<Uuid>,
    Json(dto): Json<UpdateEditorNoteDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        ItemsService::from_state(&s)
            .update_item_note(tc.tenant_id, id, tc.user.user_id, &dto.editor_note)
            .await?,
    ))
}

pub async fn add_image(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(id): Path<Uuid>,
    Json(dto): Json<AddImageDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        ItemsService::from_state(&s)
            .add_image(
                tc.tenant_id,
                id,
                tc.user.user_id,
                &tc.user.global_role,
                &dto,
            )
            .await?,
    ))
}

pub async fn remove_image(
    State(s): State<AppState>,
    tc: TenantContext,
    Path((id, public_id)): Path<(Uuid, String)>,
) -> AppResult<Json<Value>> {
    let decoded = urlencoding::decode(&public_id)
        .map_err(|_| crate::error::AppError::bad_request("Invalid public_id encoding"))?;
    Ok(Json(
        ItemsService::from_state(&s)
            .remove_image(
                tc.tenant_id,
                id,
                tc.user.user_id,
                &tc.user.global_role,
                &decoded,
            )
            .await?,
    ))
}

pub async fn report_item(
    State(s): State<AppState>,
    user: AuthUser,
    Json(dto): Json<ReportItemDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        ItemsService::from_state(&s)
            .report_item(user.user_id, &user.email, &dto)
            .await?,
    ))
}

pub async fn create_upload_signature(State(s): State<AppState>) -> AppResult<Json<Value>> {
    let folder = s.config.cloudinary_folder.clone();
    Ok(Json(
        ItemsService::from_state(&s).create_upload_signature(&folder),
    ))
}
