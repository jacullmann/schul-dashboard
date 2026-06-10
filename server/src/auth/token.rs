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
const SESSION_LIMIT: RevokeReason = "session_limit";
const MAX_SESSIONS_PER_USER: i32 = 10;

#[derive(Debug)]
pub struct IssuedTokens {
    pub access_token: String,
    pub refresh_token: String,
}

pub struct IssueTokenParams<'a> {
    pub user_id: Uuid,
    pub email: &'a str,
    pub global_role: &'a str,
    pub active_group_id: Option<Uuid>,
    pub user_agent: Option<&'a str>,
    pub ip_address: Option<&'a str>,
    pub parent: Option<(Uuid, Uuid)>,
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
    use base64::prelude::*;

    BASE64_URL_SAFE_NO_PAD.encode(rand::random::<[u8; 32]>())
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

    pub async fn issue_pair(&self, p: IssueTokenParams<'_>) -> Result<IssuedTokens, AppError> {
        if p.parent.is_none() {
            sqlx::query!(
                r#"UPDATE refresh_tokens
               SET revoked_at = now(), revoked_reason = $1
               WHERE id IN (
                   SELECT id FROM refresh_tokens
                   WHERE user_id = $2
                     AND revoked_at IS NULL
                     AND used_at IS NULL
                     AND expires_at > now()
                   ORDER BY last_used_at ASC
                   LIMIT GREATEST(0, (
                       SELECT COUNT(*) FROM refresh_tokens
                       WHERE user_id = $2
                         AND revoked_at IS NULL
                         AND used_at IS NULL
                         AND expires_at > now()
                   ) - ($3 - 1))
               )"#,
                SESSION_LIMIT,
                p.user_id,
                MAX_SESSIONS_PER_USER,
            )
            .execute(&self.db)
            .await?;
        }

        let role_version =
            sqlx::query_scalar!(r#"SELECT role_version FROM users WHERE id = $1"#, p.user_id)
                .fetch_one(&self.db)
                .await?;

        let refresh_token = generate_opaque_token();

        let token_hash = hash_token(&refresh_token);

        let family_id = p.parent.map(|(_, fid)| fid).unwrap_or_else(Uuid::new_v4);

        let parent_id = p.parent.map(|(pid, _)| pid);

        let expires_at = Utc::now() + Duration::from_std(REFRESH_TOKEN_TTL).unwrap();

        let ua: Option<String> = p.user_agent.map(|s| {
            if s.len() > 512 {
                let mut end = 512;
                while !s.is_char_boundary(end) {
                    end -= 1;
                }
                s[..end].to_string()
            } else {
                s.to_string()
            }
        });
        let ip_parsed: Option<ipnetwork::IpNetwork> = p.ip_address.and_then(|s| s.parse().ok());

        sqlx::query!(
            r#"INSERT INTO refresh_tokens
                (user_id, token_hash, family_id, parent_id, expires_at,
                 user_agent, ip_address, role_version, active_group_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7::inet, $8, $9)"#,
            p.user_id,
            token_hash,
            family_id,
            parent_id,
            expires_at,
            ua,
            ip_parsed,
            role_version,
            p.active_group_id,
        )
        .execute(&self.db)
        .await?;

        let claims = AccessClaims::new(
            p.user_id,
            p.email.to_string(),
            p.global_role.to_string(),
            p.active_group_id,
            ACCESS_TOKEN_TTL,
            role_version as u32,
        );
        let access_token = self
            .jwt
            .sign_access(&claims)
            .map_err(|e| AppError::internal(format!("Failed to sign access token: {e}")))?;

        Ok(IssuedTokens {
            access_token,
            refresh_token,
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
            r#"SELECT id, user_id, family_id, used_at, revoked_at, expires_at, role_version, active_group_id
               FROM refresh_tokens WHERE token_hash = $1"#,
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
            r#"UPDATE refresh_tokens SET used_at = now()
               WHERE id = $1 AND used_at IS NULL AND revoked_at IS NULL
               RETURNING id"#,
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

        if row.role_version != user.role_version {
            tracing::info!(
                "Role version mismatch for user {} (token: {}, db: {}) – denying rotate",
                row.user_id,
                row.role_version,
                user.role_version,
            );
            return Ok(None);
        }

        let issued = self
            .issue_pair(IssueTokenParams {
                user_id: user.user_id,
                email: &user.email,
                global_role: &user.global_role,
                // Preserve the group this session was actually using. Falling back
                // to load_user_claims' "first tenant" silently moved the user to a
                // different group on every refresh.
                active_group_id: row.active_group_id,
                user_agent,
                ip_address,
                parent: Some((row.id, row.family_id)),
            })
            .await?;

        Ok(Some(issued))
    }

    pub async fn reissue_for_group(
        &self,
        presented_token: &str,
        active_group_id: Option<Uuid>,
        user_agent: Option<&str>,
        ip_address: Option<&str>,
    ) -> Result<Option<IssuedTokens>, AppError> {
        let hash = hash_token(presented_token);

        let row = sqlx::query!(
            r#"SELECT id, user_id, family_id, revoked_at, expires_at
               FROM refresh_tokens WHERE token_hash = $1"#,
            hash
        )
        .fetch_optional(&self.db)
        .await?;

        let Some(row) = row else { return Ok(None) };

        // A revoked or expired family cannot be advanced — let the caller start a
        // fresh family. But a token that is merely already-*used* means a
        // concurrent switch/refresh consumed it first; in that case we still
        // advance the SAME family. A transient second live tip is collapsed by
        // list_active_sessions' DISTINCT ON, whereas forking a new family would
        // resurface as a phantom session — the exact bug we are fixing. This is
        // safe because switch reaches us only behind a valid (short-lived) access
        // token, so it is not the unauthenticated replay surface `rotate` guards.
        if row.revoked_at.is_some() || row.expires_at < Utc::now() {
            return Ok(None);
        }

        // Best-effort consume; ignore the rowcount, since losing the race is the
        // case we deliberately tolerate above.
        sqlx::query!(
            r#"UPDATE refresh_tokens SET used_at = now()
               WHERE id = $1 AND used_at IS NULL AND revoked_at IS NULL"#,
            row.id
        )
        .execute(&self.db)
        .await?;

        let user = match self.load_user_claims(row.user_id).await? {
            Some(u) => u,
            None => {
                self.revoke_family(row.family_id, ADMIN_REVOKE).await?;
                return Ok(None);
            }
        };

        let issued = self
            .issue_pair(IssueTokenParams {
                user_id: user.user_id,
                email: &user.email,
                global_role: &user.global_role,
                active_group_id,
                user_agent,
                ip_address,
                parent: Some((row.id, row.family_id)),
            })
            .await?;

        Ok(Some(issued))
    }

    pub async fn revoke_by_token(&self, token: &str, reason: RevokeReason) -> Result<(), AppError> {
        let hash = hash_token(token);

        sqlx::query!(
            r#"UPDATE refresh_tokens SET revoked_at = now(), revoked_reason = $1
               WHERE token_hash = $2 AND revoked_at IS NULL"#,
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
            r#"UPDATE refresh_tokens SET revoked_at = now(), revoked_reason = $1
               WHERE family_id = $2 AND revoked_at IS NULL"#,
            reason,
            family_id,
        )
        .execute(&self.db)
        .await?;
        Ok(())
    }

    pub async fn revoke_current_family(
        &self,
        token: &str,
        reason: RevokeReason,
    ) -> Result<(), AppError> {
        let hash = hash_token(token);

        let row = sqlx::query!(
            r#"SELECT family_id FROM refresh_tokens WHERE token_hash = $1"#,
            hash
        )
        .fetch_optional(&self.db)
        .await?;

        if let Some(r) = row {
            self.revoke_family(r.family_id, reason).await?;
        }

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
                r#"UPDATE refresh_tokens SET revoked_at = now(), revoked_reason = $1
                   WHERE user_id = $2 AND revoked_at IS NULL AND family_id != $3"#,
                reason,
                user_id,
                except,
            )
            .execute(&self.db)
            .await?;
        } else {
            sqlx::query!(
                r#"UPDATE refresh_tokens SET revoked_at = now(), revoked_reason = $1
                   WHERE user_id = $2 AND revoked_at IS NULL"#,
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
            r#"SELECT DISTINCT ON (family_id)
                      family_id, issued_at, last_used_at, user_agent,
                      host(ip_address) as ip_address
               FROM refresh_tokens
               WHERE user_id = $1
                 AND revoked_at IS NULL
                 AND used_at IS NULL
                 AND expires_at > now()
               ORDER BY family_id, last_used_at DESC"#,
            user_id
        )
        .fetch_all(&self.db)
        .await?;

        let mut rows = rows;
        rows.sort_by_key(|r| std::cmp::Reverse(r.last_used_at));

        let mut sessions = Vec::with_capacity(rows.len());

        for row in rows {
            let location = if let Some(ip) = row.ip_address.as_deref() {
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

    pub async fn get_current_family_id(&self, token: &str) -> Result<Option<Uuid>, AppError> {
        let hash = hash_token(token);

        let row = sqlx::query!(
            r#"SELECT family_id FROM refresh_tokens WHERE token_hash = $1"#,
            hash
        )
        .fetch_optional(&self.db)
        .await?;

        Ok(row.map(|r| r.family_id))
    }

    async fn lookup_ip(&self, ip: &str) -> Option<IpLocation> {
        let clean_ip = ip.split('/').next().unwrap_or(ip);

        let url = format!("{}/lookup/{}", self.geoip_url, clean_ip);

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
        let user = sqlx::query!(
            r#"SELECT id, email, role_version FROM users WHERE id = $1"#,
            user_id
        )
        .fetch_optional(&self.db)
        .await?;

        let user = match user {
            None => return Ok(None),
            Some(u) => u,
        };

        let ban = sqlx::query!(r#"SELECT id FROM banned_users WHERE user_id = $1"#, user_id)
            .fetch_optional(&self.db)
            .await?;

        if ban.is_some() {
            return Ok(None);
        }

        let global_role = sqlx::query!(
            r#"SELECT r.name FROM user_roles ur
               JOIN roles r ON r.id = ur.role_id
               WHERE ur.user_id = $1 AND ur.tenant_id IS NULL
               LIMIT 1"#,
            user_id
        )
        .fetch_optional(&self.db)
        .await?
        .map(|r| r.name)
        .unwrap_or_else(|| "user".into());

        Ok(Some(UserClaims {
            user_id: user.id,
            email: user.email,
            global_role,
            role_version: user.role_version,
        }))
    }
}

#[derive(Debug)]
struct UserClaims {
    user_id: Uuid,
    email: String,
    global_role: String,
    role_version: i32,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionInfo {
    pub family_id: Uuid,
    pub issued_at: String,
    pub last_used_at: String,
    pub user_agent: Option<String>,
    pub ip_address: Option<String>,
    pub location: Option<IpLocation>,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IpLocation {
    pub city: Option<String>,
    pub country: Option<String>,
    pub country_code: Option<String>,
}
