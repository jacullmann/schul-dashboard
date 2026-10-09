use crate::common::{locale::Locale, theme::Theme};
use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct LoginDto {
    #[validate(email(message = "Invalid credentials."))]
    pub email: String,

    #[validate(length(min = 8, max = 255, message = "Invalid credentials."))]
    pub password: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct RegisterDto {
    #[validate(email(message = "Invalid email address."))]
    pub email: String,

    #[validate(length(
        min = 8,
        max = 255,
        message = "Password must be at least 8 characters long and contain letters and numbers."
    ))]
    pub password: String,

    #[validate(custom(function = "must_be_accepted"))]
    pub accepted_terms: bool,

    pub birth_year: i32,

    #[serde(default)]
    pub guardian_consent: bool,

    #[serde(default)]
    pub preferences: RegisterPreferencesDto,
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub struct RegisterPreferencesDto {
    #[serde(default)]
    pub theme: Theme,
    #[serde(default)]
    pub language: Locale,
}

/// Every sign-up path has to send the acceptance of the terms explicitly, so
/// no client can create an account without having asked for it.
pub(crate) fn must_be_accepted(accepted: &bool) -> Result<(), validator::ValidationError> {
    if *accepted {
        Ok(())
    } else {
        Err(validator::ValidationError::new("terms_not_accepted"))
    }
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct ForgotPasswordDto {
    #[validate(email)]
    pub email: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct ResendVerificationDto {
    #[validate(email)]
    pub email: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmSignUpDto {
    #[validate(length(equal = 64))]
    pub token: String,

    #[validate(length(min = 1, max = 255))]
    pub password: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct ResetPasswordVerifyDto {
    #[validate(email)]
    pub email: String,

    #[validate(length(equal = 6))]
    pub code: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct ResetPasswordDto {
    #[validate(length(max = 2048))]
    pub reset_token: String,

    #[validate(length(
        min = 8,
        max = 255,
        message = "Password must be at least 8 characters long and contain letters and numbers."
    ))]
    pub password: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct ChangePasswordDto {
    #[validate(length(min = 8, max = 255))]
    pub current_password: String,

    #[validate(length(
        min = 8,
        max = 255,
        message = "Password must be at least 8 characters long and contain letters and numbers."
    ))]
    pub new_password: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct SetPasswordDto {
    #[validate(length(equal = 6, message = "Invalid code."))]
    pub code: String,

    #[validate(length(
        min = 8,
        max = 255,
        message = "Password must be at least 8 characters long and contain letters and numbers."
    ))]
    pub new_password: String,
}
