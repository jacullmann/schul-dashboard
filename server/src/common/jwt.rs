use crate::{config::Config, error::AppError};
use anyhow::Context;
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use uuid::Uuid;

/// Seconds since the Unix epoch. A clock set before 1970 yields 0 rather
/// than panicking.
pub(crate) fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

pub(crate) fn exp_secs(ttl: Duration) -> u64 {
    now_secs() + ttl.as_secs()
}

/// The project signs every token with HS256; `Validation::default()` would
/// also accept other HMAC variants advertised in the token header.
pub(crate) fn hs256_validation() -> Validation {
    let mut v = Validation::default();
    v.algorithms = vec![jsonwebtoken::Algorithm::HS256];
    v
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AccessClaims {
    pub sub: String,
    pub email: String,
    pub iat: u64,
    pub exp: u64,
}

impl AccessClaims {
    pub fn new(user_id: Uuid, email: String, ttl: Duration) -> Self {
        let now = now_secs();

        Self {
            sub: user_id.to_string(),
            email,
            iat: now,
            exp: now + ttl.as_secs(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MfaPendingClaims {
    pub sub: String,
    pub email: String,
    pub purpose: String,
    pub iat: u64,
    pub exp: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PasswordResetClaims {
    pub email: String,
    pub purpose: String,
    pub iat: u64,
    pub exp: u64,
}

#[derive(Clone)]
pub struct JwtService {
    user_enc: EncodingKey,
    user_dec: DecodingKey,
    mfa_enc: EncodingKey,
    mfa_dec: DecodingKey,
    reset_enc: EncodingKey,
    reset_dec: DecodingKey,
}

impl JwtService {
    pub fn new(config: &Config) -> Self {
        Self {
            user_enc: EncodingKey::from_secret(config.user_jwt_secret.as_bytes()),
            user_dec: DecodingKey::from_secret(config.user_jwt_secret.as_bytes()),
            mfa_enc: EncodingKey::from_secret(config.mfa_pending_jwt_secret.as_bytes()),
            mfa_dec: DecodingKey::from_secret(config.mfa_pending_jwt_secret.as_bytes()),
            reset_enc: EncodingKey::from_secret(config.password_reset_jwt_secret.as_bytes()),
            reset_dec: DecodingKey::from_secret(config.password_reset_jwt_secret.as_bytes()),
        }
    }

    pub fn sign_access(&self, claims: &AccessClaims) -> anyhow::Result<String> {
        encode(&Header::default(), claims, &self.user_enc).context("Failed to sign access token")
    }

    pub fn verify_access(&self, token: &str) -> Result<AccessClaims, AppError> {
        decode::<AccessClaims>(token, &self.user_dec, &hs256_validation())
            .map(|d| d.claims)
            .map_err(|_| AppError::TokenExpired)
    }

    pub fn sign_mfa_pending(
        &self,
        user_id: Uuid,
        email: &str,
        ttl: Duration,
    ) -> anyhow::Result<String> {
        let claims = MfaPendingClaims {
            sub: user_id.to_string(),
            email: email.to_string(),
            purpose: "mfa_pending".into(),
            iat: now_secs(),
            exp: exp_secs(ttl),
        };

        encode(&Header::default(), &claims, &self.mfa_enc)
            .context("Failed to sign MFA pending token")
    }

    pub fn verify_mfa_pending(&self, token: &str) -> Result<MfaPendingClaims, AppError> {
        // Issuer and verifier share one clock, so a leeway would only stretch
        // the challenge past the deadline the client was told about.
        let mut validation = hs256_validation();
        validation.leeway = 0;

        decode::<MfaPendingClaims>(token, &self.mfa_dec, &validation)
            .map(|d| d.claims)
            .map_err(|_| AppError::MfaChallengeExpired)
    }

    pub fn sign_password_reset(&self, email: &str, ttl: Duration) -> anyhow::Result<String> {
        let claims = PasswordResetClaims {
            email: email.to_string(),
            purpose: "password_reset".into(),
            iat: now_secs(),
            exp: exp_secs(ttl),
        };

        encode(&Header::default(), &claims, &self.reset_enc)
            .context("Failed to sign password reset token")
    }

    pub fn verify_password_reset(&self, token: &str) -> Result<PasswordResetClaims, AppError> {
        decode::<PasswordResetClaims>(token, &self.reset_dec, &hs256_validation())
            .map(|d| d.claims)
            .map_err(|_| AppError::BadRequest("Invalid or expired reset token.".into()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const MFA_SECRET: &[u8] = b"mfa-pending-test-secret-of-32-bytes!";

    fn service() -> JwtService {
        let other = b"unrelated-test-secret-of-32-bytes-long";
        JwtService {
            user_enc: EncodingKey::from_secret(other),
            user_dec: DecodingKey::from_secret(other),
            mfa_enc: EncodingKey::from_secret(MFA_SECRET),
            mfa_dec: DecodingKey::from_secret(MFA_SECRET),
            reset_enc: EncodingKey::from_secret(other),
            reset_dec: DecodingKey::from_secret(other),
        }
    }

    fn pending_token(exp: u64, secret: &[u8]) -> String {
        let claims = MfaPendingClaims {
            sub: Uuid::new_v4().to_string(),
            email: "user@example.com".into(),
            purpose: "mfa_pending".into(),
            iat: now_secs(),
            exp,
        };
        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(secret),
        )
        .unwrap()
    }

    #[test]
    fn mfa_pending_token_is_accepted_before_its_deadline() {
        let token = pending_token(now_secs() + 60, MFA_SECRET);

        assert!(service().verify_mfa_pending(&token).is_ok());
    }

    #[test]
    fn mfa_pending_token_past_its_deadline_is_rejected_without_leeway() {
        let token = pending_token(now_secs() - 1, MFA_SECRET);

        assert!(matches!(
            service().verify_mfa_pending(&token),
            Err(AppError::MfaChallengeExpired)
        ));
    }

    #[test]
    fn mfa_pending_token_signed_with_another_key_is_rejected() {
        let token = pending_token(now_secs() + 60, b"some-other-secret-of-32-bytes-long");

        assert!(matches!(
            service().verify_mfa_pending(&token),
            Err(AppError::MfaChallengeExpired)
        ));
    }
}
