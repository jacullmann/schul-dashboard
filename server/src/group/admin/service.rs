use crate::{
    common::password::{hash_password, verify_password},
    error::{AppError, AppResult},
    group::dto::CreateScheduleSubDto,
    state::AppState,
};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

pub struct GroupAdminService {
    db: PgPool,
}

impl GroupAdminService {
    pub fn from_state(s: &AppState) -> Self {
        Self { db: s.db.clone() }
    }

    pub async fn get_stats(&self, tenant_id: Uuid) -> AppResult<Value> {
        let item_count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM items WHERE tenant_id = $1"#,
            tenant_id
        )
        .fetch_one(&self.db)
        .await?
        .unwrap_or(0);

        let member_count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM user_roles WHERE tenant_id = $1"#,
            tenant_id
        )
        .fetch_one(&self.db)
        .await?
        .unwrap_or(0);

        let old_items = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM items WHERE tenant_id = $1 AND created_at < now() - interval '90 days'"#,
            tenant_id
        ).fetch_one(&self.db).await?.unwrap_or(0);

        let subs = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM schedule_subs WHERE tenant_id = $1"#,
            tenant_id
        )
        .fetch_one(&self.db)
        .await?
        .unwrap_or(0);

        Ok(
            json!({ "itemCount": item_count, "subsCount": subs, "oldItemsCount": old_items, "memberCount": member_count }),
        )
    }

    pub async fn get_members(&self, tenant_id: Uuid) -> AppResult<Value> {
        let rows = sqlx::query!(
            r#"SELECT ur.user_id, ur.assigned_at, r.name as role_name
               FROM user_roles ur JOIN roles r ON r.id = ur.role_id
               WHERE ur.tenant_id = $1"#,
            tenant_id
        )
        .fetch_all(&self.db)
        .await?;

        let mut members: Vec<Value> = rows
            .into_iter()
            .map(|r| {
                json!({
                    "userId": r.user_id, "role": r.role_name, "joinedAt": r.assigned_at,
                })
            })
            .collect();

        let role_order = |r: &str| match r {
            "admin" => 0,
            "moderator" => 1,
            _ => 2,
        };

        members.sort_by_key(|m| role_order(m["role"].as_str().unwrap_or("user")));

        Ok(json!(members))
    }

    pub async fn get_banned_users(&self, tenant_id: Uuid) -> AppResult<Value> {
        let rows = sqlx::query!(
            r#"SELECT user_id, banned_at FROM group_bans WHERE tenant_id = $1"#,
            tenant_id
        )
        .fetch_all(&self.db)
        .await?;

        Ok(json!(
            rows.into_iter()
                .map(|r| json!({ "userId": r.user_id, "bannedAt": r.banned_at }))
                .collect::<Vec<_>>()
        ))
    }

    pub async fn revert_ban(
        &self,
        tenant_id: Uuid,
        current_user_id: Uuid,
        target: Uuid,
    ) -> AppResult<Value> {
        sqlx::query!(
            r#"DELETE FROM group_bans WHERE user_id = $1 AND tenant_id = $2"#,
            target,
            tenant_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'group-admin:revert-ban', $2)"#,
            current_user_id, json!({ "targetUserId": target, "tenantId": tenant_id })
        ).execute(&self.db).await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn change_member_role(
        &self,
        tenant_id: Uuid,
        current_user_id: Uuid,
        target: Uuid,
        role: &str,
    ) -> AppResult<Value> {
        if target == current_user_id {
            return Err(AppError::bad_request("You cannot change your own role."));
        }

        let role_id: i32 = match role {
            "admin" => 2,
            "moderator" => 3,
            "user" => 4,
            _ => return Err(AppError::bad_request("Invalid role")),
        };

        let existing = sqlx::query!(
            r#"SELECT id FROM user_roles WHERE user_id = $1 AND tenant_id = $2"#,
            target,
            tenant_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("User is not a member"))?;

        sqlx::query!(
            r#"UPDATE user_roles SET role_id = $1 WHERE id = $2"#,
            role_id,
            existing.id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'group-admin:change-role', $2)"#,
            current_user_id, json!({ "targetUserId": target, "newRole": role })
        ).execute(&self.db).await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn remove_member(
        &self,
        tenant_id: Uuid,
        current_user_id: Uuid,
        target: Uuid,
        ban: bool,
    ) -> AppResult<Value> {
        if target == current_user_id {
            return Err(AppError::bad_request("You cannot remove yourself."));
        }

        let group = sqlx::query!(r#"SELECT owner_id FROM groups WHERE id = $1"#, tenant_id)
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("Group not found"))?;

        if group.owner_id == target {
            return Err(AppError::forbidden("The group owner cannot be removed."));
        }

        let target_role = sqlx::query!(
            r#"SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id
               WHERE ur.user_id = $1 AND ur.tenant_id = $2"#,
            target,
            tenant_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("User is not a member"))?;

        if target_role.name == "admin" && group.owner_id != current_user_id {
            return Err(AppError::forbidden(
                "Admins can only be removed by the owner.",
            ));
        }

        sqlx::query!(
            r#"DELETE FROM user_roles WHERE user_id = $1 AND tenant_id = $2"#,
            target,
            tenant_id
        )
        .execute(&self.db)
        .await?;

        if ban {
            sqlx::query!(
                r#"INSERT INTO group_bans (user_id, tenant_id, banned_by) VALUES ($1, $2, $3)"#,
                target,
                tenant_id,
                current_user_id
            )
            .execute(&self.db)
            .await?;
        }

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'group-admin:remove-member', $2)"#,
            current_user_id, json!({ "targetUserId": target })
        ).execute(&self.db).await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn transfer_ownership(
        &self,
        tenant_id: Uuid,
        current_user_id: Uuid,
        target: Uuid,
    ) -> AppResult<Value> {
        if target == current_user_id {
            return Err(AppError::bad_request("You are already the owner."));
        }

        let group = sqlx::query!(r#"SELECT owner_id FROM groups WHERE id = $1"#, tenant_id)
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("Group not found."))?;

        if group.owner_id != current_user_id {
            return Err(AppError::forbidden(
                "Only the owner can transfer ownership.",
            ));
        }

        let role = sqlx::query!(
            r#"SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id
               WHERE ur.user_id = $1 AND ur.tenant_id = $2"#,
            target,
            tenant_id
        )
        .fetch_optional(&self.db)
        .await?;

        if role.map(|r| r.name).as_deref() != Some("admin") {
            return Err(AppError::bad_request(
                "The new owner must be an administrator.",
            ));
        }

        sqlx::query!(
            r#"UPDATE groups SET owner_id = $1 WHERE id = $2"#,
            target,
            tenant_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'group-admin:transfer-ownership', $2)"#,
            current_user_id, json!({ "targetUserId": target })
        ).execute(&self.db).await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn rename_group(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        name: Option<&str>,
        avatar_url: Option<&str>,
    ) -> AppResult<Value> {
        if let Some(n) = name {
            let n = n.trim();

            let exists = sqlx::query!(
                r#"SELECT id FROM groups WHERE name = $1 AND id != $2"#,
                n,
                tenant_id
            )
            .fetch_optional(&self.db)
            .await?;

            if exists.is_some() {
                return Err(AppError::bad_request("This group name is already taken."));
            }

            sqlx::query!(r#"UPDATE groups SET name = $1 WHERE id = $2"#, n, tenant_id)
                .execute(&self.db)
                .await?;

            sqlx::query!(
                r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'group-admin:rename-group', $2)"#,
                user_id, json!({ "newName": n })
            ).execute(&self.db).await?;
        }
        if let Some(url) = avatar_url {
            let url = if url.trim().is_empty() {
                None
            } else {
                Some(url.trim())
            };

            sqlx::query!(
                r#"UPDATE groups SET avatar_url = $1 WHERE id = $2"#,
                url,
                tenant_id
            )
            .execute(&self.db)
            .await?;
        }
        Ok(json!({ "ok": true }))
    }

    pub async fn update_password(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        old: &str,
        new: &str,
    ) -> AppResult<Value> {
        let group = sqlx::query!(
            r#"SELECT passcode_hash, owner_id FROM groups WHERE id = $1"#,
            tenant_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Group not found"))?;

        if group.owner_id != user_id {
            return Err(AppError::forbidden(
                "Only the owner can change the password.",
            ));
        }

        if !verify_password(old.to_string(), group.passcode_hash).await? {
            return Err(AppError::bad_request("The current password is incorrect."));
        }

        let hash = hash_password(new.to_string()).await?;

        sqlx::query!(
            r#"UPDATE groups SET passcode_hash = $1 WHERE id = $2"#,
            hash,
            tenant_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'group-admin:update-password', $2)"#,
            user_id, json!({ "tenantId": tenant_id })
        ).execute(&self.db).await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn update_schedule_config(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        config: serde_json::Value,
    ) -> AppResult<Value> {
        sqlx::query!(
            r#"UPDATE groups SET schedule_config = $1 WHERE id = $2"#,
            config,
            tenant_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'group-admin:update-schedule-config', $2)"#,
            user_id, json!({ "tenantId": tenant_id })
        ).execute(&self.db).await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn delete_group(&self, tenant_id: Uuid, user_id: Uuid) -> AppResult<Value> {
        let group = sqlx::query!(r#"SELECT owner_id FROM groups WHERE id = $1"#, tenant_id)
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("Group not found"))?;

        if group.owner_id != user_id {
            return Err(AppError::forbidden("Only the owner can delete this group."));
        }

        sqlx::query!(r#"DELETE FROM groups WHERE id = $1"#, tenant_id)
            .execute(&self.db)
            .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'group-admin:delete-group', $2)"#,
            user_id, json!({ "tenantId": tenant_id })
        ).execute(&self.db).await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn cleanup_old_items(&self, tenant_id: Uuid, user_id: Uuid) -> AppResult<Value> {
        let old = sqlx::query!(
            r#"SELECT id FROM items WHERE tenant_id = $1 AND created_at < now() - interval '90 days'"#,
            tenant_id
        )
        .fetch_all(&self.db)
        .await?;

        let count = old.len();

        sqlx::query!(
            r#"DELETE FROM items WHERE tenant_id = $1 AND created_at < now() - interval '90 days'"#,
            tenant_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'group-admin:cleanup', $2)"#,
            user_id, json!({ "deletedCount": count })
        ).execute(&self.db).await?;

        Ok(json!({ "ok": true, "deletedItems": count }))
    }

    pub async fn get_subjects(&self, tenant_id: Uuid) -> AppResult<Value> {
        let rows = sqlx::query!(
            r#"SELECT id, name, is_active FROM subjects WHERE tenant_id = $1 ORDER BY name"#,
            tenant_id
        )
        .fetch_all(&self.db)
        .await?;

        Ok(json!(
            rows.into_iter()
                .map(|r| json!({ "id": r.id, "name": r.name, "isActive": r.is_active }))
                .collect::<Vec<_>>()
        ))
    }

    pub async fn create_subject(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        name: &str,
    ) -> AppResult<Value> {
        let row = sqlx::query!(
            r#"INSERT INTO subjects (tenant_id, name, is_active) VALUES ($1, $2, true) RETURNING id, name, is_active"#,
            tenant_id, name.trim()
        ).fetch_one(&self.db).await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'group-admin:subject:create', $2)"#,
            user_id, json!({ "subjectId": row.id, "name": row.name })
        ).execute(&self.db).await?;

        Ok(json!({ "id": row.id, "name": row.name, "isActive": row.is_active }))
    }

    pub async fn update_subject(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        id: Uuid,
        name: Option<&str>,
        is_active: Option<bool>,
    ) -> AppResult<Value> {
        sqlx::query!(
            r#"SELECT id FROM subjects WHERE id = $1 AND tenant_id = $2"#,
            id,
            tenant_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Subject not found"))?;

        if let Some(n) = name {
            sqlx::query!(
                r#"UPDATE subjects SET name = $1 WHERE id = $2"#,
                n.trim(),
                id
            )
            .execute(&self.db)
            .await?;
        }

        if let Some(a) = is_active {
            sqlx::query!(r#"UPDATE subjects SET is_active = $1 WHERE id = $2"#, a, id)
                .execute(&self.db)
                .await?;
        }
        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'group-admin:subject:update', $2)"#,
            user_id, json!({ "subjectId": id })
        ).execute(&self.db).await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn delete_subject(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        id: Uuid,
    ) -> AppResult<Value> {
        sqlx::query!(
            r#"SELECT id FROM subjects WHERE id = $1 AND tenant_id = $2"#,
            id,
            tenant_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Subject not found"))?;

        let refs = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM schedules WHERE subject_id = $1"#,
            id
        )
        .fetch_one(&self.db)
        .await?
        .unwrap_or(0)
            + sqlx::query_scalar!(r#"SELECT COUNT(*) FROM courses WHERE subject_id = $1"#, id)
                .fetch_one(&self.db)
                .await?
                .unwrap_or(0);

        if refs > 0 {
            return Err(AppError::bad_request(
                "Subject is still referenced. Deactivate it instead.",
            ));
        }

        sqlx::query!(r#"DELETE FROM subjects WHERE id = $1"#, id)
            .execute(&self.db)
            .await?;
        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'group-admin:subject:delete', $2)"#,
            user_id, json!({ "subjectId": id })
        ).execute(&self.db).await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn get_schedule(&self, tenant_id: Uuid) -> AppResult<Value> {
        let rows = sqlx::query!(
            r#"SELECT s.id, s.day, s.slot, s.duration, s.room, s.course_id,
                      sub.id as sid, sub.name as sname, c.id as cid, c.name as cname
               FROM schedules s
               LEFT JOIN subjects sub ON sub.id = s.subject_id
               LEFT JOIN courses c ON c.id = s.course_id
               WHERE s.tenant_id = $1"#,
            tenant_id
        )
        .fetch_all(&self.db)
        .await?;

        Ok(json!(rows.into_iter().map(|l| json!({
            "id": l.id, "day": l.day, "slot": l.slot, "duration": l.duration, "room": l.room,
            "courseId": l.course_id,
            "subjects": l.sid.map(|id| json!({ "id": id, "name": l.sname })),
            "courses": l.cid.map(|id| json!({ "id": id, "name": l.cname })),
        })).collect::<Vec<_>>()))
    }

    pub async fn get_schedule_subs(&self, tenant_id: Uuid) -> AppResult<Value> {
        let rows = sqlx::query!(
            r#"SELECT id, lesson_id, day, slot, duration, subject, room, cancelled, hide, created_at FROM schedule_subs WHERE tenant_id = $1"#,
            tenant_id
        ).fetch_all(&self.db).await?;
        Ok(json!(
            rows.into_iter()
                .map(|s| json!({
                    "id": s.id, "lessonId": s.lesson_id, "day": s.day, "slot": s.slot,
                    "duration": s.duration, "subject": s.subject, "room": s.room,
                    "cancelled": s.cancelled, "hide": s.hide, "createdAt": s.created_at,
                }))
                .collect::<Vec<_>>()
        ))
    }

    pub async fn create_schedule_sub(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        dto: CreateScheduleSubDto,
    ) -> AppResult<Value> {
        let day_str = dto.day.map(|d| d.to_string());
        let row = sqlx::query!(
            r#"INSERT INTO schedule_subs (tenant_id, lesson_id, day, slot, duration, subject, room, cancelled, hide)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               RETURNING id, lesson_id, day, slot, duration, subject, room, cancelled, hide, created_at"#,
            tenant_id, dto.lesson_id, day_str.as_deref(), dto.slot, dto.duration,
            dto.subject, dto.room, dto.cancelled.unwrap_or(false), dto.hide.unwrap_or(false)
        ).fetch_one(&self.db).await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'schedule:sub:create', $2)"#,
            user_id, json!({ "lessonId": dto.lesson_id })
        ).execute(&self.db).await?;

        Ok(json!({
            "id": row.id, "lessonId": row.lesson_id, "day": row.day, "slot": row.slot,
            "duration": row.duration, "subject": row.subject, "room": row.room,
            "cancelled": row.cancelled, "hide": row.hide, "createdAt": row.created_at,
        }))
    }

    pub async fn delete_schedule_sub(&self, tenant_id: Uuid, id: Uuid) -> AppResult<Value> {
        sqlx::query!(
            r#"DELETE FROM schedule_subs WHERE id = $1 AND tenant_id = $2"#,
            id,
            tenant_id
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn create_announcement(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        content: &str,
        color: Option<&str>,
    ) -> AppResult<Value> {
        let row = sqlx::query!(
            r#"INSERT INTO announcements (tenant_id, content, color, created_by) VALUES ($1, $2, $3, $4) RETURNING id, content, color, created_by, created_at"#,
            tenant_id, content, color.unwrap_or("warn"), user_id
        ).fetch_one(&self.db).await?;

        Ok(
            json!({ "id": row.id, "content": row.content, "color": row.color, "createdBy": row.created_by, "createdAt": row.created_at }),
        )
    }

    pub async fn delete_announcement(&self, tenant_id: Uuid, id: Uuid) -> AppResult<Value> {
        sqlx::query!(
            r#"SELECT id FROM announcements WHERE id = $1 AND tenant_id = $2"#,
            id,
            tenant_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Announcement not found"))?;

        sqlx::query!(r#"DELETE FROM announcements WHERE id = $1"#, id)
            .execute(&self.db)
            .await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn get_permissions(&self, tenant_id: Uuid) -> AppResult<Value> {
        let group = sqlx::query!(r#"SELECT permissions FROM groups WHERE id = $1"#, tenant_id)
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("Group not found"))?;

        let defaults = json!({
            "edit_group_general": "moderator", "edit_subjects_courses": "admin",
            "edit_schedule": "admin", "create_items": "user", "upload_images": "user",
            "manage_notes": "moderator", "send_messages": "user",
            "manage_schedule_changes": "moderator", "manage_announcements": "moderator",
            "moderate_members": "moderator", "delete_other_content": "moderator",
        });

        let mut merged = defaults.as_object().unwrap().clone();

        if let Some(obj) = group.permissions.as_object() {
            for (k, v) in obj {
                merged.insert(k.clone(), v.clone());
            }
        }

        Ok(json!({ "permissions": merged }))
    }

    pub async fn update_permissions(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        permissions: serde_json::Value,
    ) -> AppResult<Value> {
        let valid_keys = [
            "edit_group_general",
            "edit_subjects_courses",
            "edit_schedule",
            "create_items",
            "upload_images",
            "manage_notes",
            "send_messages",
            "manage_schedule_changes",
            "manage_announcements",
            "moderate_members",
            "delete_other_content",
        ];
        let valid_roles = ["user", "moderator", "admin"];

        let group = sqlx::query!(r#"SELECT permissions FROM groups WHERE id = $1"#, tenant_id)
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("Group not found"))?;

        let mut current = group.permissions.as_object().cloned().unwrap_or_default();

        if let Some(obj) = permissions.as_object() {
            for (k, v) in obj {
                if valid_keys.contains(&k.as_str())
                    && let Some(r) = v.as_str()
                    && valid_roles.contains(&r)
                {
                    current.insert(k.clone(), v.clone());
                }
            }
        }

        let merged = serde_json::Value::Object(current.clone());

        sqlx::query!(
            r#"UPDATE groups SET permissions = $1 WHERE id = $2"#,
            merged,
            tenant_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'group-admin:update-permissions', $2)"#,
            user_id, json!({ "permissions": merged })
        ).execute(&self.db).await?;

        Ok(json!({ "ok": true, "permissions": current }))
    }
}
