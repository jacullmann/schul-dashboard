use crate::{
    error::{AppError, AppResult},
    state::AppState,
};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ReportType {
    Task,
    Message,
}

impl ReportType {
    fn as_str(self) -> &'static str {
        match self {
            ReportType::Task => "task",
            ReportType::Message => "message",
        }
    }
}

pub struct ReportsService {
    db: PgPool,
}

impl ReportsService {
    pub fn from_state(s: &AppState) -> Self {
        Self { db: s.db.clone() }
    }

    pub async fn report_task(
        &self,
        tenant_id: Uuid,
        reporter_id: Uuid,
        reporter_email: &str,
        item_id: Uuid,
        reason: Option<&str>,
    ) -> AppResult<Value> {
        let item = sqlx::query!(
            r#"SELECT i.id, i.type, i.title, i.subject, i.description,
                      i.images, i.due_date, i.editor_note, i.tenant_id,
                      u.email AS "creator_email?: String"
               FROM items i
               LEFT JOIN users u ON u.id = i.created_by
               WHERE i.id = $1 AND i.tenant_id = $2"#,
            item_id,
            tenant_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Item not found."))?;

        let details = json!({
            "itemId": item.id,
            "itemTitle": item.title,
            "itemType": item.r#type,
            "itemSubject": item.subject,
            "itemDescription": item.description,
            "itemImages": item.images,
            "itemDueDate": item.due_date,
            "itemEditorNote": item.editor_note,
            "itemTenantId": item.tenant_id,
            "creatorEmail": item.creator_email,
        });

        self.insert(
            ReportType::Task,
            reason,
            reporter_id,
            reporter_email,
            details,
        )
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'item:report', $2)"#,
            reporter_id,
            json!({ "itemId": item.id })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true, "message": "Item reported successfully." }))
    }

    pub async fn report_message(
        &self,
        tenant_id: Uuid,
        reporter_id: Uuid,
        reporter_email: &str,
        message_id: Uuid,
        reason: Option<&str>,
    ) -> AppResult<Value> {
        let msg = sqlx::query!(
            r#"SELECT m.id, m.content, m.user_id, m.tenant_id,
                      u.email AS "sender_email?: String"
               FROM group_messages m
               LEFT JOIN users u ON u.id = m.user_id
               WHERE m.id = $1 AND m.tenant_id = $2"#,
            message_id,
            tenant_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Nachricht nicht gefunden."))?;

        let details = json!({
            "messageId": msg.id,
            "messageContent": msg.content,
            "messageSenderId": msg.user_id,
            "messageSenderEmail": msg.sender_email,
            "messageTenantId": msg.tenant_id,
        });

        self.insert(
            ReportType::Message,
            reason,
            reporter_id,
            reporter_email,
            details,
        )
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'message:report', $2)"#,
            reporter_id,
            json!({ "messageId": msg.id })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true, "message": "Nachricht gemeldet." }))
    }

    async fn insert(
        &self,
        report_type: ReportType,
        reason: Option<&str>,
        reporter_id: Uuid,
        reporter_email: &str,
        details: Value,
    ) -> AppResult<()> {
        sqlx::query!(
            r#"INSERT INTO reports (report_type, reason, reporter_id, reporter_email, details)
               VALUES ($1, $2, $3, $4, $5)"#,
            report_type.as_str(),
            reason.map(str::trim).filter(|r| !r.is_empty()),
            reporter_id,
            reporter_email,
            details
        )
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// `contentDeleted` tells the admin UI that the reported task or message
    /// no longer exists, so it shows the snapshot kept in `details` instead.
    pub async fn list(&self) -> AppResult<Value> {
        let rows = sqlx::query!(
            r#"SELECT r.id, r.report_type, r.reason, r.reporter_id, r.reporter_email,
                      r.reported_at, r.details,
                      CASE r.report_type
                        WHEN 'task' THEN NOT EXISTS (
                          SELECT 1 FROM items WHERE id = (r.details->>'itemId')::uuid)
                        WHEN 'message' THEN NOT EXISTS (
                          SELECT 1 FROM group_messages WHERE id = (r.details->>'messageId')::uuid)
                        ELSE false
                      END AS "content_deleted!"
               FROM reports r
               ORDER BY r.reported_at DESC"#
        )
        .fetch_all(&self.db)
        .await?;

        let reports: Vec<Value> = rows
            .into_iter()
            .map(|r| {
                let mut map = match r.details {
                    Value::Object(map) => map,
                    _ => serde_json::Map::new(),
                };
                map.insert("id".into(), json!(r.id));
                map.insert("reportType".into(), json!(r.report_type));
                map.insert("reason".into(), json!(r.reason));
                map.insert("reportedBy".into(), json!(r.reporter_id));
                map.insert("reporterEmail".into(), json!(r.reporter_email));
                map.insert("reportedAt".into(), json!(r.reported_at));
                map.insert("contentDeleted".into(), json!(r.content_deleted));
                Value::Object(map)
            })
            .collect();

        Ok(json!(reports))
    }

    pub async fn delete(&self, report_id: Uuid, admin_id: Uuid) -> AppResult<Value> {
        let res = sqlx::query!(r#"DELETE FROM reports WHERE id = $1"#, report_id)
            .execute(&self.db)
            .await?;

        if res.rows_affected() == 0 {
            return Err(AppError::not_found("Report not found."));
        }

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
}
