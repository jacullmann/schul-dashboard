//! Confirming who the user is before a sensitive action ("sudo mode").
//!
//! A confirmation is as strong as signing in: the password together with the
//! second factor if the account has one, a passkey (which always verifies the
//! user), or Google followed by the second factor. It renews the session's
//! `authenticated_at`, which [`RecentAuth`](crate::common::extractors::RecentAuth)
//! accepts for [`REAUTH_WINDOW`](crate::config::REAUTH_WINDOW).

use super::dto::ReauthStatus;
use crate::{
    auth::{
        cookies::{access_cookie, clear_reauth_pending_cookie, reauth_pending_cookie},
        security_notice,
        sign_in_methods::SignInMethods,
        token::TokenService,
    },
    common::{extractors::AuthUser, lockout, password::verify_password},
    config::{REAUTH_PENDING_TTL, REAUTH_WINDOW, chrono_ttl},
    error::{AppError, AppResult, AuthFailure},
    mfa::second_factor::{self, CodeCheck, SecondFactorProof},
    oauth::service::{OAuthIntent, OAuthService},
    passkeys::service::PasskeyService,
    state::AppState,
};
use axum_extra::extract::CookieJar;
use chrono::Utc;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;
use webauthn_rs::prelude::PublicKeyCredential;
use webauthn_rs_proto::PublicKeyCredentialRequestOptions;

#[derive(Debug, Clone, Copy)]
enum Method {
    Password,
    Passkey,
    Google,
}

impl Method {
    const fn as_str(self) -> &'static str {
        match self {
            Self::Password => "password",
            Self::Passkey => "passkey",
            Self::Google => "google",
        }
    }
}

/// Where a confirmation with Google stands once Google has answered.
pub enum GoogleReauth {
    Confirmed(CookieJar),
    /// The account has a second factor, which the user enters next.
    SecondFactorPending(CookieJar),
}

pub struct ReauthService {
    state: AppState,
    tokens: TokenService,
}

impl ReauthService {
    pub fn from_state(state: &AppState) -> Self {
        Self {
            state: state.clone(),
            tokens: TokenService::from_state(state),
        }
    }

    /// The ways this user can confirm, and until when the last confirmation
    /// still counts.
    pub async fn status(&self, user: &AuthUser) -> AppResult<ReauthStatus> {
        let methods = SignInMethods::load(&self.state.db, user.user_id).await?;
        let recent_until = user.authenticated_at + chrono_ttl(REAUTH_WINDOW);

        Ok(ReauthStatus {
            methods,
            recent_until: (recent_until > Utc::now()).then_some(recent_until),
        })
    }

    pub async fn with_password(
        &self,
        user: &AuthUser,
        password: String,
        second_factor: Option<&SecondFactorProof>,
    ) -> AppResult<CookieJar> {
        confirm_password(&self.state.db, user.user_id, password).await?;

        let methods = SignInMethods::load(&self.state.db, user.user_id).await?;
        if methods.two_factor {
            let proof = second_factor.ok_or(AuthFailure::SecondFactorRequired)?;
            self.check_second_factor(user.user_id, proof).await?;
        }

        self.confirm(user.user_id, &user.email, user.session_id, Method::Password)
            .await
    }

    pub async fn start_passkey(
        &self,
        user: &AuthUser,
    ) -> AppResult<(Uuid, PublicKeyCredentialRequestOptions)> {
        PasskeyService::from_state(&self.state)
            .start_bound_authentication(user.user_id)
            .await
    }

    pub async fn finish_passkey(
        &self,
        user: &AuthUser,
        challenge_id: Uuid,
        credential: &PublicKeyCredential,
    ) -> AppResult<CookieJar> {
        PasskeyService::from_state(&self.state)
            .finish_bound_authentication(user.user_id, challenge_id, credential)
            .await?;

        self.confirm(user.user_id, &user.email, user.session_id, Method::Passkey)
            .await
    }

    /// The Google round trip remembers the user in its signed state, so only
    /// the Google account linked to them can complete it.
    pub async fn start_google(&self, user: &AuthUser) -> AppResult<(String, CookieJar)> {
        let methods = SignInMethods::load(&self.state.db, user.user_id).await?;
        if !methods.google {
            return Err(AppError::bad_request("No Google account is linked."));
        }

        OAuthService::from_state(&self.state).build_google_auth_url(OAuthIntent::Reauth {
            user_id: user.user_id,
        })
    }

