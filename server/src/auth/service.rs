use crate::{
    auth::{
        cookies::*,
        dto::*,
        token::{TokenService, *},
    },
    common::{
        csrf::generate_csrf_token,
        email::EmailService,
        jwt::JwtService,
        password::{hash_password, validate_password_strength, verify_password},
    },
    config::{
        Config, EMAIL_VERIFY_TTL, MFA_PENDING_TTL, PASSWORD_RESET_CODE_TTL, PASSWORD_RESET_TTL,
    },
    error::{AppError, AppResult},
    state::AppState,
};
use axum_extra::extract::cookie::CookieJar;
use chrono::{Duration, Utc};
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

fn constant_time_str_eq(a: &str, b: &str) -> bool {
    use sha2::{Digest, Sha256};
    Sha256::digest(a.as_bytes()) == Sha256::digest(b.as_bytes())
}

static DUMMY_PASSWORD_HASH: tokio::sync::OnceCell<String> = tokio::sync::OnceCell::const_new();

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

    async fn resolve_user_context(&self, user_id: Uuid) -> AppResult<(String, Option<Uuid>)> {
        let global_role = sqlx::query!(
            r#"
            SELECT r.name FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = $1 AND ur.tenant_id IS NULL
            LIMIT 1
            "#,
            user_id
        )
        .fetch_optional(&self.db)
        .await?
        .map(|r| r.name)
        .unwrap_or_else(|| "user".into());

        let active_group_id = sqlx::query!(
            r#"SELECT tenant_id FROM user_roles WHERE user_id = $1 AND tenant_id IS NOT NULL LIMIT 1"#,
            user_id
        )
            .fetch_optional(&self.db)
            .await?
            .and_then(|r| r.tenant_id);

        Ok((global_role, active_group_id))
    }

    async fn issue_session(
        &self,
        user_id: Uuid,
        email: &str,
        user_agent: Option<&str>,
        ip: Option<&str>,
    ) -> AppResult<(CookieJar, String)> {
        let (global_role, active_group_id) = self.resolve_user_context(user_id).await?;

        let opts = self.config.base_cookie_options();

        let issued = self
            .tokens
            .issue_pair(crate::auth::token::IssueTokenParams {
                user_id,
                email,
                global_role: &global_role,
                active_group_id,
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
        let dummy = DUMMY_PASSWORD_HASH
            .get_or_init(|| async {
                hash_password("argon2-login-timing-equalizer".to_string())
                    .await
                    .unwrap_or_default()
            })
            .await;

        if !dummy.is_empty() {
            let _ = verify_password(password, dummy.clone()).await;
        }
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
            SELECT id, email, password_hash, email_verified, mfa_enabled, mfa_secret
            FROM users WHERE email = $1
            "#,
            email
        )
        .fetch_optional(&self.db)
        .await?;

        let user = match user {
            Some(u) => u,
            None => {
                self.equalize_login_timing(dto.password).await;
                return Err(AppError::Unauthorized("Invalid credentials.".into()));
            }
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

        let ban = sqlx::query!(r#"SELECT id FROM banned_users WHERE user_id = $1"#, user.id)
            .fetch_optional(&self.db)
            .await?;
        if ban.is_some() {
            return Err(AppError::Forbidden(
                "Your account has been suspended.".into(),
            ));
        }

        if user.mfa_enabled && user.mfa_secret.is_some() {
            let opts = self.config.base_cookie_options();

            let mfa_token = self
                .jwt
                .sign_mfa_pending(user.id, &user.email, MFA_PENDING_TTL)
                .map_err(|e| AppError::internal(e.to_string()))?;

            let jar = CookieJar::new().add(mfa_pending_cookie(mfa_token, &opts));

            return Ok(LoginResult::MfaRequired(jar));
        }

        sqlx::query!(
            r#"UPDATE users SET last_login_at = now() WHERE id = $1"#,
            user.id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"DELETE FROM mfa_pending_secrets WHERE user_id = $1"#,
            user.id
        )
        .execute(&self.db)
        .await?;

        let (jar, _csrf) = self
            .issue_session(user.id, &user.email, user_agent, ip)
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
        let user = sqlx::query!(
            r#"SELECT mfa_enabled, mfa_secret FROM users WHERE id = $1"#,
            user_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::Unauthorized("Authentication failed.".into()))?;

        if !user.mfa_enabled || user.mfa_secret.is_none() {
            return Err(AppError::Unauthorized("Authentication failed.".into()));
        }

        let encrypted: crate::common::encryption::EncryptedPayload =
            serde_json::from_value(user.mfa_secret.unwrap())
                .map_err(|_| AppError::internal("Invalid MFA secret format"))?;

        let uid = user_id.to_string();

        let secret_b32 = self.enc.decrypt(&encrypted, &uid).await?;

        let secret_bytes =
            base32::decode(base32::Alphabet::Rfc4648 { padding: false }, &secret_b32)
                .ok_or_else(|| AppError::internal("Invalid TOTP secret encoding"))?;

        let totp = totp_rs::TOTP::new(
            totp_rs::Algorithm::SHA1,
            6,
            1,
            30,
            secret_bytes,
            None,
            "".to_string(),
        )
        .map_err(|e| AppError::internal(format!("TOTP init: {e}")))?;

        if !totp
            .check_current(code)
            .map_err(|_| AppError::Unauthorized("Authentication failed.".into()))?
        {
            tokio::time::sleep(std::time::Duration::from_millis(
                100 + rand::random::<u64>() % 100,
            ))
            .await;

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

        let default_prefs = json!({
            "theme": "system",
            "language": "de",
            "personalized": "true"
        });

        let prefs = if let Some(p) = dto.preferences {
            let allowed = ["theme", "language", "personalized"];

            let mut merged = default_prefs.clone();

            if let (Some(obj), Some(m)) = (p.as_object(), merged.as_object_mut()) {
                for (k, v) in obj {
                    if allowed.contains(&k.as_str()) {
                        m.insert(k.clone(), v.clone());
                    }
                }
            }
            merged
        } else {
            default_prefs
        };

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

        let expires_at = Utc::now() + Duration::from_std(EMAIL_VERIFY_TTL).unwrap();

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
            .send_verification_email(&user.email, &verify_url)
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

    pub async fn get_me(
        &self,
        user_id: Uuid,
        active_group_id: Option<Uuid>,
    ) -> AppResult<serde_json::Value> {
        let user = sqlx::query!(
            r#"
            SELECT id, email, email_verified, mfa_enabled, done_setup, personalized, preferences
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

        let global_role = sqlx::query!(
            r#"
            SELECT r.name FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = $1 AND ur.tenant_id IS NULL
            LIMIT 1
            "#,
            user_id
        )
        .fetch_optional(&self.db)
        .await?
        .map(|r| r.name)
        .unwrap_or_else(|| "user".into());

        let tenant_role = if let Some(gid) = active_group_id {
            sqlx::query!(
                r#"
                SELECT r.name FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = $1 AND ur.tenant_id = $2
                LIMIT 1
                "#,
                user_id,
                gid
            )
            .fetch_optional(&self.db)
            .await?
            .map(|r| r.name)
        } else {
            None
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
            "role": global_role,
            "tenantRole": tenant_role,
            "emailVerified": user.email_verified,
            "courses": courses,
            "doneSetup": user.done_setup,
            "personalized": user.personalized,
            "mfaEnabled": user.mfa_enabled,
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

        let user = sqlx::query!(r#"SELECT id FROM users WHERE email = $1"#, email)
            .fetch_optional(&self.db)
            .await?;

        if user.is_none() {
            return Ok(json!({
                "ok": true,
                "message": "If the email exists, a recovery email has been sent."
            }));
        }

        let code = hex::encode_upper(rand::random::<[u8; 3]>());

        let expires_at = Utc::now() + Duration::from_std(PASSWORD_RESET_CODE_TTL).unwrap();

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

        let _ = self.email.send_password_reset_email(&email, &code).await;

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
        const MAX_RESET_CODE_ATTEMPTS: i32 = 5;

        let email = email.to_lowercase();

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
        .ok_or_else(|| AppError::BadRequest("Invalid reset code.".into()))?;

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
            return Err(AppError::BadRequest("Reset code has expired.".into()));
        }

        if !constant_time_str_eq(code, &pr.code) {
            tx.commit().await?;
            return Err(AppError::BadRequest("Invalid reset code.".into()));
        }

        sqlx::query!(
            r#"UPDATE password_resets SET used = true WHERE id = $1"#,
            pr.id
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        let reset_token = self
            .jwt
            .sign_password_reset(&email, PASSWORD_RESET_TTL)
            .map_err(|e| AppError::internal(e.to_string()))?;

        Ok(json!({ "ok": true, "resetToken": reset_token }))
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
            r#"SELECT id, mfa_enabled FROM users WHERE email = $1"#,
            email
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::BadRequest("User not found.".into()))?;

        let hash = hash_password(password.to_string()).await?;

        sqlx::query!(
            r#"UPDATE users SET password_hash = $1, mfa_enabled = false, mfa_secret = NULL WHERE id = $2"#,
            hash, user.id
        )
            .execute(&self.db)
            .await?;

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

        let _ = self.email.send_security_email(&email).await;

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

        let ok = verify_password(current_password, user.password_hash.unwrap_or_default()).await?;

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

pub enum LoginResult {
    Success(CookieJar),
    MfaRequired(CookieJar),
}
