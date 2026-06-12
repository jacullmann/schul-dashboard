use crate::{
    common::name_generator::generate_user_name,
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
            r#"SELECT last_messages_visit_at
               FROM user_tenant_state WHERE user_id = $1 AND tenant_id = $2"#,
            user_id,
            tenant_id
        )
        .fetch_optional(&self.db)
        .await?;
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
                r#"SELECT id, user_id, content, tenant_id
                   FROM group_messages WHERE id = ANY($1) AND tenant_id = $2"#,
                &parent_ids,
                tenant_id
            )
            .fetch_all(&self.db)
            .await?;
            for p in parents {
                parent_map.insert(
                    p.id,
                    (
                        p.content,
                        generate_user_name(&p.user_id.to_string()),
                        p.user_id,
                    ),
                );
            }
        }
        let result: Vec<Value> = msgs
            .into_iter()
            .map(|m| {
                let sender = generate_user_name(&m.user_id.to_string());
                let mut v = json!({
                    "id": m.id, "tenantId": m.tenant_id, "userId": m.user_id,
                    "senderName": sender, "content": m.content,
                    "parentId": m.parent_id,
                    "createdAt": m.created_at, "updatedAt": m.updated_at,
                });
                if let Some(pid) = m.parent_id
                    && let Some((pc, ps, puid)) = parent_map.get(&pid)
                {
                    v["parentContent"] = json!(pc);
                    v["parentSenderName"] = json!(ps);
                    v["parentUserId"] = json!(puid);
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
        content: &str,
        parent_id: Option<Uuid>,
    ) -> AppResult<Value> {
        if let Some(pid) = parent_id {
            sqlx::query!(
                r#"SELECT id FROM group_messages WHERE id = $1 AND tenant_id = $2"#,
                pid,
                tenant_id
            )
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("Parent message not found."))?;
        }
        let msg = sqlx::query!(
            r#"INSERT INTO group_messages (tenant_id, user_id, content, parent_id)
               VALUES ($1, $2, $3, $4)
               RETURNING id, tenant_id, user_id, content, parent_id, created_at, updated_at"#,
            tenant_id,
            user_id,
            content.trim(),
            parent_id
        )
        .fetch_one(&self.db)
        .await?;
        let sender = generate_user_name(&msg.user_id.to_string());
        let mut v = json!({
            "id": msg.id, "tenantId": msg.tenant_id, "userId": msg.user_id,
            "senderName": sender, "content": msg.content,
            "parentId": msg.parent_id,
            "createdAt": msg.created_at, "updatedAt": msg.updated_at,
        });
        if let Some(pid) = msg.parent_id
            && let Some(p) = sqlx::query!(
                r#"SELECT user_id, content, tenant_id FROM group_messages WHERE id = $1 AND tenant_id = $2"#,
                pid,
                tenant_id
            )
            .fetch_optional(&self.db)
            .await?
        {
            v["parentContent"] = json!(p.content);
            v["parentSenderName"] = json!(generate_user_name(&p.user_id.to_string()));
            v["parentUserId"] = json!(p.user_id);
        }
        Ok(v)
    }
    pub async fn delete_message(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        message_id: Uuid,
        caller_can_delete_others: bool,
    ) -> AppResult<()> {
        let msg = sqlx::query!(
            r#"SELECT user_id FROM group_messages WHERE id = $1 AND tenant_id = $2"#,
            message_id,
            tenant_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Nachricht nicht gefunden"))?;
        if msg.user_id != user_id && !caller_can_delete_others {
            return Err(AppError::forbidden("Keine Berechtigung zum Löschen."));
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

    pub async fn report_message(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        email: &str,
        dto: &crate::messages::dto::ReportMessageDto,
    ) -> AppResult<Value> {
        // Verify the message exists within the reporter's tenant and take the
        // content from the database.
        let msg = sqlx::query!(
            r#"SELECT id, content FROM group_messages WHERE id = $1 AND tenant_id = $2"#,
            dto.message_id,
            tenant_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Nachricht nicht gefunden."))?;

        sqlx::query!(
            r#"INSERT INTO reports (message_id, message_content, reason, reporter_id, reporter_email, report_type)
               VALUES ($1, $2, $3, $4, $5, 'message')"#,
            msg.id,
            msg.content,
            dto.reason.as_deref().map(|r| r.trim()),
            user_id,
            email
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'message:report', $2)"#,
            user_id,
            json!({ "messageId": msg.id })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true, "message": "Nachricht gemeldet." }))
    }
}
