use crate::error::{AppError, AppResult};

pub const GROUP_NAME_MAX_CHARS: usize = 100;
pub const SUBJECT_NAME_MAX_CHARS: usize = 60;
pub const COURSE_NAME_MAX_CHARS: usize = 60;
pub const CUSTOM_SUBJECT_MAX_CHARS: usize = 100;

/// A name people type in and others read: trimmed, never empty, bounded in
/// length and free of control characters such as line breaks.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DisplayName(String);

impl DisplayName {
    /// `field` names the rejected input in the validation error, matching the
    /// field names `ValidatedJson` reports.
    pub fn parse(raw: &str, max_chars: usize, field: &str) -> AppResult<Self> {
        let trimmed = raw.trim();
        let valid = !trimmed.is_empty()
            && trimmed.chars().count() <= max_chars
            && !trimmed.chars().any(char::is_control);

        if valid {
            Ok(Self(trimmed.to_owned()))
        } else {
            Err(AppError::Validation(vec![field.to_owned()]))
        }
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn surrounding_whitespace_is_dropped() {
        let name = DisplayName::parse("  Mathe  ", 10, "name").unwrap();
        assert_eq!(name.as_str(), "Mathe");
    }

    #[test]
    fn blank_names_are_rejected() {
        assert!(DisplayName::parse("   ", 10, "name").is_err());
    }

    #[test]
    fn length_counts_characters_not_bytes() {
        assert!(DisplayName::parse("Müller", 6, "name").is_ok());
        assert!(DisplayName::parse("Müllers", 6, "name").is_err());
    }

    #[test]
    fn control_characters_are_rejected() {
        assert!(DisplayName::parse("Ma\nthe", 10, "name").is_err());
    }
}
