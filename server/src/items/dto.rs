use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

/// What a task is about: a subject of the group, optionally narrowed to one of
/// its courses, or a subject typed in by hand that the group does not offer.
#[derive(Debug, Deserialize)]
#[serde(untagged, rename_all_fields = "camelCase")]
pub enum ItemSubjectDto {
    Group {
        subject_id: Uuid,
        course_id: Option<Uuid>,
    },
    Custom {
        custom_name: String,
    },
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreateItemDto {
    #[validate(custom(function = "validate_item_type"))]
    pub r#type: String,
    #[validate(length(min = 1, max = 60))]
    pub title: String,
    pub subject: ItemSubjectDto,
    #[validate(length(max = 1000))]
    pub description: Option<String>,
    pub images: Option<Vec<ImageDto>>,
    pub due_date: String,
    pub confirm_double_task: Option<bool>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct UpdateItemDto {
    #[validate(length(min = 1, max = 60))]
    pub title: Option<String>,
    pub subject: Option<ItemSubjectDto>,
    #[validate(length(max = 1000))]
    pub description: Option<String>,
    pub images: Option<Vec<serde_json::Value>>,
    pub due_date: Option<String>,
}

fn validate_item_type(t: &str) -> Result<(), validator::ValidationError> {
    if matches!(t, "homework" | "dalton" | "exam") {
        Ok(())
    } else {
        Err(validator::ValidationError::new("invalid_type"))
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageDto {
    pub public_id: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddImageDto {
    pub image: ImageDto,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEditorNoteDto {
    pub editor_note: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct ReportItemDto {
    pub item_id: Uuid,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemsQuery {
    pub r#type: Option<String>,
    pub filter: Option<String>,
    pub subject_id: Option<Uuid>,
    pub hide_checked: Option<bool>,
    pub personalized: Option<bool>,
}
