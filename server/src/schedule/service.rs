use super::dto::ScheduleSubsQuery;
use crate::{common::school_week::WeekStart, error::AppResult, state::AppState};
use serde_json::{Value, json};
use sqlx::PgPool;
use std::collections::HashSet;
use uuid::Uuid;

pub struct ScheduleService {
    db: PgPool,
}

pub struct PersonalSchedule {
    pub lessons: Value,
    pub hidden_by_courses: usize,
}

impl ScheduleService {
    pub fn from_state(s: &AppState) -> Self {
        Self { db: s.db.clone() }
    }

    pub async fn get_schedule(
        &self,
        tenant_id: Uuid,
        user_id: Option<Uuid>,
    ) -> AppResult<PersonalSchedule> {
        let lessons = sqlx::query!(
            r#"SELECT s.id, s.day, s.slot, s.duration, s.room, s.course_id, s.is_dalton,
       sub.id as "subject_id: Option<Uuid>", sub.name as "subject_name?",
       c.name as "course_name?"
FROM schedules s
LEFT JOIN subjects sub ON sub.id = s.subject_id
LEFT JOIN courses c ON c.id = s.course_id
WHERE s.tenant_id = $1"#,
            tenant_id
        )
        .fetch_all(&self.db)
        .await?;

        let mut enrolled_course_ids: Option<HashSet<Uuid>> = None;

        if let Some(uid) = user_id {
            // A lesson bound to a course is only that course's lesson, which
            // matters most for Abitur groups where nearly every lesson is.
            let personalized = sqlx::query!(
                r#"SELECT u.personalized, ur.done_course_setup
                   FROM users u
                   JOIN user_roles ur ON ur.user_id = u.id AND ur.tenant_id = $2
                   WHERE u.id = $1"#,
                uid,
                tenant_id
            )
            .fetch_optional(&self.db)
            .await?
            .is_some_and(|u| u.personalized && u.done_course_setup);

            if personalized {
                let rows = sqlx::query_scalar!(
                    r#"SELECT course_id FROM user_courses WHERE user_id = $1"#,
                    uid
                )
                .fetch_all(&self.db)
                .await?;

                enrolled_course_ids = Some(rows.into_iter().collect());
            }
        }

        let lesson_count = lessons.len();

        let result: Vec<Value> = lessons
            .into_iter()
            .filter(|l| match (&enrolled_course_ids, l.course_id) {
                (Some(enrolled), Some(course_id)) => enrolled.contains(&course_id),
                _ => true,
            })
            .map(|l| json!({
                "id": l.id, "day": l.day, "slot": l.slot, "duration": l.duration, "room": l.room,
                "subjectId": l.subject_id,
                "subjects": l.subject_id.map(|id| json!({ "id": id, "name": l.subject_name })),
                "courseId": l.course_id,
                "courses": l.course_id.map(|id| json!({ "id": id, "name": l.course_name })),
                "isDalton": l.is_dalton,
            }))
            .collect();

        Ok(PersonalSchedule {
            hidden_by_courses: lesson_count - result.len(),
            lessons: json!(result),
        })
    }

    pub async fn get_subs(&self, tenant_id: Uuid, weeks: ScheduleSubsQuery) -> AppResult<Value> {
        let subs = sqlx::query!(
            r#"SELECT id, lesson_id, course_id, week_start, day, slot, duration, subject, room,
                      cancelled, created_at
             FROM schedule_subs
             WHERE tenant_id = $1
               AND ($2::date IS NULL OR week_start >= $2)
               AND ($3::date IS NULL OR week_start <= $3)
             ORDER BY week_start"#,
            tenant_id,
            weeks.from.map(WeekStart::monday),
            weeks.to.map(WeekStart::monday)
        )
        .fetch_all(&self.db)
        .await?;

        Ok(json!(
            subs.into_iter()
                .map(|s| json!({
                    // The column is text, while lessons name their day by number.
                    "id": s.id, "lessonId": s.lesson_id, "courseId": s.course_id,
                    "weekStart": s.week_start,
                    "day": s.day.and_then(|day| day.parse::<i32>().ok()), "slot": s.slot,
                    "duration": s.duration, "subject": s.subject, "room": s.room,
                    "cancelled": s.cancelled, "createdAt": s.created_at,
                }))
                .collect::<Vec<_>>()
        ))
    }

    pub async fn get_subjects(&self, tenant_id: Uuid) -> AppResult<Value> {
        let subjects = sqlx::query!(
            r#"SELECT s.id, s.name, s.category, s.is_dalton,
                      COALESCE(
                          json_agg(json_build_object('id', c.id, 'name', c.name, 'courseType', c.course_type) ORDER BY c.name) FILTER (WHERE c.id IS NOT NULL),
                          '[]'::json
                      ) as "courses!"
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
                    "id": s.id,
                    "name": s.name,
                    "category": s.category,
                    "isDalton": s.is_dalton,
                    "courses": s.courses,
                }))
                .collect::<Vec<_>>()
        ))
    }
}
