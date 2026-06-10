use crate::{
    auth::{
        cookies::*,
        token::{LOGOUT, TokenService},
    },
    common::{csrf::generate_csrf_token, permission::GroupPermissions, role::Role},
    error::{AppError, AppResult},
    state::AppState,
};
use axum_extra::extract::CookieJar;
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

pub struct CreateGroupParams<'a> {
    pub user_id: Uuid,
    pub email: &'a str,
    pub global_role: &'a str,
    pub group_name: &'a str,
    pub avatar_url: Option<&'a str>,
    pub ip: Option<&'a str>,
    pub ua: Option<&'a str>,
    pub current_refresh: Option<&'a str>,
}

pub struct AcceptInviteParams<'a> {
    pub user_id: Uuid,
    pub email: &'a str,
    pub global_role: &'a str,
    pub token: &'a str,
    pub ip: Option<&'a str>,
    pub ua: Option<&'a str>,
    pub current_refresh: Option<&'a str>,
}

pub struct GroupService {
    db: PgPool,
    state: AppState,
}

#[derive(Clone, Copy, Default)]
pub struct SessionOrigin<'a> {
    pub current_refresh: Option<&'a str>,
    pub user_agent: Option<&'a str>,
    pub ip_address: Option<&'a str>,
}

impl GroupService {
    pub fn from_state(s: &AppState) -> Self {
        Self {
            db: s.db.clone(),
            state: s.clone(),
        }
    }

    async fn issue_session_cookie(
        &self,
        user_id: Uuid,
        email: &str,
        global_role: &str,
        active_group_id: Option<Uuid>,
        origin: SessionOrigin<'_>,
    ) -> AppResult<CookieJar> {
        let svc = TokenService::from_state(&self.state);

        let tokens = match origin.current_refresh.filter(|t| !t.is_empty()) {
            Some(rt) => match svc
                .reissue_for_group(rt, active_group_id, origin.user_agent, origin.ip_address)
                .await?
            {
                Some(t) => t,
                None => {
                    self.issue_new_family(user_id, email, global_role, active_group_id, origin)
                        .await?
                }
            },
            None => {
                self.issue_new_family(user_id, email, global_role, active_group_id, origin)
                    .await?
            }
        };

        let opts = self.state.config.base_cookie_options();

        let csrf = generate_csrf_token();

        Ok(CookieJar::new()
            .add(access_cookie(tokens.access_token, &opts))
            .add(refresh_cookie(tokens.refresh_token, &opts))
            .add(crate::common::csrf::csrf_cookie(&csrf, &opts)))
    }

    async fn issue_new_family(
        &self,
        user_id: Uuid,
        email: &str,
        global_role: &str,
        active_group_id: Option<Uuid>,
        origin: SessionOrigin<'_>,
    ) -> AppResult<crate::auth::token::IssuedTokens> {
        TokenService::from_state(&self.state)
            .issue_pair(crate::auth::token::IssueTokenParams {
                user_id,
                email,
                global_role,
                active_group_id,
                user_agent: origin.user_agent,
                ip_address: origin.ip_address,
                parent: None,
            })
            .await
    }

    pub async fn create_group(
        &self,
        params: CreateGroupParams<'_>,
    ) -> AppResult<(CookieJar, Value)> {
        let user_id = params.user_id;
        let email = params.email;
        let global_role = params.global_role;
        let group_name = params.group_name;
        let avatar_url = params.avatar_url;
        let ip = params.ip;
        let ua = params.ua;
        let ip_parsed: Option<ipnetwork::IpNetwork> = ip.and_then(|s| s.parse().ok());

        let group = sqlx::query!(
            r#"INSERT INTO groups (name, avatar_url, owner_id) VALUES ($1, $2, $3) RETURNING id, name"#,
            group_name,
            avatar_url,
            user_id
        )
            .fetch_one(&self.db)
            .await?;

        let group_id = group.id;
        let group_name_str = group.name;

        sqlx::query!(
            r#"INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES ($1, $2, $3)"#,
            user_id,
            Role::Admin.db_id() as i32,
            group_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO security_events (event_type, event_status, ip_address, user_agent, metadata)
             VALUES ('group_create', 'success', $1::inet, $2, $3)"#,
            ip_parsed, ua, json!({ "groupName": group_name_str, "groupId": group_id, "createdBy": user_id })
        ).execute(&self.db).await?;

        let jar = self
            .issue_session_cookie(
                user_id,
                email,
                global_role,
                Some(group_id),
                SessionOrigin {
                    current_refresh: params.current_refresh,
                    user_agent: ua,
                    ip_address: ip,
                },
            )
            .await?;
        Ok((jar, json!({ "ok": true })))
    }

