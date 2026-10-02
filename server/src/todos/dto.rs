use crate::{
    common::{names::DisplayName, text::DisplayText},
    error::AppResult,
};
use serde::Deserialize;

const TITLE_MAX_CHARS: usize = 100;
const DESCRIPTION_MAX_CHARS: usize = 2000;

/// Creates a private task or replaces the text of an existing one.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TodoDto {
    pub title: String,
    pub description: Option<String>,
}

/// A private task's text once it is known to be valid.
pub struct TodoContent {
    title: DisplayName,
    description: Option<DisplayText>,
}

impl TodoDto {
    pub fn parse(&self) -> AppResult<TodoContent> {
        Ok(TodoContent {
            title: DisplayName::parse(&self.title, TITLE_MAX_CHARS, "title")?,
            description: DisplayText::parse_optional(
                self.description.as_deref(),
                DESCRIPTION_MAX_CHARS,
                "description",
            )?,
        })
    }
}

impl TodoContent {
    pub fn title(&self) -> &str {
        self.title.as_str()
    }

    /// Stored and returned as '' when absent, so clients always get a string.
    pub fn description(&self) -> &str {
        self.description.as_ref().map_or("", DisplayText::as_str)
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderTodoDto {
    pub prev_position: Option<String>,
    pub next_position: Option<String>,
}
