use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateTodoDto {
    #[validate(length(min = 1, max = 100))]
    pub title: String,
    #[validate(length(max = 2000))]
    pub description: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateTodoDto {
    #[validate(length(min = 1, max = 100))]
    pub title: String,
    #[validate(length(max = 2000))]
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReorderTodoDto {
    pub prev_position: Option<String>,
    pub next_position: Option<String>,
}
