use crate::{
    access_control,
    auth::{
        cookies::*,
        dto::*,
        email_code::{self, Issuance},
        email_verification::{self, SignUp},
        password_attempts, security_notice,
        session_context::is_superadmin,
        sign_in_methods::{SignInMethod, SignInMethods},
        token::{IssueTokenParams, SessionOrigin, TokenService, *},
    },
    common::{
        age,
        csrf::generate_csrf_token,
        email::{EmailService, SecurityEvent},
        jwt::JwtService,
        locale::Locale,
        password::{hash_password, validate_password_strength, verify_password},
        role::Role,
    },
    config::{Config, MFA_PENDING_TTL, PASSWORD_RESET_TTL},
    error::{AppError, AppResult, AuthFailure},
    mfa::{
        recovery_codes::RecoveryCodeHasher,
        second_factor::{self, CodeCheck, SecondFactorKeys, SecondFactorProof, Verified},
    },
    reauth::service::confirm_password,
    state::AppState,
};
use axum_extra::extract::cookie::CookieJar;
use chrono::Utc;
use serde_json::json;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

const DUMMY_PASSWORD_HASH: &str = "$argon2id$v=19$m=19456,t=2,p=1$ptEx1UyXW3Vbni4hpQoKFA$CEEsGfXo9ruOgOAeAN4ZGpLiQK8gS+st5w9rVUimJlA";

struct PasswordlessAccount {
    email: String,
    locale: Locale,
}

/// Which second factor completed a sign-in, as the activity log records it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SecondFactorKind {
    AuthenticatorApp,
    RecoveryCode,
    Passkey,
}

impl SecondFactorKind {
    const fn as_str(self) -> &'static str {
        match self {
            Self::AuthenticatorApp => "authenticator_app",
            Self::RecoveryCode => "recovery_code",
            Self::Passkey => "passkey",
        }
    }
}

pub struct AuthService {
    db: PgPool,
    tokens: TokenService,
    email: EmailService,
    jwt: JwtService,
    config: std::sync::Arc<Config>,
    enc: crate::common::encryption::EncryptionService,
    recovery_codes: RecoveryCodeHasher,
}

impl AuthService {
    pub fn from_state(state: &AppState) -> Self {
        Self {
            db: state.db.clone(),
            tokens: TokenService::from_state(state),
            email: state.email.clone(),
            jwt: state.jwt.clone(),
            config: state.config.clone(),
            enc: state.encryption.clone(),
            recovery_codes: state.recovery_codes.clone(),
        }
    }

    async fn issue_session(
        &self,
        user_id: Uuid,
        email: &str,
        user_agent: Option<&str>,
        ip: Option<&str>,
    ) -> AppResult<(CookieJar, String)> {
        let opts = self.config.base_cookie_options();

        let issued = self
            .tokens
            .issue_pair(IssueTokenParams {
                user_id,
                email,
                user_agent,
                ip_address: ip,
                origin: SessionOrigin::SignIn,
            })
            .await?;

        let csrf = generate_csrf_token();

        let jar = CookieJar::new()
            .add(access_cookie(issued.access_token, &opts))
            .add(refresh_cookie(issued.refresh_token, &opts))
            .add(crate::common::csrf::csrf_cookie(&csrf, &opts));

        Ok((jar, csrf))
    }

    async fn equalize_login_timing(&self, password: String) {
        let _ = verify_password(password, DUMMY_PASSWORD_HASH.to_string()).await;
    }

    /// No account has the address. Whoever signed up with it and entered the
    /// same password is told to confirm it first; anyone else learns nothing.
    /// Only the latest sign-up is checked, so this costs one hash like any
    /// other failed sign-in.
    async fn reject_unknown_sign_in(&self, email: &str, password: String) -> AppError {
        let pending = match email_verification::latest_password_hash(&self.db, email).await {
            Ok(pending) => pending,
            Err(e) => return e,
        };

        let Some(hash) = pending else {
            self.equalize_login_timing(password).await;
            return AuthFailure::InvalidCredentials.into();
        };

        match verify_password(password, hash).await {
            Ok(true) => AuthFailure::EmailNotVerified.into(),
            Ok(false) => AuthFailure::InvalidCredentials.into(),
            Err(e) => e,
        }
    }

