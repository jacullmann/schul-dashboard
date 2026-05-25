use crate::{error::AppResult, state::AppState};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

pub struct ScheduleService {
    db: PgPool,
}

impl ScheduleService {
    pub fn from_state(s: &AppState) -> Self {
        Self { db: s.db.clone() }
    }

    pub async fn get_schedule(&self, tenant_id: Uuid, user_id: Option<Uuid>) -> AppResult<Value> {
        let lessons = sqlx::query!(
            r#"SELECT s.id, s.day, s.slot, s.duration, s.room, s.course_id,
                      sub.id as subject_id, sub.name as subject_name,
                      c.id as course_id2, c.name as course_name
               FROM schedules s
               LEFT JOIN subjects sub ON sub.id = s.subject_id
               LEFT JOIN courses c ON c.id = s.course_id
               WHERE s.tenant_id = $1"#,
            tenant_id
        )
        .fetch_all(&self.db)
        .await?;

        let filtered = if let Some(uid) = user_id {
            let user = sqlx::query!(
                "SELECT personalized, done_setup FROM users WHERE id = $1",
                uid
            )
            .fetch_optional(&self.db)
            .await?;

            if user
                .map(|u| u.personalized && u.done_setup)
                .unwrap_or(false)
            {
                let courses =
                    sqlx::query!("SELECT course_id FROM user_courses WHERE user_id = $1", uid)
                        .fetch_all(&self.db)
                        .await?;
                let course_ids: Vec<Uuid> = courses.into_iter().map(|r| r.course_id).collect();

                // Update last_schedule_visit_at fire-and-forget
                let db2 = self.db.clone();
                tokio::spawn(async move {
                    let _ = sqlx::query!(
                        "INSERT INTO user_tenant_state (user_id, tenant_id, last_schedule_visit_at)
                         VALUES ($1, $2, now())
                         ON CONFLICT (user_id, tenant_id) DO UPDATE SET last_schedule_visit_at = now()",
                        uid, tenant_id
                    ).execute(&db2).await;
                });

                lessons
                    .into_iter()
                    .filter(|l| {
                        l.course_id2
                            .map(|cid| course_ids.contains(&cid))
                            .unwrap_or(true)
                    })
                    .collect()
            } else {
                lessons
            }
        } else {
            lessons
        };

        let result: Vec<Value> = filtered.into_iter().map(|l| json!({
            "id": l.id, "day": l.day, "slot": l.slot, "duration": l.duration, "room": l.room,
            "courseId": l.course_id,
            "subjects": l.subject_id.map(|id| json!({ "id": id, "name": l.subject_name })),
            "courses": l.course_id2.map(|id| json!({ "id": id, "name": l.course_name })),
        })).collect();

        Ok(json!(result))
    }

    pub async fn get_subs(&self, tenant_id: Uuid) -> AppResult<Value> {
        let subs = sqlx::query!(
            "SELECT id, lesson_id, day, slot, duration, subject, room, cancelled, hide, created_at
             FROM schedule_subs WHERE tenant_id = $1",
            tenant_id
        )
        .fetch_all(&self.db)
        .await?;

        Ok(json!(
            subs.into_iter()
                .map(|s| json!({
                    "id": s.id, "lessonId": s.lesson_id, "day": s.day, "slot": s.slot,
                    "duration": s.duration, "subject": s.subject, "room": s.room,
                    "cancelled": s.cancelled, "hide": s.hide, "createdAt": s.created_at,
                }))
                .collect::<Vec<_>>()
        ))
    }

    pub async fn get_subjects(&self, tenant_id: Uuid) -> AppResult<Value> {
        let subjects = sqlx::query!(
            r#"SELECT s.id, s.name, s.is_active, s.category,
                      json_agg(json_build_object('id', c.id, 'name', c.name)) FILTER (WHERE c.id IS NOT NULL) as courses
               FROM subjects s
               LEFT JOIN courses c ON c.subject_id = s.id
               WHERE s.tenant_id = $1
               GROUP BY s.id ORDER BY s.name"#,
            tenant_id
        ).fetch_all(&self.db).await?;

        Ok(json!(
            subjects
                .into_iter()
                .map(|s| json!({
                    "id": s.id, "name": s.name, "isActive": s.is_active,
                    "category": s.category, "courses": s.courses.unwrap_or(json!([])),
                }))
                .collect::<Vec<_>>()
        ))
    }

    pub async fn get_announcements(&self, tenant_id: Uuid) -> AppResult<Value> {
        let rows = sqlx::query!(
            "SELECT id, content, color, created_by, created_at FROM announcements
             WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 5",
            tenant_id
        )
        .fetch_all(&self.db)
        .await?;

        Ok(json!(
            rows.into_iter()
                .map(|a| json!({
                    "id": a.id, "content": a.content, "color": a.color,
                    "createdBy": a.created_by, "createdAt": a.created_at,
                }))
                .collect::<Vec<_>>()
        ))
    }

    pub async fn get_announcement_read_status(
        &self,
        user_id: Uuid,
        tenant_id: Uuid,
    ) -> AppResult<Vec<Uuid>> {
        let rows = sqlx::query!(
            r#"SELECT ars.announcement_id FROM user_announcement_read_status ars
               JOIN announcements a ON a.id = ars.announcement_id
               WHERE ars.user_id = $1 AND a.tenant_id = $2"#,
            user_id,
            tenant_id
        )
        .fetch_all(&self.db)
        .await?;
        Ok(rows.into_iter().map(|r| r.announcement_id).collect())
    }

    pub async fn mark_announcement_read(
        &self,
        user_id: Uuid,
        announcement_id: Uuid,
    ) -> AppResult<()> {
        let exists = sqlx::query!(
            "SELECT id FROM user_announcement_read_status WHERE user_id = $1 AND announcement_id = $2",
            user_id, announcement_id
        ).fetch_optional(&self.db).await?;

        if exists.is_none() {
            sqlx::query!(
                "INSERT INTO user_announcement_read_status (user_id, announcement_id) VALUES ($1, $2)",
                user_id, announcement_id
            ).execute(&self.db).await?;
        }
        Ok(())
    }
}
