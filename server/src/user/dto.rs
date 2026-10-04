use crate::common::locale::Locale;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePersonalizationDto {
    pub personalized: bool,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CourseSelectionDto {
    pub subject_id: Uuid,
    pub course_id: Uuid,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSetupDto {
    pub courses: Vec<CourseSelectionDto>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
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

/// Hints a user can hide for good. Each page keeps its own entry, so hiding a
/// hint on one page leaves it in place on the others.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DismissibleNotice {
    PersonalizedTasks,
    PersonalizedSchedule,
}

impl DismissibleNotice {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::PersonalizedTasks => "personalizedTasks",
            Self::PersonalizedSchedule => "personalizedSchedule",
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct NoticePath {
    pub notice: DismissibleNotice,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePreferencesDto {
    pub theme: Option<String>,
    pub language: Option<Locale>,
    pub personalized: Option<serde_json::Value>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stored_notice_names_match_the_route_names() {
        for notice in [
            DismissibleNotice::PersonalizedTasks,
            DismissibleNotice::PersonalizedSchedule,
        ] {
            let parsed: DismissibleNotice =
                serde_json::from_value(serde_json::json!(notice.as_str())).unwrap();
            assert_eq!(parsed, notice);
        }
    }
}
