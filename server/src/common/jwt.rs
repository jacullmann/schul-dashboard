use crate::{config::Config, error::AppError};
use anyhow::Context;
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use uuid::Uuid;

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

fn exp_secs(ttl: Duration) -> u64 {
    now_secs() + ttl.as_secs()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AccessClaims {
    pub sub: String,
    pub email: String,
    pub g_role: String,
    pub g_id: Option<String>,
    pub iat: u64,
    pub exp: u64,
}

impl AccessClaims {
    pub fn new(
        user_id: Uuid,
        email: String,
        global_role: String,
        active_group_id: Option<Uuid>,
        ttl: Duration,
    ) -> Self {
        let now = now_secs();
        Self {
            sub: user_id.to_string(),
            email,
            g_role: global_role,
            g_id: active_group_id.map(|id| id.to_string()),
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
pub struct OAuthPendingClaims {
    pub sub: String,
    pub email: String,
    pub provider: String,
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
    oauth_enc: EncodingKey,
    oauth_dec: DecodingKey,
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
            oauth_enc: EncodingKey::from_secret(config.oauth_pending_jwt_secret.as_bytes()),
            oauth_dec: DecodingKey::from_secret(config.oauth_pending_jwt_secret.as_bytes()),
            reset_enc: EncodingKey::from_secret(config.password_reset_jwt_secret.as_bytes()),
            reset_dec: DecodingKey::from_secret(config.password_reset_jwt_secret.as_bytes()),
        }
    }

    pub fn sign_access(&self, claims: &AccessClaims) -> anyhow::Result<String> {
        encode(&Header::default(), claims, &self.user_enc)
            .context("Failed to sign access token")
    }

    pub fn verify_access(&self, token: &str) -> Result<AccessClaims, AppError> {
        let mut v = Validation::default();
        v.algorithms = vec![jsonwebtoken::Algorithm::HS256];
        decode::<AccessClaims>(token, &self.user_dec, &v)
            .map(|d| d.claims)
            .map_err(|_| AppError::TokenExpired)
    }

    pub fn sign_mfa_pending(&self, user_id: Uuid, email: &str, ttl: Duration) -> anyhow::Result<String> {
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
        let mut v = Validation::default();
        v.algorithms = vec![jsonwebtoken::Algorithm::HS256];
        decode::<MfaPendingClaims>(token, &self.mfa_dec, &v)
            .map(|d| d.claims)
            .map_err(|_| AppError::Unauthorized("Authentication failed.".into()))
    }

    pub fn sign_oauth_pending(
        &self,
        user_id: Uuid,
        email: &str,
        provider: &str,
        ttl: Duration,
    ) -> anyhow::Result<String> {
        let claims = OAuthPendingClaims {
            sub: user_id.to_string(),
            email: email.to_string(),
            provider: provider.to_string(),
            purpose: "oauth_pending".into(),
            iat: now_secs(),
            exp: exp_secs(ttl),
        };
        encode(&Header::default(), &claims, &self.oauth_enc)
            .context("Failed to sign OAuth pending token")
    }

    pub fn verify_oauth_pending(&self, token: &str) -> Result<OAuthPendingClaims, AppError> {
        let mut v = Validation::default();
        v.algorithms = vec![jsonwebtoken::Algorithm::HS256];
        decode::<OAuthPendingClaims>(token, &self.oauth_dec, &v)
            .map(|d| d.claims)
            .map_err(|_| AppError::Unauthorized("Authentication failed.".into()))
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
        let mut v = Validation::default();
        v.algorithms = vec![jsonwebtoken::Algorithm::HS256];
        decode::<PasswordResetClaims>(token, &self.reset_dec, &v)
            .map(|d| d.claims)
            .map_err(|_| AppError::BadRequest("Invalid or expired reset token.".into()))
    }
}