    pub async fn get_status(
        &self,
        user_id: Option<Uuid>,
        active_group_id: Option<Uuid>,
        global_role: Option<&str>,
    ) -> AppResult<Value> {
        let Some(uid) = user_id else {
            return Ok(json!({ "authenticated": false, "groups": [] }));
        };

        let user_roles = sqlx::query!(
            r#"SELECT ur.tenant_id, g.id as gid, g.name as gname, g.owner_id, g.schedule_config,
                      g.avatar_url, g.permissions, r.name as role_name
               FROM user_roles ur
               JOIN groups g ON g.id = ur.tenant_id
               JOIN roles r ON r.id = ur.role_id
               WHERE ur.user_id = $1 AND ur.tenant_id IS NOT NULL"#,
            uid
        )
        .fetch_all(&self.db)
        .await?;

        let groups: Vec<Value> = user_roles
            .into_iter()
            .map(|ur| {
                json!({
                    "id": ur.gid, "name": ur.gname, "ownerId": ur.owner_id,
                    "role": ur.role_name, "hasUnreadContent": false,
                    "scheduleConfig": ur.schedule_config, "avatarUrl": ur.avatar_url,
                    "permissions": ur.permissions,
                })
            })
            .collect();

        let active_group = if let Some(gid) = active_group_id {
            match groups
                .iter()
                .find(|g| g["id"].as_str() == Some(&gid.to_string()))
            {
                Some(g) => Some(g.clone()),
                None if global_role == Some("superadmin") => sqlx::query!(
                    r#"SELECT id, name, owner_id, schedule_config, avatar_url, permissions
                           FROM groups WHERE id = $1"#,
                    gid
                )
                .fetch_optional(&self.db)
                .await?
                .map(|g| {
                    json!({
                        "id": g.id, "name": g.name, "ownerId": g.owner_id,
                        "role": "superadmin", "hasUnreadContent": false,
                        "scheduleConfig": g.schedule_config, "avatarUrl": g.avatar_url,
                        "permissions": g.permissions,
                    })
                }),
                None => None,
            }
        } else {
            None
        };

        let active_permission_keys: Vec<&'static str> = if let Some(ref g) = active_group {
            let is_superadmin = global_role == Some("superadmin");
            let is_owner = g["ownerId"].as_str() == Some(&uid.to_string());

            if is_superadmin || is_owner {
                crate::common::permission::Permission::ALL
                    .iter()
                    .map(|p| p.as_str())
                    .collect()
            } else {
                let tenant_role = g["role"]
                    .as_str()
                    .map(Role::from_str_or_user)
                    .unwrap_or(Role::User);
                let raw_perms = g.get("permissions").cloned().unwrap_or(json!({}));
                let perms = GroupPermissions::from_json_with_defaults(&raw_perms);
                perms.allowed_keys_for_role(tenant_role)
            }
        } else {
            vec![]
        };

