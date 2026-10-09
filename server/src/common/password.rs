use crate::{common::memory_hard, error::AppError};
use argon2::{
    Argon2,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString, rand_core::OsRng},
};

pub async fn hash_password(password: String) -> Result<String, AppError> {
    memory_hard::run(move || {
        let salt = SaltString::generate(&mut OsRng);

        let argon2 = Argon2::default();

        argon2
            .hash_password(password.as_bytes(), &salt)
            .map(|h| h.to_string())
            .map_err(|e| AppError::internal(format!("Password hashing failed: {e}")))
    })
    .await?
}

pub async fn verify_password(password: String, hash: String) -> Result<bool, AppError> {
    memory_hard::run(move || {
        let parsed = PasswordHash::new(&hash)
            .map_err(|e| AppError::internal(format!("Invalid password hash: {e}")))?;

        Ok(Argon2::default()
            .verify_password(password.as_bytes(), &parsed)
            .is_ok())
    })
    .await?
}

pub fn validate_password_strength(password: &str) -> Result<(), &'static str> {
    if password.len() < 8 {
        return Err("Password must be at least 8 characters long and contain letters and numbers.");
    }

    let has_letter = password.chars().any(char::is_alphabetic);

    let has_digit = password.chars().any(|c| c.is_ascii_digit());

    if !has_letter || !has_digit {
        return Err("Password must be at least 8 characters long and contain letters and numbers.");
    }

    Ok(())
}
