use crate::{
    auth::{
        cookies::*,
        dto::*,
        session_context::is_superadmin,
        token::{TokenService, *},
    },
    common::{
        csrf::generate_csrf_token,
        email::EmailService,
        jwt::JwtService,
        locale::Locale,
        password::{hash_password, validate_password_strength, verify_password},
        role::Role,
    },
    config::{
        Config, EMAIL_VERIFY_TTL, MFA_PENDING_TTL, PASSWORD_RESET_CODE_TTL, PASSWORD_RESET_TTL,
        chrono_ttl,
    },
    error::{AppError, AppResult},
    mfa::{
        second_factor::{self, CodeCheck},
        service::disable_mfa,
    },
    state::AppState,
};
use axum_extra::extract::cookie::CookieJar;
use chrono::Utc;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

fn constant_time_str_eq(a: &str, b: &str) -> bool {
    use sha2::{Digest, Sha256};
    Sha256::digest(a.as_bytes()) == Sha256::digest(b.as_bytes())
}

const DUMMY_PASSWORD_HASH: &str = "$argon2id$v=19$m=19456,t=2,p=1$ptEx1UyXW3Vbni4hpQoKFA$CEEsGfXo9ruOgOAeAN4ZGpLiQK8gS+st5w9rVUimJlA";

struct PasswordlessAccount {
    email: String,
    locale: Locale,
}

pub struct AuthService {
    db: PgPool,
    tokens: TokenService,
    email: EmailService,
    jwt: JwtService,
    config: std::sync::Arc<Config>,
    enc: crate::common::encryption::EncryptionService,
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
            .issue_pair(crate::auth::token::IssueTokenParams {
                user_id,
                email,
                user_agent,
                ip_address: ip,
                parent: None,
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

    pub async fn login(
        &self,
        dto: LoginDto,
        user_agent: Option<&str>,
        ip: Option<&str>,
    ) -> AppResult<LoginResult> {
        let email = dto.email.to_lowercase();

        let user = sqlx::query!(
            r#"
            SELECT id, email, password_hash, email_verified,
                   mfa_enabled AND mfa_secret IS NOT NULL AS "mfa_required!"
            FROM users WHERE email = $1
            "#,
            email
        )
        .fetch_optional(&self.db)
        .await?;

        let Some(user) = user else {
            self.equalize_login_timing(dto.password).await;
            return Err(AppError::Unauthorized("Invalid credentials.".into()));
        };

        let hash = match user.password_hash.as_deref() {
            Some(h) if !h.is_empty() => h.to_string(),
            _ => {
                self.equalize_login_timing(dto.password).await;
                return Err(AppError::Unauthorized("Invalid credentials.".into()));
            }
        };

        let ok = verify_password(dto.password, hash).await?;

        if !ok {
            sqlx::query!(
                r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'auth:login_failed', $2)"#,
                user.id,
                json!({ "ip": ip, "reason": "bad_password" })
            )
                .execute(&self.db)
                .await?;
            return Err(AppError::Unauthorized("Invalid credentials.".into()));
        }

        if !user.email_verified {
            return Err(AppError::Unauthorized(
                "Please verify your email address first.".into(),
            ));
        }

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

        Ok(LoginResult::Success(jar))
    }

    pub async fn verify_mfa(
        &self,
        code: &str,
        user_id: Uuid,
        email: &str,
        user_agent: Option<&str>,
        ip: Option<&str>,
    ) -> AppResult<CookieJar> {
        if second_factor::check_code(&self.db, &self.enc, user_id, code).await?
            == CodeCheck::Rejected
        {
            return Err(AppError::Unauthorized("Authentication failed.".into()));
        }

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'auth:mfa_login', '{}')"#,
            user_id
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

        let (mut jar, _) = self.issue_session(user_id, email, user_agent, ip).await?;

        jar = jar.add(clear_mfa_pending_cookie(&opts));

        Ok(jar)
    }

