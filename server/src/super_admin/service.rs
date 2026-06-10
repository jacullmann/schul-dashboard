use crate::{
    auth::token::{ADMIN_REVOKE, TokenService},
    common::role::Role,
    error::{AppError, AppResult},
    state::AppState,
};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

pub struct SuperAdminService {
    db: PgPool,
    tokens: TokenService,
}

impl SuperAdminService {
    pub fn from_state(s: &AppState) -> Self {
        Self {
            db: s.db.clone(),
            tokens: TokenService::from_state(s),
        }
    }

    pub async fn get_stats(&self, tenant_id: Uuid) -> AppResult<Value> {
        let user_count = sqlx::query_scalar!(r#"SELECT COUNT(*) FROM users"#)
            .fetch_one(&self.db)
            .await?
            .unwrap_or(0);

        let item_count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM items WHERE tenant_id = $1"#,
            tenant_id
        )
        .fetch_one(&self.db)
        .await?
        .unwrap_or(0);

        let banned_count = sqlx::query_scalar!(r#"SELECT COUNT(*) FROM banned_users"#)
            .fetch_one(&self.db)
            .await?
            .unwrap_or(0);

        let report_unprocessed =
            sqlx::query_scalar!(r#"SELECT COUNT(*) FROM reports WHERE processed = false"#)
                .fetch_one(&self.db)
                .await?
                .unwrap_or(0);

        let report_total = sqlx::query_scalar!(r#"SELECT COUNT(*) FROM reports"#)
            .fetch_one(&self.db)
            .await?
            .unwrap_or(0);

        let verified_users =
            sqlx::query_scalar!(r#"SELECT COUNT(*) FROM users WHERE email_verified = true"#)
                .fetch_one(&self.db)
                .await?
                .unwrap_or(0);

        let old_items = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM items WHERE tenant_id = $1 AND created_at < now() - interval '90 days'"#,
            tenant_id
        )
            .fetch_one(&self.db)
            .await?
            .unwrap_or(0);

        let new_users_week = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM users WHERE created_at >= now() - interval '7 days'"#
        )
        .fetch_one(&self.db)
        .await?
        .unwrap_or(0);

        let new_items_week = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM items WHERE tenant_id = $1 AND created_at >= now() - interval '7 days'"#,
            tenant_id
        )
            .fetch_one(&self.db)
            .await?
            .unwrap_or(0);

        Ok(json!({
            "userCount": user_count, "itemCount": item_count,
            "bannedCount": banned_count, "reportCount": report_unprocessed,
            "reportCountTotal": report_total,
            "reportCountProcessed": report_total - report_unprocessed,
            "verifiedUsers": verified_users,
            "unverifiedUsers": user_count - verified_users,
            "oldItemsCount": old_items,
            "newUsersThisWeek": new_users_week,
            "newItemsThisWeek": new_items_week,
        }))
    }

    pub async fn cleanup_old_items(&self, tenant_id: Uuid, user_id: Uuid) -> AppResult<Value> {
        let count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM items WHERE tenant_id = $1 AND created_at < now() - interval '90 days'"#,
            tenant_id
        )
            .fetch_one(&self.db)
            .await?
            .unwrap_or(0);

        sqlx::query!(
            r#"DELETE FROM items WHERE tenant_id = $1 AND created_at < now() - interval '90 days'"#,
            tenant_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'admin:cleanup:old_items', $2)"#,
            user_id,
            json!({ "deletedCount": count })
        )
            .execute(&self.db)
            .await?;

