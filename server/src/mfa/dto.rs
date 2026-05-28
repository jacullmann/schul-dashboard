use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct MfaCodeDto {
    #[validate(length(equal = 6))]
    pub code: String,
}
