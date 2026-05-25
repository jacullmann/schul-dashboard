use crate::{
    common::jwt::{AccessClaims, JwtService},
    config::{ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL},
    error::AppError,
    state::AppState,
};
use chrono::{Duration, Utc};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

pub type RevokeReason = &'static str;
pub const LOGOUT: RevokeReason = "logout";
pub const LOGOUT_ALL: RevokeReason = "logout_all";
pub const REUSE_DETECTED: RevokeReason = "reuse_detected";
pub const PASSWORD_CHANGE: RevokeReason = "password_change";
pub const ADMIN_REVOKE: RevokeReason = "admin_revoke";
pub const ACCOUNT_DELETED: RevokeReason = "account_deleted";
pub const MFA_CHANGE: RevokeReason = "mfa_change";

#[derive(Debug)]
pub struct IssuedTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub refresh_token_id: Uuid,
    pub family_id: Uuid,
}

pub struct TokenService {
    pub db: PgPool,
    pub jwt: JwtService,
    pub geoip_url: String,
    pub http: reqwest::Client,
}

fn hash_token(token: &str) -> String {
    let mut h = Sha256::new();

    h.update(token.as_bytes());

    hex::encode(h.finalize())
}

fn generate_opaque_token() -> String {
    use rand::RngCore;

    let mut bytes = [0u8; 32];

    rand::rng().fill_bytes(&mut bytes);

    base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, &bytes)
}

impl TokenService {
    pub fn from_state(state: &AppState) -> Self {
        Self {
            db: state.db.clone(),
            jwt: state.jwt.clone(),
            geoip_url: state.config.geoip_service_url.clone(),
            http: state.http.clone(),
        }
    }

    pub async fn issue_pair(
        &self,
        user_id: Uuid,
        email: &str,
        global_role: &str,
        active_group_id: Option<Uuid>,
        user_agent: Option<&str>,
        ip_address: Option<&str>,
        parent: Option<(Uuid, Uuid)>,
    ) -> Result<IssuedTokens, AppError> {
        let refresh_token = generate_opaque_token();

        let token_hash = hash_token(&refresh_token);

        let family_id = parent.map(|(_, fid)| fid).unwrap_or_else(Uuid::new_v4);

        let parent_id = parent.map(|(pid, _)| pid);

        let expires_at = Utc::now() + Duration::from_std(REFRESH_TOKEN_TTL).unwrap();

        let ua = user_agent.map(|s| if s.len() > 512 { &s[..512] } else { s });

        let row = sqlx::query!(
            r#"
            INSERT INTO refresh_tokens
                (user_id, token_hash, family_id, parent_id, expires_at, user_agent, ip_address)
            VALUES ($1, $2, $3, $4, $5, $6, $7::inet)
            RETURNING id, family_id
            "#,
            user_id,
            token_hash,
            family_id,
            parent_id,
            expires_at,
            ua,
            ip_address,
        )
        .fetch_one(&self.db)
        .await?;

        let claims = AccessClaims::new(
            user_id,
            email.to_string(),
            global_role.to_string(),
            active_group_id,
            ACCESS_TOKEN_TTL,
        );
        let access_token = self
            .jwt
            .sign_access(&claims)
            .map_err(|e| AppError::internal(format!("Failed to sign access token: {e}")))?;

        Ok(IssuedTokens {
            access_token,
            refresh_token,
            refresh_token_id: row.id,
            family_id: row.family_id,
        })
    }

    pub async fn rotate(
        &self,
        presented_token: &str,
        user_agent: Option<&str>,
        ip_address: Option<&str>,
    ) -> Result<Option<IssuedTokens>, AppError> {
        let hash = hash_token(presented_token);

        let row = sqlx::query!(
            r#"
            SELECT id, user_id, family_id, used_at, revoked_at, expires_at
            FROM refresh_tokens
            WHERE token_hash = $1
            "#,
            hash
        )
        .fetch_optional(&self.db)
        .await?;

        let row = match row {
            None => return Ok(None),
            Some(r) => r,
        };

        if row.used_at.is_some() || row.revoked_at.is_some() {
            tracing::warn!(
                "Refresh token reuse detected for user {}, family {}",
                row.user_id,
                row.family_id
            );

            self.revoke_family(row.family_id, REUSE_DETECTED).await?;

            return Ok(None);
        }

        if row.expires_at < Utc::now() {
            return Ok(None);
        }

        let updated = sqlx::query!(
            r#"
            UPDATE refresh_tokens
            SET used_at = now()
            WHERE id = $1 AND used_at IS NULL AND revoked_at IS NULL
            RETURNING id
            "#,
            row.id
        )
        .fetch_optional(&self.db)
        .await?;

        if updated.is_none() {
            tracing::warn!("Refresh rotation race on token {}", row.id);

            self.revoke_family(row.family_id, REUSE_DETECTED).await?;

            return Ok(None);
        }

        let user = self.load_user_claims(row.user_id).await?;

        let user = match user {
            None => {
                self.revoke_family(row.family_id, ADMIN_REVOKE).await?;
                return Ok(None);
            }
            Some(u) => u,
        };

        let issued = self
            .issue_pair(
                user.user_id,
                &user.email,
                &user.global_role,
                user.active_group_id,
                user_agent,
                ip_address,
                Some((row.id, row.family_id)),
            )
            .await?;

        Ok(Some(issued))
    }

