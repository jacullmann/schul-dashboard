use crate::error::{AppError, AppResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

const CONTENT_MAX_CHARS: usize = 1000;

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

/// Announcement text as stored: trimmed, never blank and bounded in length.
/// Line breaks stay, since an announcement may span several paragraphs.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AnnouncementContent(String);

impl AnnouncementContent {
    pub fn parse(raw: &str) -> AppResult<Self> {
        let trimmed = raw.trim();

        if trimmed.is_empty() || trimmed.chars().count() > CONTENT_MAX_CHARS {
            return Err(AppError::Validation(vec!["content".to_owned()]));
        }

        Ok(Self(trimmed.to_owned()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn content_is_trimmed() {
        let content = AnnouncementContent::parse("  Morgen frei  \n").unwrap();
        assert_eq!(content.as_str(), "Morgen frei");
    }

    #[test]
    fn content_keeps_inner_line_breaks() {
        let content = AnnouncementContent::parse("Zeile 1\nZeile 2").unwrap();
        assert_eq!(content.as_str(), "Zeile 1\nZeile 2");
    }

    #[test]
    fn blank_content_is_rejected() {
        assert!(AnnouncementContent::parse(" \n\t ").is_err());
    }

    #[test]
    fn content_length_counts_chars_not_bytes() {
        assert!(AnnouncementContent::parse(&"ä".repeat(CONTENT_MAX_CHARS)).is_ok());
        assert!(AnnouncementContent::parse(&"a".repeat(CONTENT_MAX_CHARS + 1)).is_err());
    }

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
