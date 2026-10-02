use super::{
    dto::{GroupAvatarUploadDto, UploadDto},
    file_kind::{MAX_DOCUMENT_BYTES, MAX_IMAGE_BYTES},
    service::{AssetService, ReceivedFile},
};
use crate::{
    common::{
        extractors::{AuthUser, TenantContext},
        permission::Permission,
    },
    error::AppResult,
    require_permission,
    state::AppState,
};
use axum::{
    Json,
    extract::{Multipart, State},
};

pub async fn upload_attachment(
    State(s): State<AppState>,
    tc: TenantContext,
    multipart: Multipart,
) -> AppResult<Json<UploadDto>> {
    require_permission!(tc, Permission::UploadImages);
    let file = ReceivedFile::read(multipart, MAX_DOCUMENT_BYTES).await?;

    Ok(Json(
        AssetService::from_state(&s)
            .upload_attachment(tc.user.user_id, file)
            .await?,
    ))
}

/// A new group's picture is uploaded before the group exists, so this is the
/// one upload that needs no group membership.
pub async fn upload_group_avatar(
    State(s): State<AppState>,
    user: AuthUser,
    multipart: Multipart,
) -> AppResult<Json<GroupAvatarUploadDto>> {
    let file = ReceivedFile::read(multipart, MAX_IMAGE_BYTES).await?;

    Ok(Json(
        AssetService::from_state(&s)
            .upload_group_avatar(user.user_id, file)
            .await?,
    ))
}
