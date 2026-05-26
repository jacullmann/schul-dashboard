use crate::{
    auth::{
        cookies::*,
        token::{LOGOUT, TokenService},
    },
    common::{csrf::generate_csrf_token, password::verify_password},
    error::{AppError, AppResult},
    state::AppState,
};
use axum_extra::extract::CookieJar;
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

pub struct GroupService {
    db: PgPool,
    state: AppState,
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
    ) -> AppResult<CookieJar> {
        let tokens = TokenService::from_state(&self.state)
            .issue_pair(
                user_id,
                email,
                global_role,
                active_group_id,
                None,
                None,
                None,
            )
            .await?;

        let opts = self.state.config.base_cookie_options();

        let csrf = generate_csrf_token();

        Ok(CookieJar::new()
            .add(access_cookie(tokens.access_token, &opts))
            .add(refresh_cookie(tokens.refresh_token, &opts))
            .add(crate::common::csrf::csrf_cookie(&csrf, &opts)))
    }

    pub async fn join_group(
        &self,
        user_id: Uuid,
        email: &str,
        global_role: &str,
        group_name: &str,
        password: &str,
        ip: Option<&str>,
        ua: Option<&str>,
    ) -> AppResult<(CookieJar, Value)> {
        static DUMMY: std::sync::LazyLock<String> = std::sync::LazyLock::new(|| {
            argon2::password_hash::PasswordHasher::hash_password(
                &argon2::Argon2::default(),
                b"__dummy__",
                &argon2::password_hash::SaltString::generate(
                    &mut argon2::password_hash::rand_core::OsRng,
                ),
            )
                .unwrap()
                .to_string()
        });

        let group = sqlx::query!(
            r#"SELECT id, name, passcode_hash FROM groups WHERE name = $1"#,
            group_name
        )
            .fetch_optional(&self.db)
            .await?;

        let hash = group
            .as_ref()
            .map(|g| g.passcode_hash.as_str())
            .unwrap_or(&*DUMMY);

        let valid = verify_password(password.to_string(), hash.to_string()).await?;

        let authenticated = group.is_some() && valid;

        if let Some(ref g) = group {
            let ban = sqlx::query!(
                r#"SELECT id FROM group_bans WHERE tenant_id = $1 AND user_id = $2"#,
                g.id,
                user_id
            )
                .fetch_optional(&self.db)
                .await?;

            if ban.is_some() {
                return Err(AppError::forbidden("You have been banned from this group."));
            }
        }

        sqlx::query!(
            r#"INSERT INTO security_events (event_type, event_status, ip_address, user_agent, metadata)
             VALUES ('group_join', $1, $2::inet, $3, $4)"#,
            if authenticated { "success" } else { "failure" },
            ip, ua,
            json!({ "groupName": group_name, "userId": user_id })
        ).execute(&self.db).await?;

        if !authenticated {
            return Err(AppError::Unauthorized(
                "Invalid group name or password.".into(),
            ));
        }

        let g = group.unwrap();

        let existing = sqlx::query!(
            r#"SELECT id FROM user_roles WHERE user_id = $1 AND role_id = 4 AND tenant_id = $2"#,
            user_id,
            g.id
        )
            .fetch_optional(&self.db)
            .await?;

        if existing.is_none() {
            sqlx::query!(
                r#"INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES ($1, 4, $2)"#,
                user_id,
                g.id
            )
                .execute(&self.db)
                .await?;
        }

        let jar = self
            .issue_session_cookie(user_id, email, global_role, Some(g.id))
            .await?;

        Ok((jar, json!({ "ok": true })))
    }

    pub async fn create_group(
        &self,
        user_id: Uuid,
        email: &str,
        global_role: &str,
        group_name: &str,
        password: &str,
        ip: Option<&str>,
        ua: Option<&str>,
    ) -> AppResult<(CookieJar, Value)> {
        let exists = sqlx::query!(r#"SELECT id FROM groups WHERE name = $1"#, group_name)
            .fetch_optional(&self.db)
            .await?;

        if exists.is_some() {
            sqlx::query!(
                r#"INSERT INTO security_events (event_type, event_status, ip_address, user_agent, metadata)
                 VALUES ('group_create', 'failure', $1::inet, $2, $3)"#,
                ip, ua, json!({ "groupName": group_name })
            ).execute(&self.db).await?;

            return Err(AppError::bad_request("This group name is already taken."));
        }

        let hash = crate::common::password::hash_password(password.to_string()).await?;

        let group = sqlx::query!(
            r#"INSERT INTO groups (name, passcode_hash, owner_id) VALUES ($1, $2, $3) RETURNING id, name"#,
            group_name, hash, user_id
        ).fetch_one(&self.db).await?;

        sqlx::query!(
            r#"INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES ($1, 2, $2)"#,
            user_id,
            group.id
        )
            .execute(&self.db)
            .await?;

        sqlx::query!(
            r#"INSERT INTO security_events (event_type, event_status, ip_address, user_agent, metadata)
             VALUES ('group_create', 'success', $1::inet, $2, $3)"#,
            ip, ua, json!({ "groupName": group.name, "groupId": group.id, "createdBy": user_id })
        ).execute(&self.db).await?;

        let jar = self
            .issue_session_cookie(user_id, email, global_role, Some(group.id))
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
                    "permissions": ur.permissions.unwrap_or(json!({})),
                })
            })
            .collect();

        let active_group = if let Some(gid) = active_group_id {
            match groups.iter().find(|g| g["id"].as_str() == Some(&gid.to_string())) {
                Some(g) => Some(g.clone()),
                None if global_role == Some("superadmin") => {
                    sqlx::query!(
                        r#"SELECT id, name, owner_id, schedule_config, avatar_url, permissions
                           FROM groups WHERE id = $1"#,
                        gid
                    )
                        .fetch_optional(&self.db)
                        .await?
                        .map(|g| json!({
                        "id": g.id, "name": g.name, "ownerId": g.owner_id,
                        "role": "superadmin", "hasUnreadContent": false,
                        "scheduleConfig": g.schedule_config, "avatarUrl": g.avatar_url,
                        "permissions": g.permissions.unwrap_or(json!({})),
                    }))
                }
                None => None,
            }
        } else {
            None
        };

        Ok(json!({
            "authenticated": true,
            "group": active_group.map(|g| json!({
                "id": g["id"], "name": g["name"], "ownerId": g["ownerId"],
                "avatarUrl": g["avatarUrl"], "permissions": g["permissions"],
            })),
            "groups": groups,
        }))
    }

    pub async fn switch_group(
        &self,
        user_id: Uuid,
        email: &str,
        global_role: &str,
        group_id: Uuid,
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
            .issue_session_cookie(user_id, email, global_role, Some(group_id))
            .await?;

        Ok((jar, json!({ "ok": true })))
    }

    pub async fn leave_group(
        &self,
        user_id: Uuid,
        group_id: Uuid,
        active_group_id: Option<Uuid>,
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

            self.issue_session_cookie(user_id, &user.email, &global_role, None)
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
        sqlx::query!(
            r#"INSERT INTO security_events (event_type, event_status, ip_address, user_agent, metadata)
             VALUES ('group_logout', 'success', $1::inet, $2, '{}'::jsonb)"#,
            ip, ua
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
}