        Ok(json!({ "ok": true, "deletedItems": count }))
    }

    pub async fn get_groups(&self) -> AppResult<Value> {
        let groups = sqlx::query!(
            r#"SELECT id, name, owner_id, created_at FROM groups ORDER BY created_at DESC"#
        )
        .fetch_all(&self.db)
        .await?;

        let mut result = vec![];

        for g in groups {
            let member_count = sqlx::query_scalar!(
                r#"SELECT COUNT(*) FROM user_roles WHERE tenant_id = $1"#,
                g.id
            )
            .fetch_one(&self.db)
            .await?
            .unwrap_or(0);

            let item_count =
                sqlx::query_scalar!(r#"SELECT COUNT(*) FROM items WHERE tenant_id = $1"#, g.id)
                    .fetch_one(&self.db)
                    .await?
                    .unwrap_or(0);

            let owner_email =
                sqlx::query_scalar!(r#"SELECT email FROM users WHERE id = $1"#, g.owner_id)
                    .fetch_optional(&self.db)
                    .await?;

            result.push(json!({
                "id": g.id, "name": g.name, "ownerId": g.owner_id,
                "ownerEmail": owner_email, "createdAt": g.created_at,
                "memberCount": member_count, "itemCount": item_count,
            }));
        }
        Ok(json!(result))
    }

    pub async fn delete_group(&self, group_id: Uuid) -> AppResult<Value> {
        sqlx::query!(r#"SELECT id FROM groups WHERE id = $1"#, group_id)
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("Group not found."))?;

        sqlx::query!(r#"DELETE FROM groups WHERE id = $1"#, group_id)
            .execute(&self.db)
            .await?;

        Ok(json!({ "ok": true, "deletedGroupId": group_id }))
    }

    pub async fn get_all_users(&self) -> AppResult<Value> {
        let users = sqlx::query!(
            r#"SELECT u.id, u.email, u.email_verified, u.created_at, u.last_login_at, u.done_setup,
                      r.name as global_role
               FROM users u
               LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.tenant_id IS NULL
               LEFT JOIN roles r ON r.id = ur.role_id"#
        )
        .fetch_all(&self.db)
        .await?;

        let banned = sqlx::query!(r#"SELECT user_id FROM banned_users"#)
            .fetch_all(&self.db)
            .await?;

        let banned_ids: std::collections::HashSet<Uuid> =
            banned.into_iter().map(|r| r.user_id).collect();

        Ok(json!(
            users
                .into_iter()
                .map(|u| json!({
                    "id": u.id, "email": u.email,
                    "role": u.global_role.unwrap_or_else(|| "user".into()),
                    "emailVerified": u.email_verified,
                    "createdAt": u.created_at, "lastLoginAt": u.last_login_at,
                    "doneSetup": u.done_setup,
                    "isBanned": banned_ids.contains(&u.id),
                }))
                .collect::<Vec<_>>()
        ))
    }

    pub async fn get_user_activity(&self, user_id: Uuid) -> AppResult<Value> {
        let rows = sqlx::query!(
            r#"SELECT type, meta, created_at FROM user_activity
               WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200"#,
            user_id
        )
        .fetch_all(&self.db)
        .await?;

        Ok(json!(
            rows.into_iter()
                .map(|r| json!({ "at": r.created_at, "type": r.r#type, "meta": r.meta }))
                .collect::<Vec<_>>()
        ))
    }

    pub async fn ban_user(&self, target_id: Uuid, admin_id: Uuid) -> AppResult<Value> {
        let roles = sqlx::query!(
            r#"SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id
               WHERE ur.user_id = $1"#,
            target_id
        )
        .fetch_all(&self.db)
        .await?;

        if roles.iter().any(|r| r.name == "superadmin") {
            return Err(AppError::bad_request("Admins cannot be banned."));
        }

        sqlx::query!(
            r#"INSERT INTO banned_users (user_id) VALUES ($1) ON CONFLICT DO NOTHING"#,
            target_id
        )
        .execute(&self.db)
        .await?;

        self.tokens
            .revoke_all_for_user(target_id, ADMIN_REVOKE, None)
            .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta)
               VALUES ($1, 'admin:ban:user', $2)"#,
            admin_id,
            json!({ "targetUserId": target_id })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true, "isBanned": true }))
    }

    pub async fn unban_user(&self, target_id: Uuid, admin_id: Uuid) -> AppResult<Value> {
        sqlx::query!(r#"DELETE FROM banned_users WHERE user_id = $1"#, target_id)
            .execute(&self.db)
            .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta)
               VALUES ($1, 'admin:unban:user', $2)"#,
            admin_id,
            json!({ "targetUserId": target_id })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true, "isBanned": false }))
    }

    pub async fn delete_user(&self, target_id: Uuid) -> AppResult<Value> {
        let roles = sqlx::query!(
            r#"SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id
               WHERE ur.user_id = $1"#,
            target_id
        )
        .fetch_all(&self.db)
        .await?;

        if roles.iter().any(|r| r.name == "superadmin") {
            return Err(AppError::forbidden("Admins cannot be deleted."));
        }

        let owned = sqlx::query!(
            r#"SELECT id FROM groups WHERE owner_id = $1 LIMIT 1"#,
            target_id
        )
        .fetch_optional(&self.db)
        .await?;

        if owned.is_some() {
            return Err(AppError::bad_request(
                "User owns groups and cannot be deleted.",
            ));
        }

        sqlx::query!(r#"DELETE FROM users WHERE id = $1"#, target_id)
            .execute(&self.db)
            .await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn update_user_role(
        &self,
        target_id: Uuid,
        role: &str,
        admin_id: Uuid,
    ) -> AppResult<Value> {
        if target_id == admin_id {
            return Err(AppError::bad_request(
                "You cannot modify your own global role.",
            ));
        }

        if role == Role::Superadmin.as_str() {
            let exists = sqlx::query!(
                r#"SELECT id FROM user_roles
                   WHERE user_id = $1 AND role_id = $2 AND tenant_id IS NULL"#,
                target_id,
                Role::Superadmin.db_id() as i32,
            )
            .fetch_optional(&self.db)
            .await?;

            if exists.is_none() {
                sqlx::query!(
                    r#"INSERT INTO user_roles (user_id, role_id, tenant_id)
                       VALUES ($1, $2, NULL)"#,
                    target_id,
                    Role::Superadmin.db_id() as i32,
                )
                .execute(&self.db)
                .await?;
            }
        } else {
            sqlx::query!(
                r#"DELETE FROM user_roles
                   WHERE user_id = $1 AND role_id = $2 AND tenant_id IS NULL"#,
                target_id,
                Role::Superadmin.db_id() as i32,
            )
            .execute(&self.db)
            .await?;
        }

        sqlx::query!(
            r#"UPDATE users SET role_version = role_version + 1 WHERE id = $1"#,
            target_id
        )
        .execute(&self.db)
        .await?;

        self.tokens
            .revoke_all_for_user(target_id, ADMIN_REVOKE, None)
            .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta)
               VALUES ($1, 'admin:role_change', $2)"#,
            admin_id,
            json!({ "targetUserId": target_id, "newRole": role })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn prune_activity(&self, target_id: Uuid, admin_id: Uuid) -> AppResult<Value> {
        sqlx::query!(
            r#"DELETE FROM user_activity
               WHERE user_id = $1 AND created_at < now() - interval '30 days'"#,
            target_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta)
               VALUES ($1, 'admin:prune_logs', $2)"#,
            admin_id,
            json!({ "targetUserId": target_id })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true, "message": "Logs pruned." }))
    }

    pub async fn get_reports(&self) -> AppResult<Value> {
        let rows = sqlx::query!(
            r#"SELECT r.id, r.item_id, r.item_title, r.reason, r.reporter_id, r.reporter_email,
                      r.processed, r.processed_at, r.reported_at,
                      i.type AS "item_type?: String", i.subject AS "item_subject?: String", i.description AS "item_description?: String",
                      i.images AS "item_images?: Value", i.due_date AS "item_due_date?: chrono::DateTime<chrono::Utc>", i.editor_note AS "item_editor_note?: String",
                      i.tenant_id AS "item_tenant_id?: Uuid", u.email AS "creator_email?: String"
               FROM reports r
               LEFT JOIN items i ON i.id = r.item_id
               LEFT JOIN users u ON u.id = i.created_by
               ORDER BY r.created_at DESC"#
        )
            .fetch_all(&self.db)
            .await?;

        Ok(json!(
            rows.into_iter()
                .map(|r| json!({
                    "id": r.id, "itemId": r.item_id, "itemTitle": r.item_title,
                    "reason": r.reason,
                    "reportedBy": r.reporter_id, "reporterEmail": r.reporter_email,
                    "processed": r.processed, "processedAt": r.processed_at,
                    "reportedAt": r.reported_at,
                    "itemType": r.item_type,
                    "itemSubject": r.item_subject,
                    "itemDescription": r.item_description,
                    "itemImages": r.item_images,
                    "itemDueDate": r.item_due_date,
                    "itemEditorNote": r.item_editor_note,
                    "itemTenantId": r.item_tenant_id,
                    "creatorEmail": r.creator_email,
                }))
                .collect::<Vec<_>>()
        ))
    }

    pub async fn process_report(
        &self,
        report_id: Uuid,
        admin_id: Uuid,
        processed: bool,
    ) -> AppResult<Value> {
        let row = sqlx::query!(
            r#"UPDATE reports
               SET processed = $1,
                   processed_at = CASE WHEN $1 THEN now() ELSE NULL END,
                   processed_by = CASE WHEN $1 THEN $2::uuid ELSE NULL END
               WHERE id = $3
               RETURNING processed, processed_at"#,
            processed,
            admin_id as Uuid,
            report_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Report not found."))?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, $2, $3)"#,
            admin_id,
            if processed {
                "admin:report:mark_processed"
            } else {
                "admin:report:mark_unprocessed"
            },
            json!({ "reportId": report_id })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true, "processed": row.processed, "processedAt": row.processed_at }))
    }

    pub async fn delete_report(&self, report_id: Uuid, admin_id: Uuid) -> AppResult<Value> {
        sqlx::query!(r#"DELETE FROM reports WHERE id = $1"#, report_id)
            .execute(&self.db)
            .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta)
               VALUES ($1, 'admin:report:delete', $2)"#,
            admin_id,
            json!({ "reportId": report_id })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn upsert_subject(&self, tenant_id: Uuid, name: &str) -> AppResult<Value> {
        sqlx::query!(
            r#"INSERT INTO subjects (tenant_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING"#,
            tenant_id,
            name
        )
        .execute(&self.db)
        .await?;
        Ok(json!({ "ok": true }))
    }

    pub async fn delete_subject_by_name(&self, tenant_id: Uuid, name: &str) -> AppResult<Value> {
        sqlx::query!(
            r#"DELETE FROM subjects WHERE tenant_id = $1 AND name = $2"#,
            tenant_id,
            name
        )
        .execute(&self.db)
        .await?;
        Ok(json!({ "ok": true }))
    }
}
