use crate::auth::dto::must_be_accepted;
use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct GoogleSignUpDto {
    #[validate(custom(function = "must_be_accepted"))]
    pub accepted_terms: bool,

    pub birth_year: i32,

    #[serde(default)]
    pub guardian_consent: bool,
}

#[derive(Debug, Serialize)]
pub struct GoogleAuthUrlResponse {
    pub url: String,
}
