use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Deserialize)]
pub struct UpdatePersonalizationDto {
    pub personalized: bool,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CourseSelectionDto {
    pub subject_id: Uuid,
    pub course_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSetupDto {
    pub courses: Vec<CourseSelectionDto>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct VisibilityStatusDto {
    #[validate(custom(function = "validate_visibility_status"))]
    pub status: String,
}

fn validate_visibility_status(s: &str) -> Result<(), validator::ValidationError> {
    if matches!(s, "archived" | "kept") {
        Ok(())
    } else {
        Err(validator::ValidationError::new("invalid_status"))
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdatePreferencesDto {
    pub theme: Option<String>,
    pub language: Option<String>,
    pub personalized: Option<serde_json::Value>,
}
