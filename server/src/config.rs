use anyhow::{Context, Result};
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct Config {
    pub port: u16,
    pub cors_origin: String,
    pub cookie_domain: String,
    pub cookie_secure: bool,
    pub client_verify_url: String,
    pub database_url: String,
    pub user_jwt_secret: String,
    pub password_reset_jwt_secret: String,
    pub mfa_pending_jwt_secret: String,
    pub oauth_pending_jwt_secret: String,
    pub google_client_id: Option<String>,
    pub google_client_secret: Option<String>,
    pub google_redirect_uri: Option<String>,
    pub encryption_key: String,
    pub user_key_pepper: String,
    pub cloudinary_cloud_name: String,
    pub cloudinary_api_key: String,
    pub cloudinary_api_secret: String,
    pub cloudinary_folder: String,
    pub resend_api_key: String,
    pub email_from: String,
    pub geoip_service_url: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let _ = dotenvy::dotenv();

        let node_env = std::env::var("NODE_ENV").unwrap_or_else(|_| "development".into());
        let is_production = node_env == "production";

        let port = std::env::var("PORT")
            .unwrap_or_else(|_| "3000".into())
            .parse::<u16>()
            .context("PORT must be a valid port number")?;

        let cookie_secure = std::env::var("COOKIE_SECURE")
            .ok()
            .and_then(|v| v.parse::<bool>().ok())
            .unwrap_or(is_production);

        Ok(Self {
            port,
            cors_origin: require("CORS_ORIGIN")?,
            cookie_domain: require("COOKIE_DOMAIN")?,
            cookie_secure,
            client_verify_url: require("CLIENT_VERIFY_URL")?,
            database_url: require("DATABASE_URL")?,
            user_jwt_secret: require_min("USER_JWT_SECRET", 32)?,
            password_reset_jwt_secret: require_min("PASSWORD_RESET_JWT_SECRET", 32)?,
            mfa_pending_jwt_secret: require_min("MFA_PENDING_JWT_SECRET", 32)?,
            oauth_pending_jwt_secret: require_min("OAUTH_PENDING_JWT_SECRET", 32)?,
            google_client_id: std::env::var("GOOGLE_OAUTH_CLIENT_ID").ok(),
            google_client_secret: std::env::var("GOOGLE_OAUTH_CLIENT_SECRET").ok(),
            google_redirect_uri: std::env::var("GOOGLE_OAUTH_REDIRECT_URI").ok(),
            encryption_key: require("ENCRYPTION_KEY")?,
            user_key_pepper: require("USER_KEY_PEPPER")?,
            cloudinary_cloud_name: require("CLOUDINARY_CLOUD_NAME")?,
            cloudinary_api_key: require("CLOUDINARY_API_KEY")?,
            cloudinary_api_secret: require("CLOUDINARY_API_SECRET")?,
            cloudinary_folder: std::env::var("CLOUDINARY_FOLDER")
                .unwrap_or_else(|_| "hausaufgaben".into()),
            resend_api_key: require("RESEND_API_KEY")?,
            email_from: std::env::var("EMAIL_FROM")
                .unwrap_or_else(|_| "schul-dashboard <noreply@schul-dashboard.com>".into()),
            geoip_service_url: std::env::var("GEOIP_SERVICE_URL")
                .unwrap_or_else(|_| "http://geoip-service:8080".into()),
        })
    }

    pub fn base_cookie_options(&self) -> BaseCookieOptions {
        BaseCookieOptions {
            domain: self.cookie_domain.clone(),
            secure: self.cookie_secure,
        }
    }
}

#[derive(Debug, Clone)]
pub struct BaseCookieOptions {
    pub domain: String,
    pub secure: bool,
}

fn require(key: &str) -> Result<String> {
    std::env::var(key).with_context(|| format!("Missing required env var: {key}"))
}

fn require_min(key: &str, min_len: usize) -> Result<String> {
    let val = require(key)?;

    if val.len() < min_len {
        anyhow::bail!("{key} must be at least {min_len} characters long");
    }

    Ok(val)
}

pub const ACCESS_TOKEN_TTL: Duration = Duration::from_secs(15 * 60);
pub const REFRESH_TOKEN_TTL: Duration = Duration::from_secs(30 * 24 * 60 * 60);
pub const MFA_PENDING_TTL: Duration = Duration::from_secs(5 * 60);
pub const PASSWORD_RESET_TTL: Duration = Duration::from_secs(15 * 60);
pub const PASSWORD_RESET_CODE_TTL: Duration = Duration::from_secs(30 * 60);
pub const EMAIL_VERIFY_TTL: Duration = Duration::from_secs(2 * 24 * 60 * 60);

pub const ACCESS_COOKIE: &str = "access_token";
pub const REFRESH_COOKIE: &str = "refresh_token";
pub const REFRESH_COOKIE_PATH: &str = "/api/auth/refresh";
pub const MFA_PENDING_COOKIE: &str = "mfa_pending_token";
pub const CSRF_COOKIE: &str = "csrf_token";
pub const CSRF_HEADER: &str = "x-csrf-token";