        Ok(json!({
            "authenticated": true,
            "group": active_group.map(|g| json!({
                "id": g["id"], "name": g["name"], "ownerId": g["ownerId"],
                "avatarUrl": g["avatarUrl"], "permissions": g["permissions"],
            })),
            "groups": groups,
            "activePermissions": active_permission_keys,
        }))
    }

    pub async fn switch_group(
        &self,
        user_id: Uuid,
        email: &str,
        global_role: &str,
        group_id: Uuid,
        origin: SessionOrigin<'_>,
    ) -> AppResult<(CookieJar, Value)> {
        if global_role == "superadmin" {
            sqlx::query!(r#"SELECT id FROM groups WHERE id = $1"#, group_id)
                .fetch_optional(&self.db)
                .await?
                .ok_or_else(|| AppError::not_found("Group not found."))?;
        } else {
            let membership = sqlx::query!(
                r#"SELECT tenant_id FROM user_roles WHERE user_id = $1 AND tenant_id = $2"#,
                user_id,
                group_id
            )
            .fetch_optional(&self.db)
            .await?;

            if membership.is_none() {
                return Err(AppError::forbidden("You do not have access to this group."));
            }
        }

        let jar = self
            .issue_session_cookie(user_id, email, global_role, Some(group_id), origin)
            .await?;

        Ok((jar, json!({ "ok": true })))
    }

    pub async fn leave_group(
        &self,
        user_id: Uuid,
        group_id: Uuid,
        active_group_id: Option<Uuid>,
        origin: SessionOrigin<'_>,
    ) -> AppResult<CookieJar> {
        let group = sqlx::query!(r#"SELECT owner_id FROM groups WHERE id = $1"#, group_id)
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("Group not found."))?;

        if group.owner_id == user_id {
            return Err(AppError::forbidden("The owner cannot leave the group."));
        }

        let role = sqlx::query!(
            r#"SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id
               WHERE ur.user_id = $1 AND ur.tenant_id = $2"#,
            user_id,
            group_id
        )
        .fetch_optional(&self.db)
        .await?;

        if role.as_ref().map(|r| r.name.as_str()) == Some("admin") {
            return Err(AppError::forbidden(
                "Admins cannot leave the group directly.",
            ));
        }

        sqlx::query!(
            r#"DELETE FROM user_roles WHERE user_id = $1 AND tenant_id = $2"#,
            user_id,
            group_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"DELETE FROM user_courses
               WHERE user_id = $1
                 AND course_id IN (SELECT id FROM courses WHERE tenant_id = $2)"#,
            user_id,
            group_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'group:leave', $2)"#,
            user_id,
            json!({ "groupId": group_id })
        )
        .execute(&self.db)
        .await?;

        let jar = if active_group_id == Some(group_id) {
            let user = sqlx::query!(r#"SELECT email FROM users WHERE id = $1"#, user_id)
                .fetch_one(&self.db)
                .await?;

            let global_role = sqlx::query!(
                r#"SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id
                   WHERE ur.user_id = $1 AND ur.tenant_id IS NULL LIMIT 1"#,
                user_id
            )
            .fetch_optional(&self.db)
            .await?
            .map(|r| r.name)
            .unwrap_or_else(|| "user".into());

            self.issue_session_cookie(user_id, &user.email, &global_role, None, origin)
                .await?
        } else {
            CookieJar::new()
        };

        Ok(jar)
    }

    pub async fn logout(
        &self,
        jar: CookieJar,
        ip: Option<&str>,
        ua: Option<&str>,
    ) -> AppResult<CookieJar> {
        let ip_parsed: Option<ipnetwork::IpNetwork> = ip.and_then(|s| s.parse().ok());

        sqlx::query!(
            r#"INSERT INTO security_events (event_type, event_status, ip_address, user_agent, metadata)
             VALUES ('group_logout', 'success', $1::inet, $2, '{}'::jsonb)"#,
            ip_parsed, ua
        ).execute(&self.db).await?;

        let opts = self.state.config.base_cookie_options();

        if let Some(token) = jar
            .get(crate::config::REFRESH_COOKIE)
            .map(|c| c.value().to_string())
        {
            let _ = TokenService::from_state(&self.state)
                .revoke_by_token(&token, LOGOUT)
                .await;
        }

        Ok(jar
            .add(clear_access_cookie(&opts))
            .add(clear_refresh_cookie(&opts)))
    }

    pub async fn create_invite(&self, tenant_id: Uuid, user_id: Uuid) -> AppResult<Value> {
        let token = hex::encode(rand::random::<[u8; 32]>());
        let expires_at = chrono::Utc::now() + chrono::Duration::days(7);

        sqlx::query!(
            "INSERT INTO group_invites (token, tenant_id, created_by, expires_at) VALUES ($1, $2, $3, $4)",
            token.clone(),
            tenant_id,
            user_id,
            expires_at
        )
            .execute(&self.db)
            .await?;

        Ok(json!({ "token": token }))
    }

    pub async fn get_invite(&self, token: &str) -> AppResult<Value> {
        let invite = sqlx::query!(
            r#"SELECT g.name,
                      g.avatar_url,
                      (SELECT COUNT(*) FROM user_roles WHERE tenant_id = g.id) AS "member_count!"
               FROM group_invites gi
               JOIN groups g ON g.id = gi.tenant_id
               WHERE gi.token = $1 AND gi.expires_at > now() AND gi.used_at IS NULL AND gi.revoked_at IS NULL"#,
            token
        )
        .fetch_optional(&self.db)
        .await?;

        let invite = match invite {
            Some(r) => r,
            None => {
                return Err(AppError::BadRequest(
                    "Invalid or expired invite token.".into(),
                ));
            }
        };

        Ok(json!({
            "valid": true,
            "groupName": invite.name,
            "avatarUrl": invite.avatar_url,
            "memberCount": invite.member_count,
        }))
    }

    pub async fn accept_invite(
        &self,
        params: AcceptInviteParams<'_>,
    ) -> AppResult<(CookieJar, Value)> {
        let user_id = params.user_id;
        let email = params.email;
        let global_role = params.global_role;
        let token = params.token;
        let ip = params.ip;
        let ua = params.ua;

        let mut tx = self.db.begin().await?;

        let invite = sqlx::query!(
            "UPDATE group_invites SET used_at = now(), used_by = $2 WHERE token = $1 AND expires_at > now() AND used_at IS NULL AND revoked_at IS NULL RETURNING tenant_id",
            token,
            user_id
        )
        .fetch_optional(&mut *tx)
        .await?;

        let group_id: Uuid = match invite {
            Some(row) => row.tenant_id,
            None => {
                return Err(AppError::BadRequest(
                    "Invalid or expired invite token.".into(),
                ));
            }
        };

        let ban = sqlx::query!(
            "SELECT id FROM group_bans WHERE tenant_id = $1 AND user_id = $2",
            group_id,
            user_id
        )
        .fetch_optional(&mut *tx)
        .await?;

        if ban.is_some() {
            return Err(AppError::forbidden("You have been banned from this group."));
        }

        let existing = sqlx::query!(
            "SELECT id FROM user_roles WHERE user_id = $1 AND tenant_id = $2",
            user_id,
            group_id
        )
        .fetch_optional(&mut *tx)
        .await?;

        if existing.is_none() {
            sqlx::query!(
                "INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES ($1, 4, $2)",
                user_id,
                group_id
            )
            .execute(&mut *tx)
            .await?;
        }

        let ip_parsed: Option<ipnetwork::IpNetwork> = ip.and_then(|s| s.parse().ok());

        sqlx::query!(
            "INSERT INTO security_events (event_type, event_status, ip_address, user_agent, metadata) VALUES ('group_invite_accept', 'success', $1::inet, $2, $3)",
            ip_parsed,
            ua,
            json!({ "groupId": group_id, "userId": user_id, "token": token })
        )
            .execute(&mut *tx)
            .await?;

        sqlx::query!(
            "INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'group:join', $2)",
            user_id,
            json!({ "groupId": group_id, "by": "invite" })
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        let jar = self
            .issue_session_cookie(
                user_id,
                email,
                global_role,
                Some(group_id),
                SessionOrigin {
                    current_refresh: params.current_refresh,
                    user_agent: ua,
                    ip_address: ip,
                },
            )
            .await?;

        Ok((jar, json!({ "ok": true, "groupId": group_id })))
    }
}
