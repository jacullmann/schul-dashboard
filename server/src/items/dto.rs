use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateItemDto {
    pub r#type: String,
    #[validate(length(min = 1, max = 60))]
    pub title: String,
    #[validate(length(min = 1, max = 100))]
    pub subject: String,
    #[validate(length(max = 1000))]
    pub description: Option<String>,
    pub images: Option<Vec<ImageDto>>,
    pub due_date: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateItemDto {
    pub title: Option<String>,
    pub subject: Option<String>,
    pub description: Option<String>,
    pub images: Option<Vec<serde_json::Value>>,
    pub due_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ImageDto {
    pub public_id: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEditorNoteDto {
    pub editor_note: String,
}

#[derive(Debug, Deserialize)]
pub struct AddImageDto {
    pub public_id: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ReportItemDto {
    pub item_id: Uuid,
    #[validate(length(min = 1, max = 200))]
    pub item_title: String,
    pub category: String,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ItemsQuery {
    pub r#type: Option<String>,
    pub filter: Option<String>,
}
