use crate::{
    error::{AppError, AppResult},
    state::AppState,
};
use chrono::Utc;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

fn time_left_color(due: &chrono::DateTime<Utc>) -> &'static str {
    let diff = (*due - Utc::now()).num_seconds() as f64 / 86400.0;
    if diff < 0.0 {
        "expired"
    } else if diff < 1.0 {
        "danger"
    } else if diff < 2.0 {
        "warn"
    } else if diff < 3.0 {
        "normal"
    } else {
        "ok"
    }
}

pub struct DeleteItemParams {
    pub tenant_id: Uuid,
    pub id: Uuid,
    pub user_id: Uuid,
    pub is_superadmin: bool,
    pub is_owner: bool,
    pub can_delete_others: bool,
}

pub struct ItemsService {
    db: PgPool,
    cloudinary_cloud_name: String,
    cloudinary_api_key: String,
    cloudinary_api_secret: String,
}

impl ItemsService {
    pub fn from_state(s: &AppState) -> Self {
        Self {
            db: s.db.clone(),
            cloudinary_cloud_name: s.config.cloudinary_cloud_name.clone(),
            cloudinary_api_key: s.config.cloudinary_api_key.clone(),
            cloudinary_api_secret: s.config.cloudinary_api_secret.clone(),
        }
    }

    pub async fn get_items(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        item_type: Option<&str>,
        filter: Option<&str>,
        subject: Option<&str>,
        hide_checked: bool,
        personalized: bool,
    ) -> AppResult<Vec<Value>> {
        if item_type.is_none() || item_type == Some("all") {
            let db2 = self.db.clone();

            tokio::spawn(async move {
                let _ = sqlx::query!(
                    r#"INSERT INTO user_tenant_state (user_id, tenant_id, last_group_visit_at)
                       VALUES ($1, $2, now()) ON CONFLICT (user_id, tenant_id)
                       DO UPDATE SET last_group_visit_at = now()"#,
                    user_id,
                    tenant_id
                )
                .execute(&db2)
                .await;
            });
        }

        let old_filter = filter == Some("old");
        let subject_lower = subject.map(|s| s.to_lowercase());

        let rows = sqlx::query!(
            r#"SELECT i.id, i.type, i.title, i.subject, i.description, i.images, i.due_date,
                      i.created_by as "created_by?: Uuid", i.editor_note, i.created_at, i.updated_at,
                      u.email as "creator_email?: String"
               FROM items i
               LEFT JOIN users u ON u.id = i.created_by
               LEFT JOIN user_item_visibility v ON v.item_id = i.id AND v.user_id = $2
               WHERE i.tenant_id = $1
                 AND ($3::text IS NULL OR $3 = 'all' OR i.type = $3)
                 AND (
                     ($4::boolean AND (i.due_date < now() OR v.status = 'archived') AND v.status IS DISTINCT FROM 'kept')
                     OR 
                     (NOT $4::boolean AND (i.due_date >= now() OR v.status = 'kept') AND v.status IS DISTINCT FROM 'archived')
                 )
                 AND (
                     $5::boolean IS FALSE
                     OR i.id NOT IN (SELECT item_id FROM keep_checked WHERE user_id = $2)
                 )
                 AND (
                     $6::text IS NULL
                     OR i.id IN (SELECT item_id FROM pinned_items WHERE user_id = $2)
                     OR ($6 = 'enrichment' AND LOWER(i.subject) LIKE 'enrichment%')
                     OR ($6 = 'wpu1' AND LOWER(i.subject) LIKE 'wpu (di)%')
                     OR ($6 = 'wpu2' AND LOWER(i.subject) LIKE 'wpu (do)%')
                     OR LOWER(SPLIT_PART(i.subject, ' -', 1)) = LOWER($6)
                     OR LOWER(i.subject) = LOWER($6)
                 )
                 AND (
                     $7::boolean IS FALSE
                     OR i.id IN (SELECT item_id FROM pinned_items WHERE user_id = $2)
                     OR NOT EXISTS (
                         SELECT 1 FROM subjects s
                         WHERE LOWER(s.name) = LOWER(SPLIT_PART(i.subject, ' -', 1))
                           AND s.tenant_id = $1
                           AND s.category != 'core'
                           AND (SELECT COUNT(*) FROM courses c2 WHERE c2.subject_id = s.id) > 0
                           AND NOT EXISTS (
                               SELECT 1 FROM courses c
                               JOIN user_courses uc ON uc.course_id = c.id
                               WHERE c.subject_id = s.id
                                 AND uc.user_id = $2
                                 AND (
                                     i.subject = s.name || ' - ' || c.name
                                     OR (s.category = 'extra' AND i.subject = s.name AND (SELECT COUNT(*) FROM courses c3 WHERE c3.subject_id = s.id) = 1)
                                 )
                           )
                     )
                 )
               ORDER BY i.due_date ASC"#,
            tenant_id,
            user_id,
            item_type,
            old_filter,
            hide_checked,
            subject_lower,
            personalized
        )
        .fetch_all(&self.db)
        .await?;

        let result: Vec<Value> = rows
            .into_iter()
            .map(|r| {
                let creator_deleted = r.created_by.is_none();
                let created_by_name = r.created_by.map(|uid| {
                    crate::common::name_generator::generate_user_name(&uid.to_string())
                });
                json!({
                    "id": r.id, "type": r.r#type, "title": r.title,
                    "subject": r.subject, "description": r.description,
                    "images": r.images, "dueDate": r.due_date,
                    "createdBy": r.created_by,
                    "createdByName": created_by_name,
                    "createdByEmail": r.creator_email.unwrap_or_else(|| "Gelöschter Nutzer".into()),
                    "creatorDeleted": creator_deleted,
                    "timeColor": time_left_color(&r.due_date),
                    "editorNote": r.editor_note, "createdAt": r.created_at, "updatedAt": r.updated_at,
                })
            })
            .collect();

        Ok(result)
    }

