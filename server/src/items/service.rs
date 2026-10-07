use crate::{
    common::{
        names::{CUSTOM_SUBJECT_MAX_CHARS, DisplayName},
        text::DisplayText,
    },
    error::{AppError, AppResult},
    items::{
        attachments::{self, AttachmentDto},
        dto::{CreateItemDto, ItemSubjectDto, UpdateItemDto},
        item_type::ItemType,
        policy::ItemActor,
    },
    state::AppState,
};
use chrono::Utc;
use serde_json::{Value, json};
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

const TITLE_MAX_CHARS: usize = 60;

/// A task's subject once it is known to exist in the task's group.
enum ItemSubject {
    Group {
        subject_id: Uuid,
        course_id: Option<Uuid>,
    },
    Custom(DisplayName),
}

impl ItemSubject {
    fn subject_id(&self) -> Option<Uuid> {
        match self {
            Self::Group { subject_id, .. } => Some(*subject_id),
            Self::Custom(_) => None,
        }
    }

    fn course_id(&self) -> Option<Uuid> {
        match self {
            Self::Group { course_id, .. } => *course_id,
            Self::Custom(_) => None,
        }
    }

    fn custom_name(&self) -> Option<&str> {
        match self {
            Self::Group { .. } => None,
            Self::Custom(name) => Some(name.as_str()),
        }
    }
}

#[derive(Default)]
pub struct GetItemsFilter<'a> {
    pub item_type: Option<&'a str>,
    pub filter: Option<&'a str>,
    pub subject_id: Option<Uuid>,
    pub hide_checked: bool,
    pub personalized: bool,
}

pub struct ItemList {
    pub items: Vec<Value>,
    pub hidden_by_courses: usize,
}

pub struct ItemsService {
    db: PgPool,
}

impl ItemsService {
    pub fn from_state(s: &AppState) -> Self {
        Self { db: s.db.clone() }
    }

