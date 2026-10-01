use crate::{
    auth::{
        service::{AuthService, ClientInfo, LoginResult},
        session_context::account_is_active,
    },
    common::{jwt::now_secs, password::verify_password},
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

/// The cookie and the JWT inside it expire together.
const STATE_COOKIE_TTL_MINS: i64 = 10;
const PENDING_COOKIE_TTL_MINS: i64 = 15;
const STATE_COOKIE_TTL_SECS: u64 = STATE_COOKIE_TTL_MINS as u64 * 60;
const PENDING_COOKIE_TTL_SECS: u64 = PENDING_COOKIE_TTL_MINS as u64 * 60;

/// Query parameter under which the frontend reads the result of a sign-in.
const LOGIN_RESULT_PARAM: &str = "auth";
/// Query parameter under which the frontend reads the result of a link from
/// the account settings.
const LINK_RESULT_PARAM: &str = "link";

const GOOGLE_ACCOUNT_TAKEN_CONSTRAINT: &str = "oauth_accounts_provider_provider_user_id_key";
const PROVIDER_ALREADY_LINKED_CONSTRAINT: &str = "oauth_accounts_user_id_provider_key";

/// Why the user went to Google. It travels inside the signed state cookie, so
/// only a request authenticated as `user_id` can make the callback link a
/// Google account to that user.
#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(tag = "intent", rename_all = "snake_case")]
pub enum OAuthIntent {
    /// Signs in to an existing account only.
    Login,
    /// Started from the registration form after the privacy policy and terms
    /// were accepted, so an account may be created for a new Google user.
    SignUp,
    Link {
        user_id: Uuid,
    },
}

impl OAuthIntent {
    fn result_param(&self) -> &'static str {
        match self {
            Self::Login | Self::SignUp => LOGIN_RESULT_PARAM,
            Self::Link { .. } => LINK_RESULT_PARAM,
        }
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct OAuthStateClaims {
    state: String,
    nonce: String,
    #[serde(flatten)]
    intent: OAuthIntent,
    purpose: String,
    iat: u64,
    exp: u64,
}

struct GoogleProfile {
    subject: String,
    email: String,
}

enum LinkError {
    GoogleAccountTaken,
    ProviderAlreadyLinked,
    Database(sqlx::Error),
}

impl LinkError {
    fn reason(&self) -> &'static str {
        match self {
            Self::GoogleAccountTaken => "google_account_taken",
            Self::ProviderAlreadyLinked => "provider_already_linked",
            Self::Database(_) => "server_error",
        }
    }
}

impl From<sqlx::Error> for LinkError {
    fn from(e: sqlx::Error) -> Self {
        match e.as_database_error().and_then(|db| db.constraint()) {
            Some(GOOGLE_ACCOUNT_TAKEN_CONSTRAINT) => Self::GoogleAccountTaken,
            Some(PROVIDER_ALREADY_LINKED_CONSTRAINT) => Self::ProviderAlreadyLinked,
            _ => Self::Database(e),
        }
    }
}

impl From<LinkError> for AppError {
    fn from(e: LinkError) -> Self {
        match e {
            LinkError::GoogleAccountTaken => {
                AppError::bad_request("This Google account is already linked to an account.")
            }
            LinkError::ProviderAlreadyLinked => {
                AppError::bad_request("This account is already linked to a Google account.")
            }
            LinkError::Database(e) => AppError::Database(e),
        }
    }
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

    pub fn build_google_auth_url(&self, intent: OAuthIntent) -> AppResult<(String, CookieJar)> {
        let state_bytes: [u8; 32] = rand::random();

        let state_val = hex::encode(state_bytes);

        let nonce_bytes: [u8; 32] = rand::random();

        let nonce = hex::encode(nonce_bytes);

        let token = self.sign_state_cookie(&state_val, &nonce, intent)?;

        let opts = self.config.base_cookie_options();

        let mut c = Cookie::new(OAUTH_STATE_COOKIE, token);
        c.set_http_only(true);
        c.set_secure(opts.secure);
        c.set_path("/");
        c.set_same_site(SameSite::Lax);
        c.set_max_age(Duration::minutes(STATE_COOKIE_TTL_MINS));

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
        client: ClientInfo<'_>,
    ) -> (CookieJar, String) {
        let empty_jar = CookieJar::new();

        let Some(state_param) = state_param else {
            return (
                empty_jar,
                self.error_url(LOGIN_RESULT_PARAM, "invalid_request"),
            );
        };

        // The state is verified first so that every later result, including a
        // cancelled consent screen, reaches the page the flow started from.
        let state = match self.verify_state_cookie(state_cookie, state_param) {
            Ok(s) => s,
            Err(_) => {
                return (
                    empty_jar,
                    self.error_url(LOGIN_RESULT_PARAM, "invalid_state"),
                );
            }
        };

        let result_param = state.intent.result_param();

        if error_param == Some("access_denied") {
            return (empty_jar, self.error_url(result_param, "access_denied"));
        }

        let Some(code) = code else {
            return (empty_jar, self.error_url(result_param, "invalid_request"));
        };

        let id_token = match self.exchange_code(code).await {
            Ok(t) => t,
            Err(_) => {
                return (
                    empty_jar,
                    self.error_url(result_param, "token_exchange_failed"),
                );
            }
        };

        let profile = match self.verify_id_token(&id_token, &state.nonce).await {
            Ok(p) => p,
            Err(_) => return (empty_jar, self.error_url(result_param, "token_invalid")),
        };

        match state.intent {
            OAuthIntent::Login => self.complete_login(&profile, client, false).await,
            OAuthIntent::SignUp => self.complete_login(&profile, client, true).await,
            OAuthIntent::Link { user_id } => {
                (empty_jar, self.complete_link(user_id, &profile).await)
            }
        }
    }

    async fn complete_login(
        &self,
        profile: &GoogleProfile,
        client: ClientInfo<'_>,
        may_create_account: bool,
    ) -> (CookieJar, String) {
        let server_error = || {
            (
                CookieJar::new(),
                self.error_url(LOGIN_RESULT_PARAM, "server_error"),
            )
        };

        let Ok(resolution) = self
            .resolve_account(&profile.subject, &profile.email, may_create_account)
            .await
        else {
            return server_error();
        };

        let sign_in = match resolution {
            OAuthResolution::SignIn {
                user_id,
                email,
                mfa_required,
            } => {
                self.auth()
                    .complete_sign_in(user_id, &email, mfa_required, client)
                    .await
            }
            OAuthResolution::LinkRequired {
                google_id,
                google_email,
            } => {
                return match self.pending_link_jar(&google_id, &google_email) {
                    Ok(jar) => (jar, self.result_url(LOGIN_RESULT_PARAM, "link-required")),
                    Err(_) => server_error(),
                };
            }
            OAuthResolution::SignUpRequired => {
                return (
                    CookieJar::new(),
                    self.error_url(LOGIN_RESULT_PARAM, "signup_required"),
                );
            }
        };

        match sign_in {
            Ok(LoginResult::Success(jar)) => (jar, self.result_url(LOGIN_RESULT_PARAM, "success")),
            Ok(LoginResult::MfaRequired(jar)) => {
                (jar, self.result_url(LOGIN_RESULT_PARAM, "mfa-pending"))
            }
            Err(_) => server_error(),
        }
    }

    fn pending_link_jar(&self, google_id: &str, google_email: &str) -> AppResult<CookieJar> {
        let pending_token = self.sign_pending_cookie(google_id, google_email)?;

        let opts = self.config.base_cookie_options();

        let mut c = Cookie::new(OAUTH_PENDING_COOKIE, pending_token);

        c.set_http_only(true);
        c.set_secure(opts.secure);
        c.set_path("/");
        c.set_same_site(SameSite::Lax);
        c.set_max_age(Duration::minutes(PENDING_COOKIE_TTL_MINS));

        Ok(CookieJar::new().add(c))
    }

    fn auth(&self) -> AuthService {
        AuthService::from_state(&self.state)
    }

    /// Links by Google subject, so the Google email may differ from the
    /// account email: the signed-in session already proves who the user is.
    async fn complete_link(&self, user_id: Uuid, profile: &GoogleProfile) -> String {
        match account_is_active(&self.db, user_id).await {
            Ok(true) => {}
            Ok(false) => return self.error_url(LINK_RESULT_PARAM, "session_expired"),
            Err(_) => return self.error_url(LINK_RESULT_PARAM, "server_error"),
        }

        match self
            .insert_google_link(user_id, &profile.subject, &profile.email)
            .await
        {
            Ok(()) => self.result_url(LINK_RESULT_PARAM, "success"),
            Err(e) => {
                if let LinkError::Database(db_err) = &e {
                    tracing::error!(error = %db_err, "failed to link google account");
                }
                self.error_url(LINK_RESULT_PARAM, e.reason())
            }
        }
    }

    async fn insert_google_link(
        &self,
        user_id: Uuid,
        google_id: &str,
        google_email: &str,
    ) -> Result<(), LinkError> {
        sqlx::query!(
            r#"INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email)
               VALUES ($1, 'google', $2, $3)"#,
            user_id,
            google_id,
            google_email
        )
        .execute(&self.db)
        .await?;

        Ok(())
    }

    fn result_url(&self, param: &str, result: &str) -> String {
        format!("{}/?{param}={result}", self.config.cors_origin)
    }

    fn error_url(&self, param: &str, reason: &str) -> String {
        format!("{}/?{param}=error&reason={reason}", self.config.cors_origin)
    }

    pub async fn link_google_account(
        &self,
        google_id: &str,
        google_email: &str,
        password: &str,
        client: ClientInfo<'_>,
    ) -> AppResult<LoginResult> {
        let user = sqlx::query!(
            r#"SELECT id, email, password_hash, email_verified,
                      mfa_enabled AND mfa_secret IS NOT NULL AS "mfa_required!"
               FROM users WHERE email = $1"#,
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

        self.insert_google_link(user.id, google_id, google_email)
            .await?;

        // The password is only the first factor: linking is safe on it alone,
        // since signing in with Google still demands the second one.
        self.auth()
            .complete_sign_in(user.id, &user.email, user.mfa_required, client)
            .await
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

    async fn resolve_account(
        &self,
        google_id: &str,
        google_email: &str,
        may_create_account: bool,
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
                r#"SELECT id, email, mfa_enabled AND mfa_secret IS NOT NULL AS "mfa_required!"
                   FROM users WHERE id = $1"#,
                row.user_id
            )
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::internal("Linked user not found"))?;

            return Ok(OAuthResolution::SignIn {
                user_id: user.id,
                email: user.email,
                mfa_required: user.mfa_required,
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

        if !may_create_account {
            return Ok(OAuthResolution::SignUpRequired);
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

        Ok(OAuthResolution::SignIn {
            user_id: user.id,
            email: user.email,
            mfa_required: false,
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
    ) -> AppResult<GoogleProfile> {
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

        Ok(GoogleProfile {
            subject: sub,
            email,
        })
    }

    fn sign_oauth_cookie<T: serde::Serialize>(&self, claims: &T) -> AppResult<String> {
        jsonwebtoken::encode(
            &jsonwebtoken::Header::default(),
            claims,
            &jsonwebtoken::EncodingKey::from_secret(
                self.config.oauth_pending_jwt_secret.as_bytes(),
            ),
        )
        .map_err(|e| AppError::internal(e.to_string()))
    }

    fn sign_state_cookie(
        &self,
        state: &str,
        nonce: &str,
        intent: OAuthIntent,
    ) -> AppResult<String> {
        let now = now_secs();

        self.sign_oauth_cookie(&OAuthStateClaims {
            state: state.to_string(),
            nonce: nonce.to_string(),
            intent,
            purpose: "oauth_state".into(),
            iat: now,
            exp: now + STATE_COOKIE_TTL_SECS,
        })
    }

    fn sign_pending_cookie(&self, google_id: &str, google_email: &str) -> AppResult<String> {
        let now = now_secs();

        self.sign_oauth_cookie(&OAuthPendingClaims {
            google_id: google_id.to_string(),
            google_email: google_email.to_string(),
            purpose: "oauth_pending".into(),
            iat: now,
            exp: now + PENDING_COOKIE_TTL_SECS,
        })
    }

    fn verify_state_cookie(
        &self,
        cookie: Option<&str>,
        state_param: &str,
    ) -> AppResult<OAuthStateClaims> {
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

        Ok(data.claims)
    }
}

enum OAuthResolution {
    SignIn {
        user_id: Uuid,
        email: String,
        mfa_required: bool,
    },
    LinkRequired {
        google_id: String,
        google_email: String,
    },
    /// A new Google user came from the login page, where the privacy policy
    /// and terms were never accepted.
    SignUpRequired,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state_claims(intent: OAuthIntent) -> OAuthStateClaims {
        OAuthStateClaims {
            state: "state".into(),
            nonce: "nonce".into(),
            intent,
            purpose: "oauth_state".into(),
            iat: 0,
            exp: 0,
        }
    }

    fn round_trip(intent: OAuthIntent) -> OAuthIntent {
        let json = serde_json::to_string(&state_claims(intent)).unwrap();
        serde_json::from_str::<OAuthStateClaims>(&json)
            .unwrap()
            .intent
    }

    #[test]
    fn link_intent_keeps_its_user_through_the_state_cookie() {
        let user_id = Uuid::new_v4();

        assert!(matches!(
            round_trip(OAuthIntent::Link { user_id }),
            OAuthIntent::Link { user_id: decoded } if decoded == user_id
        ));
        assert!(matches!(round_trip(OAuthIntent::Login), OAuthIntent::Login));
        assert!(matches!(
            round_trip(OAuthIntent::SignUp),
            OAuthIntent::SignUp
        ));
    }

    #[test]
    fn state_without_intent_is_rejected() {
        let json = r#"{"state":"s","nonce":"n","purpose":"oauth_state","iat":0,"exp":0}"#;
        assert!(serde_json::from_str::<OAuthStateClaims>(json).is_err());
    }

    #[test]
    fn link_results_return_to_the_settings_flow() {
        assert_eq!(OAuthIntent::Login.result_param(), LOGIN_RESULT_PARAM);
        assert_eq!(OAuthIntent::SignUp.result_param(), LOGIN_RESULT_PARAM);
        assert_eq!(
            OAuthIntent::Link {
                user_id: Uuid::new_v4()
            }
            .result_param(),
            LINK_RESULT_PARAM
        );
    }
}
