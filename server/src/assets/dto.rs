use crate::common::cloudinary::ResourceType;
use serde::Serialize;
use uuid::Uuid;

/// What clients need to display a stored file and build its delivery URLs.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDto {
    pub public_id: String,
    pub resource_type: ResourceType,
    pub format: String,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub name: Option<String>,
    pub thumbnail_public_id: Option<String>,
}

/// A file uploaded for a task that is not attached yet. Its `id` is what the
/// uploader sends to attach it.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadDto {
    pub id: Uuid,
    #[serde(flatten)]
    pub file: FileDto,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupAvatarUploadDto {
    pub id: Uuid,
    pub url: String,
}
