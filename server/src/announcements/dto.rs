use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

pub const CONTENT_MAX_CHARS: usize = 1000;

/// Mirrors the `announcements_color_check` constraint.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "text", rename_all = "lowercase")]
pub enum AnnouncementColor {
    Info,
    #[default]
    Warn,
    Danger,
}

/// An announcement as one member sees it.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnnouncementDto {
    pub id: Uuid,
    pub content: String,
    pub color: AnnouncementColor,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub read: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAnnouncementDto {
    pub content: String,
    #[serde(default)]
    pub color: AnnouncementColor,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct MarkAnnouncementsReadDto {
    /// Clients only ever mark the handful of announcements they display.
    #[validate(length(min = 1, max = 50))]
    pub ids: Vec<Uuid>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn color_defaults_to_warn_when_omitted() {
        let dto: CreateAnnouncementDto = serde_json::from_str(r#"{"content":"x"}"#).unwrap();
        assert_eq!(dto.color, AnnouncementColor::Warn);
    }

    #[test]
    fn unknown_color_is_rejected() {
        let dto =
            serde_json::from_str::<CreateAnnouncementDto>(r#"{"content":"x","color":"purple"}"#);
        assert!(dto.is_err());
    }
}
