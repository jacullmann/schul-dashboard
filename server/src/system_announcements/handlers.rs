use super::{
    dto::{AdminSystemAnnouncementDto, SaveSystemAnnouncementDto, SystemAnnouncementDto},
    service::SystemAnnouncementService,
};
use crate::{
    announcements::dto::MarkAnnouncementsReadDto,
    common::{
        client::ClientInfo,
        extractors::{AuthUser, SuperAdmin, ValidatedJson},
    },
    error::AppResult,
    state::AppState,
};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use chrono::Utc;
use serde_json::{Value, json};
use uuid::Uuid;

pub async fn list_announcements(
    State(s): State<AppState>,
    user: AuthUser,
) -> AppResult<Json<Vec<SystemAnnouncementDto>>> {
    Ok(Json(
        SystemAnnouncementService::from_state(&s)
            .list_unread(user.user_id)
            .await?,
    ))
}

pub async fn mark_announcements_read(
    State(s): State<AppState>,
    user: AuthUser,
    ValidatedJson(dto): ValidatedJson<MarkAnnouncementsReadDto>,
) -> AppResult<StatusCode> {
    SystemAnnouncementService::from_state(&s)
        .mark_read(user.user_id, &dto.ids)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn list_admin_announcements(
    State(s): State<AppState>,
    _: SuperAdmin,
) -> AppResult<Json<Vec<AdminSystemAnnouncementDto>>> {
    Ok(Json(
        SystemAnnouncementService::from_state(&s)
            .list_for_admin()
            .await?,
    ))
}

pub async fn create_announcement(
    State(s): State<AppState>,
    SuperAdmin(admin): SuperAdmin,
    client: ClientInfo,
    Json(dto): Json<SaveSystemAnnouncementDto>,
) -> AppResult<(StatusCode, Json<Value>)> {
    let input = dto.parse(Utc::now())?;

    let id = SystemAnnouncementService::from_state(&s)
        .create(&input, admin.user_id, &client)
        .await?;

    Ok((StatusCode::CREATED, Json(json!({ "id": id }))))
}

pub async fn update_announcement(
    State(s): State<AppState>,
    SuperAdmin(admin): SuperAdmin,
    client: ClientInfo,
    Path(id): Path<Uuid>,
    Json(dto): Json<SaveSystemAnnouncementDto>,
) -> AppResult<StatusCode> {
    let input = dto.parse(Utc::now())?;

    SystemAnnouncementService::from_state(&s)
        .update(id, &input, admin.user_id, &client)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn delete_announcement(
    State(s): State<AppState>,
    SuperAdmin(admin): SuperAdmin,
    client: ClientInfo,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    SystemAnnouncementService::from_state(&s)
        .delete(id, admin.user_id, &client)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}
