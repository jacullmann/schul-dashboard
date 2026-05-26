use crate::{
    common::{name_generator::generate_user_name, permission::check_role_permission},
    error::{AppError, AppResult},
    state::AppState,
};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

pub struct MessagesService {
    db: PgPool,
}

impl MessagesService {
    pub fn from_state(s: &AppState) -> Self {
        Self { db: s.db.clone() }
    }

    pub async fn get_messages(&self, tenant_id: Uuid, user_id: Uuid) -> AppResult<Value> {
        let state = sqlx::query!(
            r#"SELECT last_messages_visit_at FROM user_tenant_state WHERE user_id = $1 AND tenant_id = $2"#,
            user_id, tenant_id
        ).fetch_optional(&self.db).await?;

        let last_visit_at = state.and_then(|s| s.last_messages_visit_at);

        let msgs = sqlx::query!(
            r#"
            SELECT id, tenant_id, user_id, content, parent_id, created_at, updated_at
            FROM (
                SELECT id, tenant_id, user_id, content, parent_id, created_at, updated_at
                FROM group_messages
                WHERE tenant_id = $1
                ORDER BY created_at DESC
                LIMIT 100
            ) sub
            ORDER BY created_at ASC
            "#,
            tenant_id
        )
            .fetch_all(&self.db)
            .await?;

        let db2 = self.db.clone();

        tokio::spawn(async move {
            let _ = sqlx::query!(
                r#"INSERT INTO user_tenant_state (user_id, tenant_id, last_messages_visit_at)
                 VALUES ($1, $2, now()) ON CONFLICT (user_id, tenant_id)
                 DO UPDATE SET last_messages_visit_at = now()"#,
                user_id,
                tenant_id
            )
                .execute(&db2)
                .await;
        });

        if msgs.is_empty() {
            return Ok(json!({ "messages": [], "lastVisitAt": last_visit_at }));
        }

        let parent_ids: Vec<Uuid> = msgs
            .iter()
            .filter_map(|m| m.parent_id)
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();

        let mut parent_map = std::collections::HashMap::new();

        if !parent_ids.is_empty() {
            let parents = sqlx::query!(
                r#"SELECT id, user_id, content, tenant_id FROM group_messages WHERE id = ANY($1)"#,
                &parent_ids
            )
                .fetch_all(&self.db)
                .await?;

            for p in parents {
                parent_map.insert(
                    p.id,
                    (
                        p.content,
                        generate_user_name(&p.user_id.to_string(), &p.tenant_id.to_string()),
                    ),
                );
            }
        }

        let result: Vec<Value> = msgs
            .into_iter()
            .map(|m| {
                let sender = generate_user_name(&m.user_id.to_string(), &m.tenant_id.to_string());

                let mut v = json!({
                    "id": m.id, "tenantId": m.tenant_id, "userId": m.user_id,
                    "senderName": sender, "content": m.content,
                    "parentId": m.parent_id,
                    "createdAt": m.created_at, "updatedAt": m.updated_at,
                });

                if let Some(pid) = m.parent_id {
                    if let Some((pc, ps)) = parent_map.get(&pid) {
                        v["parentContent"] = json!(pc);
                        v["parentSenderName"] = json!(ps);
                    }
                }
                v
            })
            .collect();

        Ok(json!({ "messages": result, "lastVisitAt": last_visit_at }))
    }

    pub async fn mark_read(&self, tenant_id: Uuid, user_id: Uuid) -> AppResult<()> {
        sqlx::query!(
            r#"INSERT INTO user_tenant_state (user_id, tenant_id, last_messages_visit_at)
             VALUES ($1, $2, now()) ON CONFLICT (user_id, tenant_id)
             DO UPDATE SET last_messages_visit_at = now()"#,
            user_id,
            tenant_id
        )
            .execute(&self.db)
            .await?;

        Ok(())
    }

    pub async fn create_message(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        tenant_role: Option<&str>,
        global_role: &str,
        content: &str,
        parent_id: Option<Uuid>,
    ) -> AppResult<Value> {
        let group = sqlx::query!(
            r#"SELECT permissions, owner_id FROM groups WHERE id = $1"#,
            tenant_id
        )
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("Group not found"))?;

        if global_role != "superadmin" && group.owner_id != user_id {
            let allowed = group
                .permissions
                .as_ref()
                .and_then(|p| p["send_messages"].as_str().map(String::from))
                .unwrap_or_else(|| "user".to_string());

            if !check_role_permission(tenant_role.unwrap_or("user"), &allowed) {
                return Err(AppError::forbidden(
                    "Keine Berechtigung zum Senden von Nachrichten.",
                ));
            }
        }

        let msg = sqlx::query!(
            r#"INSERT INTO group_messages (tenant_id, user_id, content, parent_id)
             VALUES ($1, $2, $3, $4)
             RETURNING id, tenant_id, user_id, content, parent_id, created_at, updated_at"#,
            tenant_id, user_id, content.trim(), parent_id
        ).fetch_one(&self.db).await?;

        let sender = generate_user_name(&msg.user_id.to_string(), &msg.tenant_id.to_string());

        let mut v = json!({
            "id": msg.id, "tenantId": msg.tenant_id, "userId": msg.user_id,
            "senderName": sender, "content": msg.content,
            "parentId": msg.parent_id,
            "createdAt": msg.created_at, "updatedAt": msg.updated_at,
        });

        if let Some(pid) = msg.parent_id {
            if let Some(p) = sqlx::query!(
                r#"SELECT user_id, content, tenant_id FROM group_messages WHERE id = $1"#,
                pid
            )
                .fetch_optional(&self.db)
                .await?
            {
                v["parentContent"] = json!(p.content);
                v["parentSenderName"] = json!(generate_user_name(
                    &p.user_id.to_string(),
                    &p.tenant_id.to_string()
                ));
            }
        }

        Ok(v)
    }

    pub async fn delete_message(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        tenant_role: Option<&str>,
        global_role: &str,
        message_id: Uuid,
    ) -> AppResult<()> {
        let msg = sqlx::query!(
            r#"SELECT user_id FROM group_messages WHERE id = $1 AND tenant_id = $2"#,
            message_id,
            tenant_id
        )
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("Nachricht nicht gefunden"))?;

        if msg.user_id != user_id && global_role != "superadmin" {
            let group = sqlx::query!(
                r#"SELECT permissions, owner_id FROM groups WHERE id = $1"#,
                tenant_id
            )
                .fetch_optional(&self.db)
                .await?
                .ok_or_else(|| AppError::not_found("Group not found"))?;

            if group.owner_id != user_id {
                let allowed = group
                    .permissions
                    .as_ref()
                    .and_then(|p| p["delete_other_content"].as_str().map(String::from))
                    .unwrap_or_else(|| "moderator".to_string());

                if !check_role_permission(tenant_role.unwrap_or("user"), &allowed) {
                    return Err(AppError::forbidden("Keine Berechtigung zum Löschen."));
                }
            }
        }

        sqlx::query!(
            r#"UPDATE group_messages SET parent_id = NULL WHERE parent_id = $1"#,
            message_id
        )
            .execute(&self.db)
            .await?;

        sqlx::query!(r#"DELETE FROM group_messages WHERE id = $1"#, message_id)
            .execute(&self.db)
            .await?;

        Ok(())
    }
}