    pub async fn register(&self, dto: RegisterDto) -> AppResult<serde_json::Value> {
        validate_password_strength(&dto.password).map_err(|e| AppError::BadRequest(e.into()))?;

        let email = dto.email.to_lowercase();

        let exists = sqlx::query!(r#"SELECT id FROM users WHERE email = $1"#, email)
            .fetch_optional(&self.db)
            .await?;
        if exists.is_some() {
            return Err(AppError::BadRequest(
                "Email address is already registered.".into(),
            ));
        }

        let password_hash = hash_password(dto.password).await?;

        let locale = dto.preferences.language;

        let prefs = json!({
            "theme": dto.preferences.theme.unwrap_or_else(|| "system".into()),
            "language": locale,
            "personalized": dto.preferences.personalized.unwrap_or_else(|| json!("true")),
        });

        let user = sqlx::query!(
            r#"
            INSERT INTO users (email, password_hash, email_verified, preferences)
            VALUES ($1, $2, false, $3)
            RETURNING id, email
            "#,
            email,
            password_hash,
            prefs,
        )
        .fetch_one(&self.db)
        .await
        .map_err(|_| AppError::BadRequest("Registration failed.".into()))?;

        let token = hex::encode(rand::random::<[u8; 32]>());

        let expires_at = Utc::now() + chrono_ttl(EMAIL_VERIFY_TTL);

        sqlx::query!(
            r#"INSERT INTO verifications (email, token, expires_at) VALUES ($1, $2, $3)"#,
            email,
            token,
            expires_at,
        )
        .execute(&self.db)
        .await?;

        let verify_url = format!("{}?token={}", self.config.client_verify_url, token);

        match self
            .email
            .send_verification_email(&user.email, locale, &verify_url)
            .await
        {
            Ok(_) => Ok(json!({
                "ok": true,
                "message": "Registration successful. Please check your inbox and spam folder."
            })),
            Err(_) => Ok(json!({
                "ok": true,
                "message": "Registration successful but the confirmation email could not be sent."
            })),
        }
    }

    pub async fn get_me(&self, user_id: Uuid) -> AppResult<serde_json::Value> {
        let user = sqlx::query!(
            r#"
            SELECT id, email, email_verified, mfa_enabled, personalized, preferences,
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
            "emailVerified": user.email_verified,
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

    pub async fn verify_email(&self, token: &str) -> AppResult<serde_json::Value> {
        let ver = sqlx::query!(
            r#"SELECT email, expires_at FROM verifications WHERE token = $1"#,
            token
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::BadRequest("Invalid verification token.".into()))?;

        if ver.expires_at < Utc::now() {
            return Err(AppError::BadRequest(
                "Verification token has expired.".into(),
            ));
        }

        let user = sqlx::query!(r#"SELECT id FROM users WHERE email = $1"#, ver.email)
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::BadRequest("User not found.".into()))?;

        sqlx::query!(
            r#"UPDATE users SET email_verified = true WHERE id = $1"#,
            user.id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(r#"DELETE FROM verifications WHERE email = $1"#, ver.email)
            .execute(&self.db)
            .await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn forgot_password(&self, email: &str) -> AppResult<serde_json::Value> {
        let email = email.to_lowercase();

        let user = sqlx::query!(
            r#"SELECT preferences->>'language' AS language FROM users WHERE email = $1"#,
            email
        )
        .fetch_optional(&self.db)
        .await?;

        let Some(user) = user else {
            return Ok(json!({
                "ok": true,
                "message": "If the email exists, a recovery email has been sent."
            }));
        };

        let code = self.issue_email_code(&email).await?;

        let locale = Locale::from_stored(user.language.as_deref());
        let _ = self
            .email
            .send_password_reset_email(&email, locale, &code)
            .await;

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

        self.consume_email_code(&email, code).await?;

        let reset_token = self
            .jwt
            .sign_password_reset(&email, PASSWORD_RESET_TTL)
            .map_err(|e| AppError::internal(e.to_string()))?;

        Ok(json!({ "ok": true, "resetToken": reset_token }))
    }

    /// Codes proving control of the account email. Password reset and the
    /// first password of a Google-only account share them: both grant the
    /// same thing, a password for that email.
    async fn issue_email_code(&self, email: &str) -> AppResult<String> {
        let code = hex::encode_upper(rand::random::<[u8; 3]>());

        let expires_at = Utc::now() + chrono_ttl(PASSWORD_RESET_CODE_TTL);

        sqlx::query!(
            r#"UPDATE password_resets SET used = true WHERE email = $1 AND used = false"#,
            email
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO password_resets (email, code, expires_at) VALUES ($1, $2, $3)"#,
            email,
            code,
            expires_at
        )
        .execute(&self.db)
        .await?;

        Ok(code)
    }

    async fn consume_email_code(&self, email: &str, code: &str) -> AppResult<()> {
        const MAX_RESET_CODE_ATTEMPTS: i32 = 5;

        let code = code.trim();

        let mut tx = self.db.begin().await?;

        let pr = sqlx::query!(
            r#"
            UPDATE password_resets SET attempts = attempts + 1
            WHERE id = (
                SELECT id FROM password_resets
                WHERE email = $1 AND used = false
                ORDER BY created_at DESC LIMIT 1
            )
            RETURNING id, code, expires_at, attempts
            "#,
            email
        )
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| AppError::BadRequest("Invalid code.".into()))?;

        if pr.attempts > MAX_RESET_CODE_ATTEMPTS {
            sqlx::query!(
                r#"UPDATE password_resets SET used = true WHERE id = $1"#,
                pr.id
            )
            .execute(&mut *tx)
            .await?;
            tx.commit().await?;
            return Err(AppError::BadRequest(
                "Too many attempts. Please request a new code.".into(),
            ));
        }

        if pr.expires_at < Utc::now() {
            tx.commit().await?;
            return Err(AppError::BadRequest("Code has expired.".into()));
        }

        if !constant_time_str_eq(code, &pr.code) {
            tx.commit().await?;
            return Err(AppError::BadRequest("Invalid code.".into()));
        }

        sqlx::query!(
            r#"UPDATE password_resets SET used = true WHERE id = $1"#,
            pr.id
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(())
    }

    pub async fn request_password_setup_code(&self, user_id: Uuid) -> AppResult<serde_json::Value> {
        let account = self.passwordless_account(user_id).await?;

        let code = self.issue_email_code(&account.email).await?;

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

        self.consume_email_code(&email, code).await?;

        let hash = hash_password(new_password).await?;

        // The IS NULL guard keeps a concurrent request from overwriting a
        // password that was set in the meantime.
        let updated = sqlx::query!(
            r#"UPDATE users SET password_hash = $1 WHERE id = $2 AND password_hash IS NULL"#,
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

    pub async fn reset_password(
        &self,
        reset_token: &str,
        password: &str,
    ) -> AppResult<serde_json::Value> {
        validate_password_strength(password).map_err(|e| AppError::BadRequest(e.into()))?;

        let claims = self.jwt.verify_password_reset(reset_token)?;

        if claims.purpose != "password_reset" {
            return Err(AppError::BadRequest("Invalid reset token.".into()));
        }

        let email = claims.email.to_lowercase();

        let user = sqlx::query!(
            r#"SELECT id, mfa_enabled, preferences->>'language' AS language FROM users WHERE email = $1"#,
            email
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::BadRequest("User not found.".into()))?;

        let hash = hash_password(password.to_string()).await?;

        let mut tx = self.db.begin().await?;

        sqlx::query!(
            r#"UPDATE users SET password_hash = $1 WHERE id = $2"#,
            hash,
            user.id
        )
        .execute(&mut *tx)
        .await?;

        disable_mfa(&mut tx, user.id).await?;

        tx.commit().await?;

        self.tokens
            .revoke_all_for_user(user.id, PASSWORD_CHANGE, None)
            .await?;

        sqlx::query!(
            r#"
            INSERT INTO user_activity (user_id, type, meta)
            VALUES ($1, 'account:password_reset', $2)
            "#,
            user.id,
            json!({ "by": "self", "mfaWasEnabled": user.mfa_enabled, "mfaDisabled": true })
        )
        .execute(&self.db)
        .await?;

        let locale = Locale::from_stored(user.language.as_deref());
        let _ = self.email.send_security_email(&email, locale).await;

        Ok(json!({
            "ok": true,
            "message": "Password reset successfully. MFA has been disabled."
        }))
    }

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
            r#"SELECT id, email, password_hash FROM users WHERE id = $1"#,
            user_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::BadRequest("User not found.".into()))?;

        let Some(current_hash) = user.password_hash else {
            return Err(AppError::bad_request("Your account has no password yet."));
        };

        let ok = verify_password(current_password, current_hash).await?;

        if !ok {
            return Err(AppError::Forbidden("Current password is incorrect.".into()));
        }

        let hash = hash_password(new_password).await?;

        sqlx::query!(
            r#"UPDATE users SET password_hash = $1 WHERE id = $2"#,
            hash,
            user.id
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