    /// Checks a subject reference against the group. A hand-typed name that the
    /// group does offer after all is linked to that subject, so it follows
    /// later renames and course filters like any other task.
    async fn resolve_subject(
        &self,
        tenant_id: Uuid,
        dto: &ItemSubjectDto,
    ) -> AppResult<ItemSubject> {
        match dto {
            ItemSubjectDto::Group {
                subject_id,
                course_id,
            } => {
                let valid = sqlx::query_scalar!(
                    r#"SELECT EXISTS (
                           SELECT 1 FROM subjects s
                           WHERE s.id = $1 AND s.tenant_id = $2
                             AND ($3::uuid IS NULL
                                  OR EXISTS (SELECT 1 FROM courses c WHERE c.id = $3 AND c.subject_id = s.id))
                       ) AS "valid!""#,
                    subject_id,
                    tenant_id,
                    *course_id
                )
                .fetch_one(&self.db)
                .await?;

                if !valid {
                    return Err(AppError::bad_request(
                        "The subject or course does not belong to this group.",
                    ));
                }

                Ok(ItemSubject::Group {
                    subject_id: *subject_id,
                    course_id: *course_id,
                })
            }
            ItemSubjectDto::Custom { custom_name } => {
                let name = DisplayName::parse(custom_name, CUSTOM_SUBJECT_MAX_CHARS, "subject")?;

                let offered = sqlx::query_scalar!(
                    r#"SELECT id FROM subjects WHERE tenant_id = $1 AND lower(name) = lower($2)"#,
                    tenant_id,
                    name.as_str()
                )
                .fetch_optional(&self.db)
                .await?;

                Ok(match offered {
                    Some(subject_id) => ItemSubject::Group {
                        subject_id,
                        course_id: None,
                    },
                    None => ItemSubject::Custom(name),
                })
            }
        }
    }

    pub async fn get_items(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        f: GetItemsFilter<'_>,
        include_creator_email: bool,
    ) -> AppResult<ItemList> {
        if f.item_type.is_none() || f.item_type == Some("all") {
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

        let old_filter = f.filter == Some("old");

        // A task for a single course reaches that course's members; one for the
        // whole subject reaches everybody taking any of its courses.
        // Unpinned tasks drop into the archive once checked on or after their
        // due day, or once past due when they belong to a course the member
        // does not take, since nobody expects them to tick those off.
        let mut rows = sqlx::query!(
            r#"SELECT i.id, i.type, i.title, i.subject_id, i.course_id,
                      COALESCE(s.name, i.custom_subject) as "subject_name!", c.name as "course_name?",
                      i.description, i.due_date,
                      i.created_by as "created_by?: Uuid", i.editor_note, i.created_at, i.updated_at,
                      u.email as "creator_email?: String",
                      m.takes_course as "takes_course!",
                      (
                          m.takes_course
                          OR i.id IN (SELECT item_id FROM pinned_items WHERE user_id = $2)
                      ) as "matches_courses!"
               FROM items i
               LEFT JOIN subjects s ON s.id = i.subject_id
               LEFT JOIN courses c ON c.id = i.course_id
               LEFT JOIN users u ON u.id = i.created_by
               LEFT JOIN user_item_visibility v ON v.item_id = i.id AND v.user_id = $2
               CROSS JOIN LATERAL (
                   SELECT (
                       i.subject_id IS NULL
                       OR s.category = 'core'
                       OR NOT EXISTS (SELECT 1 FROM courses sc WHERE sc.subject_id = i.subject_id)
                       OR EXISTS (
                           SELECT 1 FROM user_courses uc
                           WHERE uc.user_id = $2
                             AND uc.subject_id = i.subject_id
                             AND (i.course_id IS NULL OR uc.course_id = i.course_id)
                       )
                   ) AS takes_course
               ) m
               CROSS JOIN LATERAL (
                   SELECT (
                       i.id NOT IN (SELECT item_id FROM pinned_items WHERE user_id = $2)
                       AND (
                           (NOT m.takes_course AND i.due_date < now())
                           OR (
                               m.takes_course
                               AND i.id IN (SELECT item_id FROM keep_checked WHERE user_id = $2)
                               AND (i.due_date AT TIME ZONE 'Europe/Berlin')::date <= (now() AT TIME ZONE 'Europe/Berlin')::date
                           )
                       )
                   ) AS naturally_old
               ) o
               WHERE i.tenant_id = $1
                 AND ($3::text IS NULL OR $3 = 'all' OR i.type = $3)
                 AND (
                     ($4::boolean AND (v.status = 'archived' OR o.naturally_old) AND v.status IS DISTINCT FROM 'kept')
                     OR
                     (NOT $4::boolean AND (v.status = 'kept' OR NOT o.naturally_old) AND v.status IS DISTINCT FROM 'archived')
                 )
                 AND (
                     $5::boolean IS FALSE
                     OR i.id NOT IN (SELECT item_id FROM keep_checked WHERE user_id = $2)
                 )
                 AND (
                     $6::uuid IS NULL
                     OR i.subject_id = $6
                     OR i.id IN (SELECT item_id FROM pinned_items WHERE user_id = $2)
                 )
               ORDER BY i.due_date ASC"#,
            tenant_id,
            user_id,
            f.item_type,
            old_filter,
            f.hide_checked,
            f.subject_id
        )
            .fetch_all(&self.db)
            .await?;

        // Filtering here instead of in SQL lets one query also tell how many
        // items the member's course selection hid.
        let row_count = rows.len();
        if f.personalized {
            rows.retain(|r| r.matches_courses);
        }
        let hidden_by_courses = row_count - rows.len();

        if old_filter {
            rows.sort_by_key(|row| std::cmp::Reverse(row.due_date));
        }

        let item_ids: Vec<Uuid> = rows.iter().map(|r| r.id).collect();
        let mut attachments = attachments::of_items(&self.db, &item_ids).await?;

        let items: Vec<Value> = rows
            .into_iter()
            .map(|r| {
                let item_attachments = attachments.remove(&r.id).unwrap_or_default();
                let creator_deleted = r.created_by.is_none();
                let created_by_name = r.created_by.map(|uid| {
                    crate::common::name_generator::generate_user_name(&uid.to_string())
                });
                let created_by_email = if include_creator_email {
                    r.creator_email.unwrap_or_else(|| "Gelöschter Nutzer".into())
                } else {
                    String::new()
                };
                json!({
                    "id": r.id, "type": r.r#type, "title": r.title,
                    "subjectId": r.subject_id, "courseId": r.course_id,
                    "subjectName": r.subject_name, "courseName": r.course_name,
                    "takesCourse": r.takes_course,
                    "description": r.description,
                    "attachments": item_attachments, "dueDate": r.due_date,
                    "createdBy": r.created_by,
                    "createdByName": created_by_name,
                    "createdByEmail": created_by_email,
                    "creatorDeleted": creator_deleted,
                    "timeColor": time_left_color(&r.due_date),
                    "editorNote": r.editor_note, "createdAt": r.created_at, "updatedAt": r.updated_at,
                })
            })
            .collect();

        Ok(ItemList {
            items,
            hidden_by_courses,
        })
    }

    pub async fn get_item_by_id(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        id: Uuid,
        include_creator_email: bool,
    ) -> AppResult<Value> {
        let row = sqlx::query!(
            r#"SELECT i.id, i.type, i.title, i.subject_id, i.course_id,
                      COALESCE(s.name, i.custom_subject) as "subject_name!", c.name as "course_name?",
                      i.description, i.due_date as "due_date!",
                      i.created_by as "created_by?: Uuid", i.editor_note, i.created_at, i.updated_at,
                      u.email as "creator_email?: String",
                      (
                          i.subject_id IS NULL
                          OR s.category = 'core'
                          OR NOT EXISTS (SELECT 1 FROM courses sc WHERE sc.subject_id = i.subject_id)
                          OR EXISTS (
                              SELECT 1 FROM user_courses uc
                              WHERE uc.user_id = $3
                                AND uc.subject_id = i.subject_id
                                AND (i.course_id IS NULL OR uc.course_id = i.course_id)
                          )
                      ) as "takes_course!"
               FROM items i
               LEFT JOIN subjects s ON s.id = i.subject_id
               LEFT JOIN courses c ON c.id = i.course_id
               LEFT JOIN users u ON u.id = i.created_by
               WHERE i.id = $1 AND i.tenant_id = $2"#,
            id,
            tenant_id,
            user_id
        )
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("Item not found."))?;

        let item_attachments = attachments::of_item(&self.db, row.id).await?;
        let creator_deleted = row.created_by.is_none();
        let created_by_name = row
            .created_by
            .map(|uid| crate::common::name_generator::generate_user_name(&uid.to_string()));
        let created_by_email = if include_creator_email {
            row.creator_email
                .unwrap_or_else(|| "Gelöschter Nutzer".into())
        } else {
            String::new()
        };
        Ok(json!({
            "id": row.id, "type": row.r#type, "title": row.title,
            "subjectId": row.subject_id, "courseId": row.course_id,
            "subjectName": row.subject_name, "courseName": row.course_name,
            "takesCourse": row.takes_course,
            "description": row.description,
            "attachments": item_attachments, "dueDate": row.due_date,
            "createdBy": row.created_by,
            "createdByName": created_by_name,
            "createdByEmail": created_by_email,
            "creatorDeleted": creator_deleted,
            "timeColor": time_left_color(&row.due_date),
            "editorNote": row.editor_note, "createdAt": row.created_at, "updatedAt": row.updated_at,
        }))
    }

    pub async fn create_item(
        &self,
        tenant_id: Uuid,
        actor: ItemActor,
        dto: &CreateItemDto,
    ) -> AppResult<Value> {
        let title = DisplayName::parse(&dto.title, TITLE_MAX_CHARS, "title")?;
        let due_date = dto
            .due_date
            .parse::<chrono::DateTime<Utc>>()
            .map_err(|_| AppError::bad_request("Invalid due_date format"))?;

        let attachment_ids = dto.attachment_ids.as_slice();
        if !attachment_ids.is_empty() && !actor.can_attach_files {
            return Err(AppError::forbidden("Insufficient permissions."));
        }
        // Every attachment of a new task is the creator's own.
        dto.r#type
            .image_quota()
            .ensure_room_for(attachment_ids.len(), 0, 0)?;

        // Only groups that enabled Dalton may create items of this type.
        if dto.r#type == ItemType::Dalton {
            let dalton_enabled = sqlx::query_scalar!(
                r#"SELECT dalton_enabled FROM groups WHERE id = $1"#,
                tenant_id
            )
            .fetch_optional(&self.db)
            .await?
            .unwrap_or(false);

            if !dalton_enabled {
                return Err(AppError::bad_request(
                    "Dalton is not enabled for this group.",
                ));
            }
        }

        let subject = self.resolve_subject(tenant_id, &dto.subject).await?;

        if !dto.confirm_double_task.unwrap_or(false) {
            let duplicate = sqlx::query!(
                r#"SELECT i.id, i.type, i.title, i.subject_id, i.course_id,
                          COALESCE(s.name, i.custom_subject) as "subject_name!", c.name as "course_name?",
                          i.description, i.due_date,
                          i.created_by, i.editor_note, i.created_at, i.updated_at
                   FROM items i
                   LEFT JOIN subjects s ON s.id = i.subject_id
                   LEFT JOIN courses c ON c.id = i.course_id
                   WHERE i.tenant_id = $1
                     AND i.type = $2
                     AND i.subject_id IS NOT DISTINCT FROM $3
                     AND i.course_id IS NOT DISTINCT FROM $4
                     AND lower(i.custom_subject) IS NOT DISTINCT FROM lower($5)
                     AND (i.due_date AT TIME ZONE 'Europe/Berlin')::date = ($6 AT TIME ZONE 'Europe/Berlin')::date
                   LIMIT 1"#,
                tenant_id,
                dto.r#type.as_str(),
                subject.subject_id(),
                subject.course_id(),
                subject.custom_name(),
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
                    "subjectId": row.subject_id,
                    "courseId": row.course_id,
                    "subjectName": row.subject_name,
                    "courseName": row.course_name,
                    "description": row.description,
                    "attachments": attachments::of_item(&self.db, row.id).await?,
                    "dueDate": row.due_date,
                    "createdBy": row.created_by,
                    "createdByName": created_by_name,
                    "createdByEmail": "",
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

        let mut tx = self.db.begin().await?;

        let row = sqlx::query!(
            r#"INSERT INTO items (type, title, subject_id, course_id, custom_subject, description, due_date, created_by, tenant_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id"#,
            dto.r#type.as_str(), title.as_str(),
            subject.subject_id(), subject.course_id(), subject.custom_name(),
            dto.description.as_deref().unwrap_or("").trim(),
            due_date,
            actor.user_id, tenant_id
        )
            .fetch_one(&mut *tx)
            .await?;

        attachments::attach(&mut tx, row.id, actor.user_id, attachment_ids).await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'item:create', $2)"#,
            actor.user_id,
            json!({ "id": row.id, "type": dto.r#type })
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(json!({ "ok": true, "id": row.id }))
    }

    pub async fn update_item(
        &self,
        tenant_id: Uuid,
        id: Uuid,
        actor: ItemActor,
        dto: &UpdateItemDto,
    ) -> AppResult<Value> {
        let title = dto
            .title
            .as_deref()
            .map(|t| DisplayName::parse(t, TITLE_MAX_CHARS, "title"))
            .transpose()?;
        let subject = match &dto.subject {
            Some(subject) => Some(self.resolve_subject(tenant_id, subject).await?),
            None => None,
        };

        let mut tx = self.db.begin().await?;

        let item = sqlx::query!(
            r#"SELECT id, created_by as "created_by?: Uuid" FROM items
               WHERE id = $1 AND tenant_id = $2 FOR UPDATE"#,
            id,
            tenant_id
        )
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| AppError::not_found("Not found."))?;

        if !actor.may_edit(item.created_by) {
            return Err(AppError::forbidden("Not allowed to edit this item."));
        }

        if let Some(title) = &title {
            sqlx::query!(
                r#"UPDATE items SET title = $1 WHERE id = $2"#,
                title.as_str(),
                id
            )
            .execute(&mut *tx)
            .await?;
        }

        if let Some(subject) = &subject {
            sqlx::query!(
                r#"UPDATE items SET subject_id = $1, course_id = $2, custom_subject = $3 WHERE id = $4"#,
                subject.subject_id(),
                subject.course_id(),
                subject.custom_name(),
                id
            )
            .execute(&mut *tx)
            .await?;
        }

        if let Some(ref desc) = dto.description {
            sqlx::query!(
                r#"UPDATE items SET description = $1 WHERE id = $2"#,
                desc.trim(),
                id
            )
            .execute(&mut *tx)
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
            .execute(&mut *tx)
            .await?;
        }

        sqlx::query!(r#"UPDATE items SET updated_at = now() WHERE id = $1"#, id)
            .execute(&mut *tx)
            .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'item:update', $2)"#,
            actor.user_id,
            json!({ "id": id })
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn add_attachment(
        &self,
        tenant_id: Uuid,
        item_id: Uuid,
        user_id: Uuid,
        asset_id: Uuid,
    ) -> AppResult<AttachmentDto> {
        let mut tx = self.db.begin().await?;

        // The row lock serialises concurrent uploads, so parallel requests
        // cannot each see room for one more attachment and overshoot the quota.
        let item_type = sqlx::query_scalar!(
            r#"SELECT type FROM items WHERE id = $1 AND tenant_id = $2 FOR UPDATE"#,
            item_id,
            tenant_id
        )
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| AppError::not_found("Item not found."))?;

        let item_type = ItemType::from_str(&item_type)
            .ok_or_else(|| AppError::internal(format!("Unknown item type {item_type}")))?;

        let held = attachments::count(&mut *tx, item_id, user_id).await?;
        item_type
            .image_quota()
            .ensure_room_for(1, held.own, held.total)?;

        let [attachment_id] =
            attachments::attach(&mut tx, item_id, user_id, &[asset_id]).await?[..]
        else {
            return Err(AppError::internal(
                "Attaching one upload yielded another count",
            ));
        };

        sqlx::query!(
            r#"UPDATE items SET updated_at = now() WHERE id = $1"#,
            item_id
        )
        .execute(&mut *tx)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'item:attachment:add', $2)"#,
            user_id,
            json!({ "itemId": item_id, "attachmentId": attachment_id })
        )
        .execute(&mut *tx)
        .await?;

        let attachment = attachments::of_item(&mut *tx, item_id)
            .await?
            .into_iter()
            .find(|attachment| attachment.id == attachment_id)
            .ok_or_else(|| AppError::internal("Attachment vanished within its transaction"))?;

        tx.commit().await?;

        Ok(attachment)
    }

    pub async fn remove_attachment(
        &self,
        tenant_id: Uuid,
        item_id: Uuid,
        actor: ItemActor,
        attachment_id: Uuid,
    ) -> AppResult<()> {
        let mut tx = self.db.begin().await?;

        let item_creator = sqlx::query_scalar!(
            r#"SELECT created_by AS "created_by?: Uuid" FROM items
               WHERE id = $1 AND tenant_id = $2 FOR UPDATE"#,
            item_id,
            tenant_id
        )
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| AppError::not_found("Item not found."))?;

        let attachment_creator = attachments::creator_of(&mut *tx, item_id, attachment_id).await?;
        if !actor.may_remove_attachment(item_creator, attachment_creator) {
            return Err(AppError::forbidden(
                "Not allowed to delete this attachment.",
            ));
        }

        attachments::detach(&mut tx, item_id, attachment_id).await?;

        sqlx::query!(
            r#"UPDATE items SET updated_at = now() WHERE id = $1"#,
            item_id
        )
        .execute(&mut *tx)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'item:attachment:remove', $2)"#,
            actor.user_id,
            json!({ "itemId": item_id, "attachmentId": attachment_id })
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(())
    }

    pub async fn delete_item(
        &self,
        tenant_id: Uuid,
        id: Uuid,
        actor: ItemActor,
    ) -> AppResult<Value> {
        let item = sqlx::query!(
            r#"SELECT id, created_by as "created_by?: Uuid" FROM items WHERE id = $1 AND tenant_id = $2"#,
            id,
            tenant_id
        )
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("Not found."))?;

        if !actor.may_delete(item.created_by) {
            return Err(AppError::forbidden("Not allowed to delete this item."));
        }

        sqlx::query!(
            r#"DELETE FROM items WHERE id = $1 AND tenant_id = $2"#,
            id,
            tenant_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'item:delete', $2)"#,
            actor.user_id,
            json!({ "id": id })
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
        note: Option<&DisplayText>,
    ) -> AppResult<Value> {
        sqlx::query!(
            r#"SELECT id FROM items WHERE id = $1 AND tenant_id = $2"#,
            id,
            tenant_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Not found."))?;

        // The column keeps '' rather than NULL for "no note", as clients expect.
        let note = note.map_or("", DisplayText::as_str);

        sqlx::query!(
            r#"UPDATE items SET editor_note = $1, updated_at = now() WHERE id = $2"#,
            note,
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

        Ok(json!({ "ok": true, "editorNote": note }))
    }
}