    /// Called once Google confirmed `google_subject`. The session comes from
    /// the refresh cookie, as the access token may have expired while the
    /// user was at Google.
    pub async fn after_google(
        &self,
        user_id: Uuid,
        google_subject: &str,
        refresh_token: Option<&str>,
    ) -> AppResult<GoogleReauth> {
        let session_id = match refresh_token {
            Some(token) => self.tokens.get_current_family_id(token).await?,
            None => None,
        }
        .ok_or(AppError::TokenExpired)?;

        let account = sqlx::query!(
            r#"SELECT u.email, u.mfa_enabled AND u.mfa_secret IS NOT NULL AS "two_factor!"
               FROM users u
               JOIN oauth_accounts o ON o.user_id = u.id
               WHERE u.id = $1 AND o.provider = 'google' AND o.provider_user_id = $2"#,
            user_id,
            google_subject
        )
        .fetch_optional(&self.state.db)
        .await?
        .ok_or(AuthFailure::InvalidCredentials)?;

        if !account.two_factor {
            let jar = self
                .confirm(user_id, &account.email, session_id, Method::Google)
                .await?;
            return Ok(GoogleReauth::Confirmed(jar));
        }

        let token = self
            .state
            .jwt
            .sign_reauth_pending(user_id, session_id, REAUTH_PENDING_TTL)
            .map_err(|e| AppError::internal(e.to_string()))?;
        let opts = self.state.config.base_cookie_options();

        Ok(GoogleReauth::SecondFactorPending(
            CookieJar::new().add(reauth_pending_cookie(token, &opts)),
        ))
    }

    /// Completes a confirmation with Google by the account's second factor.
    pub async fn finish_google(
        &self,
        user: &AuthUser,
        pending_token: Option<&str>,
        proof: &SecondFactorProof,
    ) -> AppResult<CookieJar> {
        pending_token
            .and_then(|token| {
                self.state
                    .jwt
                    .verify_reauth_pending(token, user.user_id, user.session_id)
            })
            .ok_or(AppError::ReauthRequired)?;

        self.check_second_factor(user.user_id, proof).await?;

        let opts = self.state.config.base_cookie_options();
        let jar = self
            .confirm(user.user_id, &user.email, user.session_id, Method::Google)
            .await?;

        Ok(jar.add(clear_reauth_pending_cookie(&opts)))
    }

    async fn check_second_factor(&self, user_id: Uuid, proof: &SecondFactorProof) -> AppResult<()> {
        let check = second_factor::check(
            &self.state.db,
            self.state.second_factor_keys(),
            user_id,
            proof,
        )
        .await?;

        let CodeCheck::Accepted(verified) = check else {
            return Err(AuthFailure::InvalidSecondFactor.into());
        };

        if let Some(event) = verified.security_event() {
            security_notice::notify(&self.state.db, &self.state.email, user_id, event);
        }

        Ok(())
    }

    /// Marks the session as just authenticated and hands out an access token
    /// that says so.
    async fn confirm(
        &self,
        user_id: Uuid,
        email: &str,
        session_id: Uuid,
        method: Method,
    ) -> AppResult<CookieJar> {
        let access_token = self
            .tokens
            .confirm_identity(user_id, email, session_id)
            .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'auth:reauth', $2)"#,
            user_id,
            json!({ "method": method.as_str() })
        )
        .execute(&self.state.db)
        .await?;

        let opts = self.state.config.base_cookie_options();
        Ok(CookieJar::new().add(access_cookie(access_token, &opts)))
    }
}

/// Checks the password of a signed-in user who confirms who they are. Wrong
/// passwords count per account under the same growing lock as second-factor
/// codes, so a stolen session cannot guess the password at the per-IP rate.
/// The row lock keeps parallel guesses from all slipping in before the counter
/// rises; holding it while hashing is fine here, as only a session can get
/// this far.
pub async fn confirm_password(db: &PgPool, user_id: Uuid, password: String) -> AppResult<()> {
    let mut tx = db.begin().await?;

    let user = sqlx::query!(
        r#"SELECT password_hash, reauth_failed_attempts, reauth_locked_until
           FROM users WHERE id = $1 FOR UPDATE"#,
        user_id
    )
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::TokenExpired)?;

    let now = Utc::now();
    let counter = lockout::Counter {
        misses: user.reauth_failed_attempts,
        locked_until: user.reauth_locked_until,
    };
    if let Some(retry_after) = counter.locked_for(now) {
        return Err(AppError::ReauthLocked { retry_after });
    }

    let Some(hash) = user.password_hash else {
        return Err(AuthFailure::IncorrectPassword.into());
    };

    if verify_password(password, hash).await? {
        sqlx::query!(
            r#"UPDATE users SET reauth_failed_attempts = 0, reauth_locked_until = NULL
               WHERE id = $1"#,
            user_id
        )
        .execute(&mut *tx)
        .await?;
        tx.commit().await?;
        return Ok(());
    }

    let counter = counter.after_miss(now);
    let lock = counter.locked_for(now);

    sqlx::query!(
        r#"UPDATE users SET reauth_failed_attempts = $2, reauth_locked_until = $3 WHERE id = $1"#,
        user_id,
        counter.misses,
        counter.locked_until
    )
    .execute(&mut *tx)
    .await?;

    if let Some(lock) = lock {
        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'auth:reauth:locked', $2)"#,
            user_id,
            json!({ "consecutiveMisses": counter.misses, "lockedForSecs": lock.num_seconds() })
        )
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    Err(match lock {
        Some(retry_after) => AppError::ReauthLocked { retry_after },
        None => AuthFailure::IncorrectPassword.into(),
    })
}
