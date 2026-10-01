use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct LinkGoogleAccountDto {
    #[validate(length(min = 8, max = 255, message = "Invalid credentials."))]
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct GoogleAuthUrlResponse {
    pub url: String,
}
