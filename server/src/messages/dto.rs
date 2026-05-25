use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateMessageDto {
    #[validate(length(min = 1, max = 1000))]
    pub content: String,
    pub parent_id: Option<Uuid>,
}