    pub async fn get_item_by_id(&self, tenant_id: Uuid, id: Uuid) -> AppResult<Value> {
        let row = sqlx::query!(
            r#"SELECT i.id, i.type, i.title, i.subject, i.description, i.images, i.due_date as "due_date!",
                      i.created_by as "created_by?: Uuid", i.editor_note, i.created_at, i.updated_at,
                      u.email as "creator_email?: String"
               FROM items i
               LEFT JOIN users u ON u.id = i.created_by
               WHERE i.id = $1 AND i.tenant_id = $2"#,
            id,
            tenant_id
        )
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("Item not found."))?;

        let creator_deleted = row.created_by.is_none();
        let created_by_name = row
            .created_by
            .map(|uid| crate::common::name_generator::generate_user_name(&uid.to_string()));
        Ok(json!({
            "id": row.id, "type": row.r#type, "title": row.title,
            "subject": row.subject, "description": row.description,
            "images": row.images, "dueDate": row.due_date,
            "createdBy": row.created_by,
            "createdByName": created_by_name,
            "createdByEmail": row.creator_email.unwrap_or_else(|| "Gelöschter Nutzer".into()),
            "creatorDeleted": creator_deleted,
            "timeColor": time_left_color(&row.due_date),
            "editorNote": row.editor_note, "createdAt": row.created_at, "updatedAt": row.updated_at,
        }))
    }

    pub async fn create_item(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        dto: &crate::items::dto::CreateItemDto,
    ) -> AppResult<Value> {
        let due_date = dto
            .due_date
            .parse::<chrono::DateTime<Utc>>()
            .map_err(|_| AppError::bad_request("Invalid due_date format"))?;

        if !dto.confirm_double_task.unwrap_or(false) {
            let duplicate = sqlx::query!(
                r#"SELECT i.id, i.type, i.title, i.subject, i.description, i.images, i.due_date,
                          i.created_by, i.editor_note, i.created_at, i.updated_at,
                          u.email as "creator_email?: String"
                   FROM items i
                   LEFT JOIN users u ON u.id = i.created_by
                   WHERE i.tenant_id = $1
                     AND i.type = $2
                     AND LOWER(TRIM(i.subject)) = LOWER(TRIM($3))
                     AND (i.due_date AT TIME ZONE 'Europe/Berlin')::date = ($4 AT TIME ZONE 'Europe/Berlin')::date
                   LIMIT 1"#,
                tenant_id,
                dto.r#type,
                dto.subject.trim(),
                due_date
            )
                .fetch_optional(&self.db)
                .await?;

            if let Some(row) = duplicate {
                let created_by_name = row
                    .created_by
                    .map(|uid| crate::common::name_generator::generate_user_name(&uid.to_string()));
                let duplicate_val = json!({
                    "id": row.id,
                    "type": row.r#type,
                    "title": row.title,
                    "subject": row.subject,
                    "description": row.description,
                    "images": row.images,
                    "dueDate": row.due_date,
                    "createdBy": row.created_by,
                    "createdByName": created_by_name,
                    "createdByEmail": row.creator_email.unwrap_or_else(|| "Unbekannt".into()),
                    "timeColor": time_left_color(&row.due_date),
                    "editorNote": row.editor_note,
                    "createdAt": row.created_at,
                    "updatedAt": row.updated_at,
                });
                return Err(AppError::Conflict(
                    "Duplicate task found".to_string(),
                    duplicate_val,
                ));
            }
        }

        let images: Vec<Value> = dto
            .images
            .as_deref()
            .unwrap_or(&[])
            .iter()
            .map(|img| json!({ "publicId": img.public_id, "createdBy": user_id, "metadata": img.metadata }))
            .collect();

        let row = sqlx::query!(
            r#"INSERT INTO items (type, title, subject, description, images, due_date, created_by, tenant_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id"#,
            dto.r#type, dto.title.trim(), dto.subject.trim(),
            dto.description.as_deref().unwrap_or("").trim(),
            json!(images),
            due_date,
            user_id, tenant_id
        )
            .fetch_one(&self.db)
            .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'item:create', $2)"#,
            user_id,
            json!({ "id": row.id, "type": dto.r#type })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true, "id": row.id }))
    }

    pub async fn update_item(
        &self,
        tenant_id: Uuid,
        id: Uuid,
        user_id: Uuid,
        dto: &crate::items::dto::UpdateItemDto,
    ) -> AppResult<Value> {
        let item = sqlx::query!(
            r#"SELECT id, created_by as "created_by?: Uuid" FROM items WHERE id = $1 AND tenant_id = $2"#,
            id,
            tenant_id
        )
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("Not found."))?;

        if item.created_by != Some(user_id) {
            return Err(AppError::forbidden("Only the creator can edit this item."));
        }

        if let Some(ref title) = dto.title {
            sqlx::query!(
                r#"UPDATE items SET title = $1 WHERE id = $2"#,
                title.trim(),
                id
            )
            .execute(&self.db)
            .await?;
        }

        if let Some(ref subject) = dto.subject {
            sqlx::query!(
                r#"UPDATE items SET subject = $1 WHERE id = $2"#,
                subject.trim(),
                id
            )
            .execute(&self.db)
            .await?;
        }

        if let Some(ref desc) = dto.description {
            sqlx::query!(
                r#"UPDATE items SET description = $1 WHERE id = $2"#,
                desc.trim(),
                id
            )
            .execute(&self.db)
            .await?;
        }

        if let Some(ref due) = dto.due_date {
            let parsed = due
                .parse::<chrono::DateTime<Utc>>()
                .map_err(|_| AppError::bad_request("Invalid due_date"))?;

            sqlx::query!(
                r#"UPDATE items SET due_date = $1 WHERE id = $2"#,
                parsed,
                id
            )
            .execute(&self.db)
            .await?;
        }

        if let Some(ref images) = dto.images {
            sqlx::query!(
                r#"UPDATE items SET images = $1 WHERE id = $2"#,
                json!(images),
                id
            )
            .execute(&self.db)
            .await?;
        }

        sqlx::query!(r#"UPDATE items SET updated_at = now() WHERE id = $1"#, id)
            .execute(&self.db)
            .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'item:update', $2)"#,
            user_id,
            json!({ "id": id })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn add_image(
        &self,
        tenant_id: Uuid,
        item_id: Uuid,
        user_id: Uuid,
        can_upload: bool,
        dto: &crate::items::dto::AddImageDto,
    ) -> AppResult<Value> {
        let item = sqlx::query!(
            r#"SELECT id, created_by as "created_by?: Uuid", images FROM items WHERE id = $1 AND tenant_id = $2"#,
            item_id,
            tenant_id
        )
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("Item not found."))?;

        if (item.created_by != Some(user_id)) && !can_upload {
            return Err(AppError::forbidden("Only the creator can add images."));
        }

        let mut images: Vec<Value> = match item.images {
            Some(Value::Array(arr)) => arr,
            _ => Vec::new(),
        };

        if images.len() >= 12 {
            return Err(AppError::bad_request(
                "Maximum of 12 images per item reached.",
            ));
        }

        let new_image = json!({
            "publicId": dto.image.public_id,
            "createdBy": user_id,
            "metadata": dto.image.metadata,
        });

        images.push(new_image.clone());

        sqlx::query!(
            r#"UPDATE items SET images = $1, updated_at = now() WHERE id = $2"#,
            json!(images),
            item_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'item:image:add', $2)"#,
            user_id,
            json!({ "itemId": item_id, "publicId": dto.image.public_id })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true, "image": new_image }))
    }

    pub async fn remove_image(
        &self,
        tenant_id: Uuid,
        item_id: Uuid,
        user_id: Uuid,
        is_superadmin: bool,
        public_id: &str,
    ) -> AppResult<Value> {
        let item = sqlx::query!(
            r#"SELECT id, created_by as "created_by?: Uuid", images FROM items WHERE id = $1 AND tenant_id = $2"#,
            item_id,
            tenant_id
        )
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("Item not found."))?;

        let images: Vec<Value> = match item.images {
            Some(Value::Array(arr)) => arr,
            _ => Vec::new(),
        };

        let target = images
            .iter()
            .find(|img| img["publicId"].as_str() == Some(public_id))
            .ok_or_else(|| AppError::not_found("Image not found."))?;

        let image_uploader = target["createdBy"]
            .as_str()
            .and_then(|s| s.parse::<Uuid>().ok());

        if (item.created_by != Some(user_id)) && image_uploader != Some(user_id) && !is_superadmin {
            return Err(AppError::forbidden("Not authorized to delete this image."));
        }

        let updated: Vec<Value> = images
            .into_iter()
            .filter(|img| img["publicId"].as_str() != Some(public_id))
            .collect();

        sqlx::query!(
            r#"UPDATE items SET images = $1, updated_at = now() WHERE id = $2"#,
            json!(updated),
            item_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'item:image:remove', $2)"#,
            user_id,
            json!({ "itemId": item_id, "publicId": public_id })
        )
            .execute(&self.db)
            .await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn delete_item(&self, params: DeleteItemParams) -> AppResult<Value> {
        let item = sqlx::query!(
            r#"SELECT id, created_by as "created_by?: Uuid" FROM items WHERE id = $1 AND tenant_id = $2"#,
            params.id,
            params.tenant_id
        )
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("Not found."))?;

        let is_creator = item.created_by == Some(params.user_id);

        if !is_creator && !params.is_superadmin && !params.is_owner && !params.can_delete_others {
            return Err(AppError::forbidden("Nicht autorisiert."));
        }

        sqlx::query!(
            r#"DELETE FROM items WHERE id = $1 AND tenant_id = $2"#,
            params.id,
            params.tenant_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'item:delete', $2)"#,
            params.user_id,
            json!({ "id": params.id })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn update_item_note(
        &self,
        tenant_id: Uuid,
        id: Uuid,
        user_id: Uuid,
        note: &str,
    ) -> AppResult<Value> {
        sqlx::query!(
            r#"SELECT id FROM items WHERE id = $1 AND tenant_id = $2"#,
            id,
            tenant_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Not found."))?;

        let trimmed = note.trim();

        sqlx::query!(
            r#"UPDATE items SET editor_note = $1, updated_at = now() WHERE id = $2"#,
            trimmed,
            id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'item:note:update', $2)"#,
            user_id,
            json!({ "itemId": id })
        )
            .execute(&self.db)
            .await?;

        Ok(json!({ "ok": true, "editorNote": trimmed }))
    }

    pub async fn report_item(
        &self,
        user_id: Uuid,
        email: &str,
        dto: &crate::items::dto::ReportItemDto,
    ) -> AppResult<Value> {
        sqlx::query!(
            r#"INSERT INTO reports (item_id, item_title, reason, reporter_id, reporter_email)
               VALUES ($1, $2, $3, $4, $5)"#,
            dto.item_id,
            dto.item_title,
            dto.reason.as_deref().map(|r| r.trim()),
            user_id,
            email
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'item:report', $2)"#,
            user_id,
            json!({ "itemId": dto.item_id })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true, "message": "Item reported successfully." }))
    }

    pub fn create_upload_signature(&self, folder: &str) -> Value {
        let timestamp = Utc::now().timestamp();

        let to_sign = format!(
            "folder={folder}&timestamp={timestamp}{}",
            self.cloudinary_api_secret
        );

        let mut hasher = Sha256::new();

        hasher.update(to_sign.as_bytes());
        let sig = hex::encode(hasher.finalize());

        json!({
            "cloudName": self.cloudinary_cloud_name,
            "apiKey": self.cloudinary_api_key,
            "timestamp": timestamp,
            "signature": sig,
            "folder": folder,
        })
    }
}