    pub async fn revoke_by_token(&self, token: &str, reason: RevokeReason) -> Result<(), AppError> {
        let hash = hash_token(token);

        sqlx::query!(
            r#"
            UPDATE refresh_tokens
            SET revoked_at = now(), revoked_reason = $1
            WHERE token_hash = $2 AND revoked_at IS NULL
            "#,
            reason,
            hash,
        )
        .execute(&self.db)
        .await?;
        Ok(())
    }

    pub async fn revoke_family(
        &self,
        family_id: Uuid,
        reason: RevokeReason,
    ) -> Result<(), AppError> {
        sqlx::query!(
            r#"
            UPDATE refresh_tokens
            SET revoked_at = now(), revoked_reason = $1
            WHERE family_id = $2 AND revoked_at IS NULL
            "#,
            reason,
            family_id,
        )
        .execute(&self.db)
        .await?;
        Ok(())
    }

    pub async fn revoke_all_for_user(
        &self,
        user_id: Uuid,
        reason: RevokeReason,
        except_family: Option<Uuid>,
    ) -> Result<(), AppError> {
        if let Some(except) = except_family {
            sqlx::query!(
                r#"
                UPDATE refresh_tokens
                SET revoked_at = now(), revoked_reason = $1
                WHERE user_id = $2 AND revoked_at IS NULL AND family_id != $3
                "#,
                reason,
                user_id,
                except,
            )
            .execute(&self.db)
            .await?;
        } else {
            sqlx::query!(
                r#"
                UPDATE refresh_tokens
                SET revoked_at = now(), revoked_reason = $1
                WHERE user_id = $2 AND revoked_at IS NULL
                "#,
                reason,
                user_id,
            )
            .execute(&self.db)
            .await?;
        }
        Ok(())
    }

    pub async fn list_active_sessions(&self, user_id: Uuid) -> Result<Vec<SessionInfo>, AppError> {
        let rows = sqlx::query!(
            r#"
            SELECT family_id, issued_at, last_used_at, user_agent, ip_address::text as ip_address
            FROM refresh_tokens
            WHERE user_id = $1
              AND revoked_at IS NULL
              AND used_at IS NULL
              AND expires_at > now()
            ORDER BY last_used_at DESC
            "#,
            user_id
        )
        .fetch_all(&self.db)
        .await?;

        let mut sessions = Vec::with_capacity(rows.len());

        for row in rows {
            let location = if let Some(ref ip) = row.ip_address {
                self.lookup_ip(ip).await
            } else {
                None
            };

            sessions.push(SessionInfo {
                family_id: row.family_id,
                issued_at: row.issued_at.to_rfc3339(),
                last_used_at: row.last_used_at.to_rfc3339(),
                user_agent: row.user_agent,
                ip_address: row.ip_address,
                location,
            });
        }

        Ok(sessions)
    }

    async fn lookup_ip(&self, ip: &str) -> Option<IpLocation> {
        if matches!(ip, "127.0.0.1" | "::1" | "localhost") {
            return Some(IpLocation {
                city: Some("Lokaler Host".into()),
                country: Some("Lokales Netzwerk".into()),
                country_code: None,
            });
        }

        let url = format!("{}/lookup/{ip}", self.geoip_url);

        let resp = self
            .http
            .get(&url)
            .timeout(std::time::Duration::from_millis(500))
            .send()
            .await
            .ok()?;

        if !resp.status().is_success() {
            return None;
        }

        let data: serde_json::Value = resp.json().await.ok()?;

        Some(IpLocation {
            city: data["city"].as_str().map(String::from),
            country: data["country"].as_str().map(String::from),
            country_code: data["country_code"].as_str().map(String::from),
        })
    }

    async fn load_user_claims(&self, user_id: Uuid) -> Result<Option<UserClaims>, AppError> {
        let user = sqlx::query!("SELECT id, email FROM users WHERE id = $1", user_id)
            .fetch_optional(&self.db)
            .await?;

        let user = match user {
            None => return Ok(None),
            Some(u) => u,
        };

        let ban = sqlx::query!("SELECT id FROM banned_users WHERE user_id = $1", user_id)
            .fetch_optional(&self.db)
            .await?;

        if ban.is_some() {
            return Ok(None);
        }

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
            "SELECT tenant_id FROM user_roles WHERE user_id = $1 AND tenant_id IS NOT NULL LIMIT 1",
            user_id
        )
        .fetch_optional(&self.db)
        .await?
        .and_then(|r| r.tenant_id);

        Ok(Some(UserClaims {
            user_id: user.id,
            email: user.email,
            global_role,
            active_group_id,
        }))
    }
}

#[derive(Debug)]
struct UserClaims {
    user_id: Uuid,
    email: String,
    global_role: String,
    active_group_id: Option<Uuid>,
}

#[derive(Debug, serde::Serialize)]
pub struct SessionInfo {
    pub family_id: Uuid,
    pub issued_at: String,
    pub last_used_at: String,
    pub user_agent: Option<String>,
    pub ip_address: Option<String>,
    pub location: Option<IpLocation>,
}

#[derive(Debug, serde::Serialize)]
pub struct IpLocation {
    pub city: Option<String>,
    pub country: Option<String>,
    pub country_code: Option<String>,
}
