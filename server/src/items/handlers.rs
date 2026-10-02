use super::{
    dto::*,
    policy::ItemActor,
    service::{GetItemsFilter, ItemsService},
};
use crate::{
    common::{
        assets,
        cloudinary::UploadSignature,
        extractors::{TenantContext, ValidatedJson},
        path_params::{IdPath, ItemImagePath},
        permission::Permission,
        personalization::hidden_by_courses_header,
        text::DisplayText,
    },
    error::AppResult,
    reports::service::{REASON_MAX_CHARS, ReportsService},
    require_permission,
    state::AppState,
};
use axum::{
    Json,
    extract::{Path, Query, State},
    response::IntoResponse,
};
use serde_json::Value;

pub async fn get_items(
    State(s): State<AppState>,
    tc: TenantContext,
    Query(q): Query<ItemsQuery>,
) -> AppResult<impl IntoResponse> {
    let list = ItemsService::from_state(&s)
        .get_items(
            tc.tenant_id,
            tc.user.user_id,
            GetItemsFilter {
                item_type: q.r#type.as_deref(),
                filter: q.filter.as_deref(),
                subject_id: q.subject_id,
                hide_checked: q.hide_checked.unwrap_or(false),
                personalized: q.personalized.unwrap_or(false),
            },
            tc.is_superadmin,
        )
        .await?;

    Ok((
        hidden_by_courses_header(list.hidden_by_courses),
        Json(list.items),
    ))
}

pub async fn get_item_by_id(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(IdPath { id }): Path<IdPath>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        ItemsService::from_state(&s)
            .get_item_by_id(tc.tenant_id, id, tc.is_superadmin)
            .await?,
    ))
}

pub async fn create_item(
    State(s): State<AppState>,
    tc: TenantContext,
    ValidatedJson(dto): ValidatedJson<CreateItemDto>,
) -> AppResult<Json<Value>> {
    require_permission!(tc, Permission::CreateItems);

    Ok(Json(
        ItemsService::from_state(&s)
            .create_item(tc.tenant_id, ItemActor::from_context(&tc), &dto)
            .await?,
    ))
}

pub async fn update_item(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(IdPath { id }): Path<IdPath>,
    ValidatedJson(dto): ValidatedJson<UpdateItemDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        ItemsService::from_state(&s)
            .update_item(tc.tenant_id, id, ItemActor::from_context(&tc), &dto)
            .await?,
    ))
}

pub async fn delete_item(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(IdPath { id }): Path<IdPath>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        ItemsService::from_state(&s)
            .delete_item(tc.tenant_id, id, ItemActor::from_context(&tc))
            .await?,
    ))
}

pub async fn update_item_note(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(IdPath { id }): Path<IdPath>,
    Json(dto): Json<UpdateEditorNoteDto>,
) -> AppResult<Json<Value>> {
    require_permission!(tc, Permission::ManageNotes);
    let note = DisplayText::parse_optional(Some(&dto.editor_note), NOTE_MAX_CHARS, "editorNote")?;

    Ok(Json(
        ItemsService::from_state(&s)
            .update_item_note(tc.tenant_id, id, tc.user.user_id, note.as_ref())
            .await?,
    ))
}

pub async fn add_image(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(IdPath { id }): Path<IdPath>,
    Json(dto): Json<AddImageDto>,
) -> AppResult<Json<Value>> {
    require_permission!(tc, Permission::UploadImages);

    Ok(Json(
        ItemsService::from_state(&s)
            .add_image(tc.tenant_id, id, tc.user.user_id, &dto)
            .await?,
    ))
}

pub async fn remove_image(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(ItemImagePath { id, public_id }): Path<ItemImagePath>,
) -> AppResult<Json<Value>> {
    let decoded = urlencoding::decode(&public_id)
        .map_err(|_| crate::error::AppError::bad_request("Invalid public_id encoding"))?;

    Ok(Json(
        ItemsService::from_state(&s)
            .remove_image(tc.tenant_id, id, ItemActor::from_context(&tc), &decoded)
            .await?,
    ))
}

pub async fn report_item(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<ReportItemDto>,
) -> AppResult<Json<Value>> {
    let reason = DisplayText::parse_optional(dto.reason.as_deref(), REASON_MAX_CHARS, "reason")?;

    Ok(Json(
        ReportsService::from_state(&s)
            .report_task(
                tc.tenant_id,
                tc.user.user_id,
                &tc.user.email,
                dto.item_id,
                reason.as_ref(),
            )
            .await?,
    ))
}

pub async fn create_upload_signature(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<SignUploadDto>,
) -> AppResult<Json<UploadSignature>> {
    require_permission!(tc, Permission::UploadImages);

    Ok(Json(
        assets::issue_upload(&s.db, &s.cloudinary, dto.raw_extension).await?,
    ))
}
