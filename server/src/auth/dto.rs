use serde::Deserialize;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct LoginDto {
    #[validate(email(message = "Invalid credentials."))]
    pub email: String,

    #[validate(length(min = 8, max = 255, message = "Invalid credentials."))]
    pub password: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct RegisterDto {
    #[validate(email(message = "Invalid email address."))]
    pub email: String,

    #[validate(length(
        min = 8,
        max = 255,
        message = "Password must be at least 8 characters long and contain letters and numbers."
    ))]
    pub password: String,

    pub preferences: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct VerifyMfaDto {
    #[validate(length(equal = 6, message = "MFA Code must be exactly 6 digits."))]
    pub code: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ForgotPasswordDto {
    #[validate(email)]
    pub email: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ResetPasswordVerifyDto {
    #[validate(email)]
    pub email: String,

    #[validate(length(equal = 6))]
    pub code: String,
}

#[derive(Debug, Deserialize)]
pub struct ResetPasswordDto {
    pub reset_token: String,
    pub password: String,
}

#[derive(Debug, Deserialize, Validate)]
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