    pub async fn login(
        &self,
        dto: LoginDto,
        user_agent: Option<&str>,
        ip: Option<&str>,
    ) -> AppResult<LoginResult> {
        let email = dto.email.to_lowercase();

        access_control::ensure_email_admitted(&self.db, &email).await?;

        let user = sqlx::query!(
            r#"
            SELECT id, email, password_hash,
                   mfa_enabled AND mfa_secret IS NOT NULL AS "mfa_required!"
            FROM users WHERE email = $1
            "#,
            email
        )
        .fetch_optional(&self.db)
        .await?;

        let Some(user) = user else {
            return Err(self.reject_unknown_sign_in(&email, dto.password).await);
        };

        let Some(hash) = user.password_hash else {
            self.equalize_login_timing(dto.password).await;
            return Err(AuthFailure::InvalidCredentials.into());
        };

        let attempt = password_attempts::reserve(&self.db, user.id).await?;

        if !verify_password(dto.password, hash).await? {
            return Err(attempt.reject(&self.db, ip).await);
        }
        attempt.accept(&self.db).await?;

        let client = ClientInfo { user_agent, ip };

        self.complete_sign_in(user.id, &user.email, user.mfa_required, client)
            .await
    }

    /// The one gate every sign-in passes once its first factor (password or
    /// Google) is verified, so no entry point can skip the ban check or the
    /// second factor.
    pub async fn complete_sign_in(
        &self,
        user_id: Uuid,
        email: &str,
        mfa_required: bool,
        client: ClientInfo<'_>,
    ) -> AppResult<LoginResult> {
        let banned = sqlx::query_scalar!(
            r#"SELECT EXISTS (SELECT 1 FROM banned_users WHERE user_id = $1) AS "banned!""#,
            user_id
        )
        .fetch_one(&self.db)
        .await?;

        if banned {
            return Err(AppError::Forbidden(
                "Your account has been suspended.".into(),
            ));
        }

        // Starting a session refuses it as well; checking here spares the
        // user a second factor that could not get them in.
        access_control::ensure_admitted(&self.db, user_id).await?;

        if mfa_required {
            let mfa_token = self
                .jwt
                .sign_mfa_pending(user_id, email, MFA_PENDING_TTL)
                .map_err(|e| AppError::internal(e.to_string()))?;

            let opts = self.config.base_cookie_options();

            return Ok(LoginResult::MfaRequired(
                CookieJar::new().add(mfa_pending_cookie(mfa_token, &opts)),
            ));
        }

        self.start_session(user_id, email, client)
            .await
            .map(LoginResult::Success)
    }

    /// Signs in an account that owes no second factor.
    async fn start_session(
        &self,
        user_id: Uuid,
        email: &str,
        client: ClientInfo<'_>,
    ) -> AppResult<CookieJar> {
        sqlx::query!(
            r#"UPDATE users SET last_login_at = now() WHERE id = $1"#,
            user_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"DELETE FROM mfa_pending_secrets WHERE user_id = $1"#,
            user_id
        )
        .execute(&self.db)
        .await?;

        let (jar, _csrf) = self
            .issue_session(user_id, email, client.user_agent, client.ip)
            .await?;

        Ok(jar)
    }

    /// Finishes a sign-in with the second factor. Returns how many recovery
    /// codes are left when one was used, so the client can warn early.
    pub async fn verify_mfa(
        &self,
        proof: &SecondFactorProof,
        user_id: Uuid,
        email: &str,
        user_agent: Option<&str>,
        ip: Option<&str>,
    ) -> AppResult<(CookieJar, Option<usize>)> {
        let check =
            second_factor::check(&self.db, self.second_factor_keys(), user_id, proof).await?;
        let CodeCheck::Accepted(verified) = check else {
            return Err(AuthFailure::InvalidSecondFactor.into());
        };

        let kind = match verified {
            Verified::AuthenticatorApp => SecondFactorKind::AuthenticatorApp,
            Verified::RecoveryCode { .. } => SecondFactorKind::RecoveryCode,
        };
        let client = ClientInfo { user_agent, ip };
        let jar = self
            .finish_two_factor_sign_in(user_id, email, kind, client)
            .await?;

        let recovery_codes_left = match verified {
            Verified::AuthenticatorApp => None,
            Verified::RecoveryCode { remaining } => Some(remaining),
        };
        if let Some(event) = verified.security_event() {
            security_notice::notify(&self.db, &self.email, user_id, event);
        }

        Ok((jar, recovery_codes_left))
    }

