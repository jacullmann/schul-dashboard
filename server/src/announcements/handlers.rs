use super::{
    dto::{AnnouncementDto, CONTENT_MAX_CHARS, CreateAnnouncementDto, MarkAnnouncementsReadDto},
    service::AnnouncementService,
};
use crate::{
    common::{
        extractors::{TenantContext, ValidatedJson},
        path_params::IdPath,
        permission::Permission,
        text::DisplayText,
    },
    error::AppResult,
    require_permission,
    state::AppState,
};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};

pub async fn list_announcements(
    State(s): State<AppState>,
    tc: TenantContext,
) -> AppResult<Json<Vec<AnnouncementDto>>> {
    Ok(Json(
        AnnouncementService::from_state(&s)
            .list_visible(tc.tenant_id, tc.user.user_id)
            .await?,
    ))
}

pub async fn mark_announcements_read(
    State(s): State<AppState>,
    tc: TenantContext,
    ValidatedJson(dto): ValidatedJson<MarkAnnouncementsReadDto>,
) -> AppResult<StatusCode> {
    AnnouncementService::from_state(&s)
        .mark_read(tc.tenant_id, tc.user.user_id, &dto.ids)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn create_announcement(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<CreateAnnouncementDto>,
) -> AppResult<(StatusCode, Json<AnnouncementDto>)> {
    require_permission!(tc, Permission::ManageAnnouncements);
    let content = DisplayText::parse(&dto.content, CONTENT_MAX_CHARS, "content")?;

    let announcement = AnnouncementService::from_state(&s)
        .create(tc.tenant_id, tc.user.user_id, &content, dto.color)
        .await?;

    Ok((StatusCode::CREATED, Json(announcement)))
}

pub async fn delete_announcement(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(IdPath { id }): Path<IdPath>,
) -> AppResult<StatusCode> {
    require_permission!(tc, Permission::ManageAnnouncements);

    AnnouncementService::from_state(&s)
        .delete(tc.tenant_id, id)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}
