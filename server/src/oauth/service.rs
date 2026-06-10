use crate::{
    auth::{cookies::*, token::TokenService},
    common::{csrf::generate_csrf_token, password::verify_password},
    config::Config,
    error::{AppError, AppResult},
    state::AppState,
};
use axum_extra::extract::{CookieJar, cookie::Cookie, cookie::SameSite};
use cookie::time::Duration;
use serde_json::{Value, json};
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

const OAUTH_STATE_COOKIE: &str = "oauth_state_token";
pub const OAUTH_PENDING_COOKIE: &str = "oauth_pending_token";

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct OAuthStateClaims {
    state: String,
    nonce: String,
    purpose: String,
    iat: u64,
    exp: u64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct OAuthPendingClaims {
    pub google_id: String,
    pub google_email: String,
    pub purpose: String,
    pub iat: u64,
    pub exp: u64,
}

pub struct OAuthService {
    db: PgPool,
    config: Arc<Config>,
    http: reqwest::Client,
    state: AppState,
}

impl OAuthService {
    pub fn from_state(s: &AppState) -> Self {
        Self {
            db: s.db.clone(),
            config: s.config.clone(),
            http: s.http.clone(),
            state: s.clone(),
        }
    }

    pub fn build_google_auth_url(&self) -> AppResult<(String, CookieJar)> {
        let state_bytes: [u8; 32] = rand::random();

        let state_val = hex::encode(state_bytes);

        let nonce_bytes: [u8; 32] = rand::random();

        let nonce = hex::encode(nonce_bytes);

        let token = self.sign_state_cookie(&state_val, &nonce)?;

        let opts = self.config.base_cookie_options();

        let mut c = Cookie::new(OAUTH_STATE_COOKIE, token);
        c.set_http_only(true);
        c.set_secure(opts.secure);
        c.set_path("/");
        c.set_same_site(SameSite::Lax);
        c.set_max_age(Duration::minutes(10));

        let client_id = self.config.google_client_id.as_deref().unwrap_or("");

        let redirect = self.config.google_redirect_uri.as_deref().unwrap_or("");

        let params = [
            ("client_id", client_id),
            ("redirect_uri", redirect),
            ("response_type", "code"),
            ("scope", "openid email"),
            ("state", &state_val),
            ("nonce", &nonce),
            ("access_type", "online"),
            ("prompt", "select_account"),
        ];
        let url = format!(
            "https://accounts.google.com/o/oauth2/v2/auth?{}",
            params
                .iter()
                .map(|(k, v)| format!("{k}={}", urlencoding::encode(v)))
                .collect::<Vec<_>>()
                .join("&")
        );

        Ok((url, CookieJar::new().add(c)))
    }

    pub async fn handle_callback(
        &self,
        code: Option<&str>,
        state_param: Option<&str>,
        error_param: Option<&str>,
        state_cookie: Option<&str>,
    ) -> (CookieJar, String) {
        let frontend = &self.config.cors_origin;
        let empty_jar = CookieJar::new();

        if error_param == Some("access_denied") {
            return (
                empty_jar,
                format!("{frontend}/?auth=error&reason=access_denied"),
            );
        }

        let (code, state_param) = match (code, state_param) {
            (Some(c), Some(s)) => (c, s),
            _ => {
                return (
                    empty_jar,
                    format!("{frontend}/?auth=error&reason=invalid_request"),
                );
            }
        };

        let nonce = match self.verify_state_cookie(state_cookie, state_param) {
            Ok(n) => n,
            Err(_) => {
                return (
                    empty_jar,
                    format!("{frontend}/?auth=error&reason=invalid_state"),
                );
            }
        };

        let id_token = match self.exchange_code(code).await {
            Ok(t) => t,
            Err(_) => {
                return (
                    empty_jar,
                    format!("{frontend}/?auth=error&reason=token_exchange_failed"),
                );
            }
        };

        let profile = match self.verify_id_token(&id_token, &nonce).await {
            Ok(p) => p,
            Err(_) => {
                return (
                    empty_jar,
                    format!("{frontend}/?auth=error&reason=token_invalid"),
                );
            }
        };

        match self.resolve_account(&profile.0, &profile.1).await {
            Ok(OAuthResolution::Login {
                user_id,
                email,
                mfa_enabled,
                mfa_secret,
            }) => {
                if mfa_enabled && mfa_secret.is_some() {
                    (empty_jar, format!("{frontend}/?auth=mfa-pending"))
                } else {
                    let _ = sqlx::query!(
                        r#"UPDATE users SET last_login_at = now() WHERE id = $1"#,
                        user_id
                    )
                    .execute(&self.db)
                    .await;

                    match self.generate_auth_jar(user_id, &email).await {
                        Ok(jar) => (jar, format!("{frontend}/?auth=success")),
                        Err(_) => (
                            empty_jar,
                            format!("{frontend}/?auth=error&reason=server_error"),
                        ),
                    }
                }
            }
            Ok(OAuthResolution::LinkRequired {
                google_id,
                google_email,
            }) => match self.sign_pending_cookie(&google_id, &google_email) {
                Ok(pending_token) => {
                    let opts = self.config.base_cookie_options();

                    let mut c = Cookie::new(OAUTH_PENDING_COOKIE, pending_token);

                    c.set_http_only(true);
                    c.set_secure(opts.secure);
                    c.set_path("/");
                    c.set_same_site(SameSite::Lax);
                    c.set_max_age(Duration::minutes(15));

                    let jar = CookieJar::new().add(c);

                    (jar, format!("{frontend}/?auth=link-required"))
                }
                Err(_) => (
                    empty_jar,
                    format!("{frontend}/?auth=error&reason=server_error"),
                ),
            },
            Ok(OAuthResolution::NewUser { user_id, email }) => {
                match self.generate_auth_jar(user_id, &email).await {
                    Ok(jar) => (jar, format!("{frontend}/?auth=success")),
                    Err(_) => (
                        empty_jar,
                        format!("{frontend}/?auth=error&reason=server_error"),
                    ),
                }
            }
            Err(_) => (
                empty_jar,
                format!("{frontend}/?auth=error&reason=server_error"),
            ),
        }
    }

    pub async fn link_google_account(
        &self,
        google_id: &str,
        google_email: &str,
        password: &str,
    ) -> AppResult<(CookieJar, Value)> {
        let user = sqlx::query!(
            r#"SELECT id, email, password_hash, email_verified FROM users WHERE email = $1"#,
            google_email.to_lowercase()
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::Unauthorized("Invalid credentials.".into()))?;

        let hash = user.password_hash.as_deref().unwrap_or("");

        if !verify_password(password.to_string(), hash.to_string()).await? {
            return Err(AppError::Unauthorized("Invalid credentials.".into()));
        }

        if !user.email_verified {
            return Err(AppError::Unauthorized(
                "Please verify your email address first.".into(),
            ));
        }

        sqlx::query!(
            r#"INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email)
               VALUES ($1, 'google', $2, $3)"#,
            user.id,
            google_id,
            google_email
        )
        .execute(&self.db)
        .await
        .map_err(|_| {
            AppError::bad_request("This Google account is already linked to another account.")
        })?;

        let (jar, _) = self
            .generate_auth_jar_with_context(user.id, &user.email)
            .await?;
        Ok((jar, json!({ "ok": true })))
    }

    pub async fn unlink_google_account(&self, user_id: Uuid) -> AppResult<Value> {
        let user = sqlx::query!(r#"SELECT password_hash FROM users WHERE id = $1"#, user_id)
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::bad_request("User not found."))?;

        if user.password_hash.is_none() {
            return Err(AppError::bad_request(
                "Please set a password before unlinking your Google account.",
            ));
        }

        sqlx::query!(
            r#"DELETE FROM oauth_accounts WHERE user_id = $1 AND provider = 'google'"#,
            user_id
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn get_linked_providers(&self, user_id: Uuid) -> AppResult<Value> {
        let rows = sqlx::query!(
            r#"SELECT provider, provider_email FROM oauth_accounts WHERE user_id = $1"#,
            user_id
        )
        .fetch_all(&self.db)
        .await?;

        Ok(json!({
            "providers": rows.iter().map(|r| json!({
                "provider": r.provider,
                "email": r.provider_email
            })).collect::<Vec<_>>()
        }))
    }

    async fn resolve_user_context(&self, user_id: Uuid) -> AppResult<(String, Option<Uuid>)> {
        let global_role = sqlx::query!(
            r#"SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id
               WHERE ur.user_id = $1 AND ur.tenant_id IS NULL LIMIT 1"#,
            user_id
        )
        .fetch_optional(&self.db)
        .await?
        .map(|r| r.name)
        .unwrap_or_else(|| "user".into());

        let active_group = sqlx::query!(
            r#"SELECT tenant_id FROM user_roles WHERE user_id = $1 AND tenant_id IS NOT NULL LIMIT 1"#,
            user_id
        )
            .fetch_optional(&self.db)
            .await?
            .and_then(|r| r.tenant_id);

        Ok((global_role, active_group))
    }

    async fn resolve_account(
        &self,
        google_id: &str,
        google_email: &str,
    ) -> AppResult<OAuthResolution> {
        let email = google_email.to_lowercase();

        let linked = sqlx::query!(
            r#"SELECT user_id FROM oauth_accounts WHERE provider = 'google' AND provider_user_id = $1"#,
            google_id
        )
            .fetch_optional(&self.db)
            .await?;

        if let Some(row) = linked {
            let user = sqlx::query!(
                r#"SELECT id, email, mfa_enabled, mfa_secret FROM users WHERE id = $1"#,
                row.user_id
            )
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::internal("Linked user not found"))?;

            let ban = sqlx::query!(r#"SELECT id FROM banned_users WHERE user_id = $1"#, user.id)
                .fetch_optional(&self.db)
                .await?;

            if ban.is_some() {
                return Err(AppError::forbidden("Your account has been suspended."));
            }

            return Ok(OAuthResolution::Login {
                user_id: user.id,
                email: user.email,
                mfa_enabled: user.mfa_enabled,
                mfa_secret: user.mfa_secret,
            });
        }

        let existing = sqlx::query!(r#"SELECT id FROM users WHERE email = $1"#, email)
            .fetch_optional(&self.db)
            .await?;

        if existing.is_some() {
            return Ok(OAuthResolution::LinkRequired {
                google_id: google_id.to_string(),
                google_email: email,
            });
        }

        let user = sqlx::query!(
            r#"INSERT INTO users (email, password_hash, email_verified) VALUES ($1, NULL, true) RETURNING id, email"#,
            email
        )
            .fetch_one(&self.db)
            .await?;

        sqlx::query!(
            r#"INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email) VALUES ($1, 'google', $2, $3)"#,
            user.id, google_id, email
        )
            .execute(&self.db)
            .await?;

        Ok(OAuthResolution::NewUser {
            user_id: user.id,
            email: user.email,
        })
    }

    async fn exchange_code(&self, code: &str) -> AppResult<String> {
        let params = [
            ("code", code),
            (
                "client_id",
                self.config.google_client_id.as_deref().unwrap_or(""),
            ),
            (
                "client_secret",
                self.config.google_client_secret.as_deref().unwrap_or(""),
            ),
            (
                "redirect_uri",
                self.config.google_redirect_uri.as_deref().unwrap_or(""),
            ),
            ("grant_type", "authorization_code"),
        ];

        let resp = self
            .http
            .post("https://oauth2.googleapis.com/token")
            .form(&params)
            .send()
            .await
            .map_err(|e| AppError::internal(format!("Token exchange failed: {e}")))?;

        if !resp.status().is_success() {
            return Err(AppError::internal("Google token exchange failed"));
        }

        let data: Value = resp
            .json()
            .await
            .map_err(|_| AppError::internal("Failed to parse token response"))?;

        Ok(data["id_token"].as_str().unwrap_or("").to_string())
    }

    async fn verify_id_token(
        &self,
        id_token: &str,
        expected_nonce: &str,
    ) -> AppResult<(String, String)> {
        let parts: Vec<&str> = id_token.split('.').collect();

        if parts.len() != 3 {
            return Err(AppError::Unauthorized("Malformed ID token.".into()));
        }

        let payload =
            base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, parts[1])
                .map_err(|_| AppError::Unauthorized("Invalid token encoding.".into()))?;

        let claims: Value = serde_json::from_slice(&payload)
            .map_err(|_| AppError::Unauthorized("Invalid token payload.".into()))?;

        let sub = claims["sub"].as_str().unwrap_or("").to_string();

        let email = claims["email"].as_str().unwrap_or("").to_string();

        let nonce = claims["nonce"].as_str().unwrap_or("");

        let email_verified = claims["email_verified"].as_bool().unwrap_or(false);

        let aud = claims["aud"].as_str().unwrap_or("");
        let expected_aud = self.config.google_client_id.as_deref().unwrap_or("");
        if expected_aud.is_empty() || aud != expected_aud {
            return Err(AppError::Unauthorized("ID token audience mismatch.".into()));
        }

        let iss = claims["iss"].as_str().unwrap_or("");
        if iss != "accounts.google.com" && iss != "https://accounts.google.com" {
            return Err(AppError::Unauthorized("ID token issuer mismatch.".into()));
        }

        if !email_verified {
            return Err(AppError::Unauthorized("Google email not verified.".into()));
        }
        if nonce != expected_nonce {
            return Err(AppError::Unauthorized("Nonce mismatch.".into()));
        }

        let exp = claims["exp"].as_i64().unwrap_or(0);

        if exp < chrono::Utc::now().timestamp() {
            return Err(AppError::Unauthorized("ID token expired.".into()));
        }

        Ok((sub, email))
    }

    fn sign_state_cookie(&self, state: &str, nonce: &str) -> AppResult<String> {
        use std::time::{SystemTime, UNIX_EPOCH};

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let claims = OAuthStateClaims {
            state: state.to_string(),
            nonce: nonce.to_string(),
            purpose: "oauth_state".into(),
            iat: now,
            exp: now + 600,
        };

        jsonwebtoken::encode(
            &jsonwebtoken::Header::default(),
            &claims,
            &jsonwebtoken::EncodingKey::from_secret(
                self.config.oauth_pending_jwt_secret.as_bytes(),
            ),
        )
        .map_err(|e| AppError::internal(e.to_string()))
    }

    fn sign_pending_cookie(&self, google_id: &str, google_email: &str) -> AppResult<String> {
        use std::time::{SystemTime, UNIX_EPOCH};
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let claims = OAuthPendingClaims {
            google_id: google_id.to_string(),
            google_email: google_email.to_string(),
            purpose: "oauth_pending".into(),
            iat: now,
            exp: now + 900,
        };

        jsonwebtoken::encode(
            &jsonwebtoken::Header::default(),
            &claims,
            &jsonwebtoken::EncodingKey::from_secret(
                self.config.oauth_pending_jwt_secret.as_bytes(),
            ),
        )
        .map_err(|e| AppError::internal(e.to_string()))
    }

    fn verify_state_cookie(&self, cookie: Option<&str>, state_param: &str) -> AppResult<String> {
        let token =
            cookie.ok_or_else(|| AppError::Unauthorized("OAuth state cookie missing.".into()))?;

        let mut v = jsonwebtoken::Validation::default();

        v.algorithms = vec![jsonwebtoken::Algorithm::HS256];

        let data = jsonwebtoken::decode::<OAuthStateClaims>(
            token,
            &jsonwebtoken::DecodingKey::from_secret(
                self.config.oauth_pending_jwt_secret.as_bytes(),
            ),
            &v,
        )
        .map_err(|_| AppError::Unauthorized("Invalid OAuth state.".into()))?;

        if data.claims.purpose != "oauth_state" || data.claims.state != state_param {
            return Err(AppError::Unauthorized("OAuth state mismatch.".into()));
        }

        Ok(data.claims.nonce)
    }

    async fn generate_auth_jar(&self, user_id: Uuid, email: &str) -> AppResult<CookieJar> {
        let (jar, _) = self.generate_auth_jar_with_context(user_id, email).await?;
        Ok(jar)
    }

    async fn generate_auth_jar_with_context(
        &self,
        user_id: Uuid,
        email: &str,
    ) -> AppResult<(CookieJar, String)> {
        let (global_role, active_group_id) = self.resolve_user_context(user_id).await?;

        let tokens = TokenService::from_state(&self.state)
            .issue_pair(crate::auth::token::IssueTokenParams {
                user_id,
                email,
                global_role: &global_role,
                active_group_id,
                user_agent: None,
                ip_address: None,
                parent: None,
            })
            .await?;

        let opts = self.config.base_cookie_options();

        let csrf = generate_csrf_token();

        let jar = CookieJar::new()
            .add(access_cookie(tokens.access_token, &opts))
            .add(refresh_cookie(tokens.refresh_token, &opts))
            .add(crate::common::csrf::csrf_cookie(&csrf, &opts));

        Ok((jar, global_role))
    }
}

enum OAuthResolution {
    Login {
        user_id: Uuid,
        email: String,
        mfa_enabled: bool,
        mfa_secret: Option<serde_json::Value>,
    },
    LinkRequired {
        google_id: String,
        google_email: String,
    },
    NewUser {
        user_id: Uuid,
        email: String,
    },
}