    /// Issues the session for a sign-in whose second factor, of any kind, has
    /// just been verified, and drops the pending challenge.
    pub async fn finish_two_factor_sign_in(
        &self,
        user_id: Uuid,
        email: &str,
        kind: SecondFactorKind,
        client: ClientInfo<'_>,
    ) -> AppResult<CookieJar> {
        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'auth:mfa_login', $2)"#,
            user_id,
            json!({ "factor": kind.as_str(), "ip": client.ip })
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"UPDATE users SET last_login_at = now() WHERE id = $1"#,
            user_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"DELETE FROM mfa_pending_secrets WHERE user_id = $1"#,
            user_id
        )
        .execute(&self.db)
        .await?;

        let opts = self.config.base_cookie_options();
        let (jar, _csrf) = self
            .issue_session(user_id, email, client.user_agent, client.ip)
            .await?;

        Ok(jar.add(clear_mfa_pending_cookie(&opts)))
    }

    fn second_factor_keys(&self) -> SecondFactorKeys<'_> {
        SecondFactorKeys {
            encryption: &self.enc,
            recovery_codes: &self.recovery_codes,
        }
    }

    /// Stores the sign-up and mails its confirmation link. The account is
    /// only created once the link is opened with this password (see
    /// [`email_verification`]), so signing up again, by anyone, leaves every
    /// earlier sign-up for the address as it was.
    pub async fn register(&self, dto: RegisterDto) -> AppResult<serde_json::Value> {
        access_control::ensure_registration_open(&self.db).await?;
        validate_password_strength(&dto.password).map_err(|e| AppError::BadRequest(e.into()))?;
        let age = age::declare(dto.birth_year, dto.guardian_consent, Utc::now())?;

        let email = dto.email.to_lowercase();
        let locale = dto.preferences.language;
        let sign_up = SignUp {
            age,
            password_hash: hash_password(dto.password).await?,
            preferences: json!(dto.preferences),
        };

        let mut tx = self.db.begin().await?;
        email_code::lock_address(&mut tx, &email).await?;

        let registered = sqlx::query_scalar!(
            r#"SELECT EXISTS (SELECT 1 FROM users WHERE email = $1) AS "registered!""#,
            email
        )
        .fetch_one(&mut *tx)
        .await?;

        if registered {
            return Err(AuthFailure::EmailAlreadyRegistered.into());
        }

        let token = match email_verification::issue(&mut tx, &email, &sign_up).await? {
            Issuance::Issued(token) => token,
            Issuance::Throttled { retry_after } => {
                return Err(AppError::EmailCodeThrottled { retry_after });
            }
        };

        tx.commit().await?;

        let message = match self.send_verification(&email, locale, &token).await {
            Ok(()) => "Registration successful. Please check your inbox and spam folder.",
            Err(_) => "Registration successful but the confirmation email could not be sent.",
        };

        Ok(json!({ "ok": true, "message": message }))
    }

    /// Mails a new link for the latest sign-up of the address. The answer is
    /// the same whether or not one was sent, so it reveals nothing about it.
    pub async fn resend_verification(&self, email: &str) -> AppResult<serde_json::Value> {
        access_control::ensure_registration_open(&self.db).await?;
        let email = email.to_lowercase();

        let mut tx = self.db.begin().await?;
        email_code::lock_address(&mut tx, &email).await?;

        if let Some(link) = email_verification::reissue_latest(&mut tx, &email).await? {
            tx.commit().await?;
            let locale = Locale::from_stored(link.language.as_deref());
            if let Err(e) = self.send_verification(&email, locale, &link.token).await {
                tracing::warn!("Confirmation email not resent: {e}");
            }
        }

        Ok(json!({
            "ok": true,
            "message": "If the account is waiting for confirmation, a new link has been sent."
        }))
    }

    async fn send_verification(&self, email: &str, locale: Locale, token: &str) -> AppResult<()> {
        let verify_url = format!("{}?token={}", self.config.client_verify_url, token);
        self.email
            .send_verification_email(email, locale, &verify_url)
            .await
    }

    pub async fn get_me(&self, user_id: Uuid) -> AppResult<serde_json::Value> {
        let user = sqlx::query!(
            r#"
            SELECT id, email, mfa_enabled, personalized, preferences,
                   password_hash IS NOT NULL AS "has_password!"
            FROM users WHERE id = $1
            "#,
            user_id
        )
        .fetch_optional(&self.db)
        .await?;

        let user = match user {
            None => return Ok(json!({ "authenticated": false })),
            Some(u) => u,
        };

        let global_role = if is_superadmin(&self.db, user_id).await? {
            Role::Superadmin
        } else {
            Role::User
        };

        let courses = sqlx::query!(
            r#"SELECT subject_id, course_id FROM user_courses WHERE user_id = $1"#,
            user_id
        )
        .fetch_all(&self.db)
        .await?
        .into_iter()
        .map(|r| json!({ "subjectId": r.subject_id, "courseId": r.course_id }))
        .collect::<Vec<_>>();

        let pseudonym = crate::common::name_generator::generate_user_name(&user.id.to_string());

        Ok(json!({
            "authenticated": true,
            "id": user.id,
            "email": user.email,
            "role": global_role.as_str(),
            "courses": courses,
            "personalized": user.personalized,
            "mfaEnabled": user.mfa_enabled,
            "hasPassword": user.has_password,
            "preferences": user.preferences,
            "username": pseudonym,
        }))
    }

    pub async fn delete_me(&self, user_id: Uuid) -> AppResult<CookieJar> {
        let roles = sqlx::query!(
            r#"
            SELECT r.name FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = $1
            "#,
            user_id
        )
        .fetch_all(&self.db)
        .await?;

        if roles.iter().any(|r| r.name == "superadmin") {
            return Err(AppError::Forbidden(
                "Admin accounts cannot be deleted.".into(),
            ));
        }

        let owned = sqlx::query!(
            r#"SELECT id FROM groups WHERE owner_id = $1 LIMIT 1"#,
            user_id
        )
        .fetch_optional(&self.db)
        .await?;

        if owned.is_some() {
            return Err(AppError::BadRequest(
                "You own at least one group. Transfer or delete the group before deleting your account.".into(),
            ));
        }

        self.tokens
            .revoke_all_for_user(user_id, ACCOUNT_DELETED, None)
            .await?;

        sqlx::query!(r#"DELETE FROM users WHERE id = $1"#, user_id)
            .execute(&self.db)
            .await?;

        let opts = self.config.base_cookie_options();

        let jar = CookieJar::new()
            .add(clear_access_cookie(&opts))
            .add(clear_refresh_cookie(&opts))
            .add(clear_mfa_pending_cookie(&opts));

        Ok(jar)
    }

    /// Creates the account of a sign-up from its link and the password it
    /// chose, and signs the new account in. Paused sign-ups hold back links
    /// mailed before the pause as well; those still unexpired work once it
    /// ends.
    pub async fn confirm_sign_up(
        &self,
        token: &str,
        password: String,
        client: ClientInfo<'_>,
    ) -> AppResult<CookieJar> {
        access_control::ensure_registration_open(&self.db).await?;
        let invalid_link = || AppError::bad_request("Invalid verification token.");

        let pending = email_verification::find(&self.db, token)
            .await?
            .ok_or_else(invalid_link)?;

        if pending.expires_at < Utc::now() {
            return Err(AppError::bad_request("Verification token has expired."));
        }

        if !verify_password(password, pending.sign_up.password_hash.clone()).await? {
            return Err(AuthFailure::IncorrectPassword.into());
        }

        let mut tx = self.db.begin().await?;
        email_code::lock_address(&mut tx, &pending.email).await?;

        if !email_verification::settle(&mut tx, &pending.email, token).await? {
            return Err(invalid_link());
        }

        let age = pending.sign_up.age;
        let user_id = sqlx::query_scalar!(
            r#"INSERT INTO users (email, password_hash, preferences, birth_year, guardian_consent_at)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id"#,
            pending.email,
            pending.sign_up.password_hash,
            pending.sign_up.preferences,
            age.birth_year,
            age.guardian_consent_at,
        )
        .fetch_one(&mut *tx)
        .await
        // A Google sign-up for the address may have come first.
        .map_err(|e| match e.as_database_error() {
            Some(db) if db.is_unique_violation() => {
                AppError::from(AuthFailure::EmailAlreadyRegistered)
            }
            _ => AppError::Database(e),
        })?;

        tx.commit().await?;

        // A new account has no second factor and cannot have been banned yet.
        self.start_session(user_id, &pending.email, client).await
    }

    pub async fn forgot_password(&self, email: &str) -> AppResult<serde_json::Value> {
        let email = email.to_lowercase();

        let user = sqlx::query!(
            r#"SELECT preferences->>'language' AS language FROM users WHERE email = $1"#,
            email
        )
        .fetch_optional(&self.db)
        .await?;

        // A throttled address gets the same answer as any other: a different
        // one would reveal that it has an account.
        if let Some(user) = user
            && let Issuance::Issued(code) = email_code::issue(&self.db, &email).await?
        {
            let locale = Locale::from_stored(user.language.as_deref());
            let _ = self
                .email
                .send_password_reset_email(&email, locale, &code)
                .await;
        }

        Ok(json!({
            "ok": true,
            "message": "If the email exists, a recovery email has been sent."
        }))
    }

    pub async fn verify_reset_token(
        &self,
        email: &str,
        code: &str,
    ) -> AppResult<serde_json::Value> {
        let email = email.to_lowercase();

        email_code::redeem(&self.db, &email, code).await?;

        let current_hash =
            sqlx::query_scalar!(r#"SELECT password_hash FROM users WHERE email = $1"#, email)
                .fetch_optional(&self.db)
                .await?
                .ok_or_else(|| AppError::BadRequest("Invalid code.".into()))?;

        let reset_token = self
            .jwt
            .sign_password_reset(
                &email,
                password_fingerprint(current_hash.as_deref()),
                PASSWORD_RESET_TTL,
            )
            .map_err(|e| AppError::internal(e.to_string()))?;

        Ok(json!({ "ok": true, "resetToken": reset_token }))
    }

    pub async fn request_password_setup_code(&self, user_id: Uuid) -> AppResult<serde_json::Value> {
        let account = self.passwordless_account(user_id).await?;

        let code = match email_code::issue(&self.db, &account.email).await? {
            Issuance::Issued(code) => code,
            Issuance::Throttled { retry_after } => {
                return Err(AppError::EmailCodeThrottled { retry_after });
            }
        };

        self.email
            .send_password_setup_email(&account.email, account.locale, &code)
            .await?;

        Ok(json!({ "ok": true }))
    }

    /// Unlike a reset this leaves MFA untouched and signs the caller straight
    /// back in: they are already authenticated, and the email code proves
    /// the same as a reset would.
    pub async fn set_initial_password(
        &self,
        user_id: Uuid,
        code: &str,
        new_password: String,
        user_agent: Option<&str>,
        ip: Option<&str>,
    ) -> AppResult<(CookieJar, serde_json::Value)> {
        validate_password_strength(&new_password).map_err(|e| AppError::BadRequest(e.into()))?;

        let email = self.passwordless_account(user_id).await?.email;

        email_code::redeem(&self.db, &email, code).await?;

        let hash = hash_password(new_password).await?;

        // The IS NULL guard keeps a concurrent request from overwriting a
        // password that was set in the meantime.
        let updated = sqlx::query!(
            r#"UPDATE users
               SET password_hash = $1, password_failed_attempts = 0, password_locked_until = NULL
               WHERE id = $2 AND password_hash IS NULL"#,
            hash,
            user_id
        )
        .execute(&self.db)
        .await?
        .rows_affected();

        if updated == 0 {
            return Err(AppError::bad_request(
                "Your account already has a password.",
            ));
        }

        self.tokens
            .revoke_all_for_user(user_id, PASSWORD_CHANGE, None)
            .await?;

        let (jar, _) = self.issue_session(user_id, &email, user_agent, ip).await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'account:password_set', $2)"#,
            user_id,
            json!({ "by": "self" })
        )
        .execute(&self.db)
        .await?;

        security_notice::notify(&self.db, &self.email, user_id, SecurityEvent::PasswordSet);

        Ok((jar, json!({ "ok": true })))
    }

    async fn passwordless_account(&self, user_id: Uuid) -> AppResult<PasswordlessAccount> {
        let user = sqlx::query!(
            r#"SELECT email, password_hash IS NOT NULL AS "has_password!",
                      preferences->>'language' AS language
               FROM users WHERE id = $1"#,
            user_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("User not found."))?;

        if user.has_password {
            return Err(AppError::bad_request(
                "Your account already has a password.",
            ));
        }

        Ok(PasswordlessAccount {
            email: user.email,
            locale: Locale::from_stored(user.language.as_deref()),
        })
    }

    /// Sets a new password with a token from [`Self::verify_reset_token`].
    ///
    /// A reset proves control of the mailbox and nothing more, so it replaces
    /// only the password: two-factor authentication and passkeys stay, and an
    /// account with a second factor still needs it to sign in afterwards.
    /// Every session ends.
    pub async fn reset_password(
        &self,
        reset_token: &str,
        password: &str,
    ) -> AppResult<serde_json::Value> {
        validate_password_strength(password).map_err(|e| AppError::BadRequest(e.into()))?;

        let claims = self.jwt.verify_password_reset(reset_token)?;
        let invalid_token = || AppError::BadRequest("Invalid or expired reset token.".into());

        if claims.purpose != "password_reset" {
            return Err(invalid_token());
        }

        let email = claims.email.to_lowercase();

        let user = sqlx::query!(
            r#"SELECT id, password_hash FROM users WHERE email = $1"#,
            email
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(invalid_token)?;

        if password_fingerprint(user.password_hash.as_deref()) != claims.password_fingerprint {
            return Err(invalid_token());
        }

        let hash = hash_password(password.to_string()).await?;

        // Compared with the password the token was issued for, so of two
        // concurrent resets with one token only the first succeeds. A reset
        // proves the mailbox, so it also lifts a lock that guesses at the old
        // password started.
        let updated = sqlx::query!(
            r#"UPDATE users
               SET password_hash = $1, password_failed_attempts = 0, password_locked_until = NULL
               WHERE id = $2 AND password_hash IS NOT DISTINCT FROM $3"#,
            hash,
            user.id,
            user.password_hash
        )
        .execute(&self.db)
        .await?
        .rows_affected();

        if updated == 0 {
            return Err(invalid_token());
        }

        self.tokens
            .revoke_all_for_user(user.id, PASSWORD_CHANGE, None)
            .await?;

        sqlx::query!(
            r#"
            INSERT INTO user_activity (user_id, type, meta)
            VALUES ($1, 'account:password_reset', $2)
            "#,
            user.id,
            json!({ "by": "self" })
        )
        .execute(&self.db)
        .await?;

        security_notice::notify(&self.db, &self.email, user.id, SecurityEvent::PasswordReset);

        Ok(json!({ "ok": true, "message": "Password reset successfully." }))
    }

    /// Leaves the account to its passkeys and Google. Every other session
    /// ends, as after any password change.
    pub async fn remove_password(
        &self,
        user_id: Uuid,
        session_id: Uuid,
    ) -> AppResult<serde_json::Value> {
        let mut tx = self.db.begin().await?;

        let methods = SignInMethods::lock(&mut tx, user_id).await?;
        if !methods.password {
            return Err(AppError::bad_request("Your account has no password."));
        }
        methods.ensure_one_left_without(SignInMethod::Password)?;

        sqlx::query!(
            r#"UPDATE users
               SET password_hash = NULL, reauth_failed_attempts = 0, reauth_locked_until = NULL,
                   password_failed_attempts = 0, password_locked_until = NULL
               WHERE id = $1"#,
            user_id
        )
        .execute(&mut *tx)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'account:password_removed', $2)"#,
            user_id,
            json!({ "by": "self" })
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        self.tokens
            .revoke_all_for_user(user_id, PASSWORD_CHANGE, Some(session_id))
            .await?;
        security_notice::notify(
            &self.db,
            &self.email,
            user_id,
            SecurityEvent::PasswordRemoved,
        );

        Ok(json!({ "ok": true }))
    }

    /// The current password is checked like a confirmation of the signed-in
    /// user, under its per-account limit: the session alone must not allow
    /// guessing it.
    pub async fn change_password(
        &self,
        user_id: Uuid,
        current_password: String,
        new_password: String,
        user_agent: Option<&str>,
        ip: Option<&str>,
    ) -> AppResult<(CookieJar, serde_json::Value)> {
        validate_password_strength(&new_password).map_err(|e| AppError::BadRequest(e.into()))?;

        let user = sqlx::query!(
            r#"SELECT email, password_hash IS NOT NULL AS "has_password!" FROM users WHERE id = $1"#,
            user_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or(AppError::TokenExpired)?;

        if !user.has_password {
            return Err(AppError::bad_request("Your account has no password yet."));
        }

        confirm_password(&self.db, user_id, current_password).await?;

        let hash = hash_password(new_password).await?;

        sqlx::query!(
            r#"UPDATE users
               SET password_hash = $1, password_failed_attempts = 0, password_locked_until = NULL
               WHERE id = $2"#,
            hash,
            user_id
        )
        .execute(&self.db)
        .await?;

        self.tokens
            .revoke_all_for_user(user_id, PASSWORD_CHANGE, None)
            .await?;

        let (jar, _) = self
            .issue_session(user_id, &user.email, user_agent, ip)
            .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'account:password_change', $2)"#,
            user_id,
            json!({ "by": "self" })
        )
            .execute(&self.db)
            .await?;

        security_notice::notify(
            &self.db,
            &self.email,
            user_id,
            SecurityEvent::PasswordChanged,
        );

        Ok((
            jar,
            json!({ "ok": true, "message": "Password changed successfully." }),
        ))
    }

    pub async fn get_groups(&self, user_id: Uuid) -> AppResult<serde_json::Value> {
        let rows = sqlx::query!(
            r#"
            SELECT
                g.id, g.name, g.owner_id, g.schedule_config,
                r.name as role_name
            FROM user_roles ur
            JOIN groups g ON g.id = ur.tenant_id
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = $1 AND ur.tenant_id IS NOT NULL
            "#,
            user_id
        )
        .fetch_all(&self.db)
        .await?;

        let groups = rows
            .into_iter()
            .map(|r| {
                json!({
                    "id": r.id,
                    "name": r.name,
                    "ownerId": r.owner_id,
                    "role": r.role_name,
                    "scheduleConfig": r.schedule_config,
                })
            })
            .collect::<Vec<_>>();

        Ok(json!({ "groups": groups }))
    }
}

/// Recorded with the session, so the session list can name the device.
#[derive(Clone, Copy)]
pub struct ClientInfo<'a> {
    pub user_agent: Option<&'a str>,
    pub ip: Option<&'a str>,
}

pub enum LoginResult {
    Success(CookieJar),
    MfaRequired(CookieJar),
}

/// Identifies the password a reset token replaces without exposing it: once
/// the password changes, the fingerprint and with it the token stop matching.
fn password_fingerprint(password_hash: Option<&str>) -> String {
    hex::encode(
        Sha256::new()
            .chain_update(b"password-reset\0")
            .chain_update(password_hash.unwrap_or_default())
            .finalize(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_fingerprint_changes_with_the_password() {
        let first = password_fingerprint(Some("$argon2id$first"));

        assert_eq!(first, password_fingerprint(Some("$argon2id$first")));
        assert_ne!(first, password_fingerprint(Some("$argon2id$second")));
        assert_ne!(first, password_fingerprint(None));
    }
}
