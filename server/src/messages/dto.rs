use serde::Deserialize;
use uuid::Uuid;

pub const CONTENT_MAX_CHARS: usize = 1000;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMessageDto {
    pub content: String,
    pub parent_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportMessageDto {
    pub message_id: Uuid,
    pub reason: Option<String>,
}
