use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct LinkGoogleAccountDto {
    #[validate(length(min = 8, max = 255, message = "Invalid credentials."))]
    pub password: String,
}
