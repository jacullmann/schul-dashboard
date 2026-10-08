use crate::{config::Config, error::AppError};
use anyhow::Context;
use chrono::{DateTime, Utc};
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

/// Tokens issued before a claim existed fail to decode, which makes the client
/// refresh into a token that carries it.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AccessClaims {
    pub sub: Uuid,
    pub email: String,
    /// The session (refresh token family) the token was issued for.
    pub sid: Uuid,
    /// When the user last proved who they are in this session (OIDC
    /// `auth_time`), in Unix seconds.
    pub auth_time: i64,
    pub iat: u64,
    pub exp: u64,
}

impl AccessClaims {
    pub fn new(
        user_id: Uuid,
        email: String,
        session_id: Uuid,
        authenticated_at: DateTime<Utc>,
        ttl: Duration,
    ) -> Self {
        let now = now_secs();

        Self {
            sub: user_id,
            email,
            sid: session_id,
            auth_time: authenticated_at.timestamp(),
            iat: now,
            exp: now + ttl.as_secs(),
        }
    }

    pub fn authenticated_at(&self) -> DateTime<Utc> {
        DateTime::from_timestamp(self.auth_time, 0).unwrap_or(DateTime::UNIX_EPOCH)
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
    /// Fingerprint of the password the reset replaces. Once it is replaced the
    /// fingerprint no longer matches, which makes the token single-use.
    pub password_fingerprint: String,
    pub purpose: String,
    pub iat: u64,
    pub exp: u64,
}

/// Issued when a sensitive action was confirmed with Google and the account
/// still owes its second factor. It names the session it was issued for, so it
/// cannot complete a confirmation in any other one.
#[derive(Debug, Serialize, Deserialize)]
pub struct ReauthPendingClaims {
    pub sub: Uuid,
    pub sid: Uuid,
    pub purpose: String,
    pub iat: u64,
    pub exp: u64,
}

const REAUTH_PENDING_PURPOSE: &str = "reauth_second_factor";

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

    pub fn sign_password_reset(
        &self,
        email: &str,
        password_fingerprint: String,
        ttl: Duration,
    ) -> anyhow::Result<String> {
        let claims = PasswordResetClaims {
            email: email.to_string(),
            password_fingerprint,
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

    /// Signed with the second-factor key: both tokens stand for "first factor
    /// passed, second one outstanding", and the purpose keeps them apart.
    pub fn sign_reauth_pending(
        &self,
        user_id: Uuid,
        session_id: Uuid,
        ttl: Duration,
    ) -> anyhow::Result<String> {
        let claims = ReauthPendingClaims {
            sub: user_id,
            sid: session_id,
            purpose: REAUTH_PENDING_PURPOSE.into(),
            iat: now_secs(),
            exp: exp_secs(ttl),
        };

        encode(&Header::default(), &claims, &self.mfa_enc)
            .context("Failed to sign reauth pending token")
    }

    /// The pending confirmation, if `token` was issued for this user's session.
    pub fn verify_reauth_pending(
        &self,
        token: &str,
        user_id: Uuid,
        session_id: Uuid,
    ) -> Option<ReauthPendingClaims> {
        let mut validation = hs256_validation();
        validation.leeway = 0;

        decode::<ReauthPendingClaims>(token, &self.mfa_dec, &validation)
            .ok()
            .map(|d| d.claims)
            .filter(|claims| {
                claims.purpose == REAUTH_PENDING_PURPOSE
                    && claims.sub == user_id
                    && claims.sid == session_id
            })
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
    fn reauth_pending_token_only_completes_its_own_session() {
        let jwt = service();
        let (user, session) = (Uuid::new_v4(), Uuid::new_v4());
        let token = jwt
            .sign_reauth_pending(user, session, Duration::from_secs(60))
            .unwrap();

        assert!(jwt.verify_reauth_pending(&token, user, session).is_some());
        assert!(
            jwt.verify_reauth_pending(&token, user, Uuid::new_v4())
                .is_none()
        );
        assert!(
            jwt.verify_reauth_pending(&token, Uuid::new_v4(), session)
                .is_none()
        );
    }

    #[test]
    fn mfa_pending_token_is_no_reauth_pending_token() {
        let token = pending_token(now_secs() + 60, MFA_SECRET);

        assert!(
            service()
                .verify_reauth_pending(&token, Uuid::new_v4(), Uuid::new_v4())
                .is_none()
        );
    }

    #[test]
    fn access_claims_keep_when_the_session_was_authenticated() {
        let authenticated_at = DateTime::from_timestamp(1_800_000_000, 0).unwrap();
        let claims = AccessClaims::new(
            Uuid::new_v4(),
            "user@example.com".into(),
            Uuid::new_v4(),
            authenticated_at,
            Duration::from_secs(60),
        );
        let jwt = service();
        let token = jwt.sign_access(&claims).unwrap();

        let decoded = jwt.verify_access(&token).unwrap();
        assert_eq!(decoded.authenticated_at(), authenticated_at);
        assert_eq!(decoded.sid, claims.sid);
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
