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
    pub tasks: Option<TaskPreferencesDto>,
    pub schedule: Option<SchedulePreferencesDto>,
}

/// When checked tasks leave the list for the archive. The task list query
/// reads the stored names, so they must not change.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ArchiveCheckedTasks {
    Always,
    AfterDueDate,
    Never,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskPreferencesDto {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub archive_checked: Option<ArchiveCheckedTasks>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group_by_due_date: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub archive_other_courses_past_due: Option<bool>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum NowMarkerTime {
    Remaining,
    Duration,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SchedulePreferencesDto {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub highlight_next_lesson: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub now_marker: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub now_marker_time: Option<NowMarkerTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub include_breaks_in_free_time: Option<bool>,
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

    #[test]
    fn archive_setting_keeps_the_names_the_task_list_reads() {
        for (setting, stored) in [
            (ArchiveCheckedTasks::Always, "always"),
            (ArchiveCheckedTasks::AfterDueDate, "afterDueDate"),
            (ArchiveCheckedTasks::Never, "never"),
        ] {
            assert_eq!(serde_json::to_value(setting).unwrap(), stored);
        }
    }

    #[test]
    fn unknown_task_settings_are_refused() {
        let invalid = serde_json::json!({ "tasks": { "archiveChecked": "sometimes" } });
        assert!(serde_json::from_value::<UpdatePreferencesDto>(invalid).is_err());
    }
}
