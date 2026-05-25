use crate::{
    error::{AppError, AppResult},
    state::AppState,
};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

pub struct UserService {
    db: PgPool,
}

impl UserService {
    pub fn from_state(state: &AppState) -> Self {
        Self {
            db: state.db.clone(),
        }
    }

    pub async fn update_personalization(
        &self,
        user_id: Uuid,
        personalized: bool,
    ) -> AppResult<Value> {
        let row = sqlx::query!(
            "UPDATE users SET personalized = $1 WHERE id = $2 RETURNING personalized",
            personalized,
            user_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("User not found"))?;

        sqlx::query!(
            "INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'profile:personalization:update', $2)",
            user_id, json!({ "personalized": personalized })
        ).execute(&self.db).await?;

        Ok(json!({ "ok": true, "personalized": row.personalized }))
    }

    pub async fn update_preferences(
        &self,
        user_id: Uuid,
        prefs: serde_json::Value,
    ) -> AppResult<Value> {
        let user = sqlx::query!("SELECT preferences FROM users WHERE id = $1", user_id)
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::not_found("User not found"))?;

        let mut current = user
            .preferences
            .and_then(|v| v.as_object().cloned())
            .unwrap_or_default();

        let allowed = ["theme", "language", "personalized"];

        if let Some(obj) = prefs.as_object() {
            for (k, v) in obj {
                if allowed.contains(&k.as_str()) && !v.is_null() {
                    current.insert(k.clone(), v.clone());
                }
            }
        }

        let merged = Value::Object(current);
        sqlx::query!(
            "UPDATE users SET preferences = $1 WHERE id = $2",
            merged,
            user_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            "INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'profile:preferences:update', $2)",
            user_id, prefs
        ).execute(&self.db).await?;

        Ok(json!({ "ok": true, "preferences": merged }))
    }

    pub async fn update_setup(
        &self,
        user_id: Uuid,
        global_role: &str,
        courses: Vec<(Uuid, Uuid)>,
    ) -> AppResult<Value> {
        sqlx::query!("UPDATE users SET done_setup = true WHERE id = $1", user_id)
            .execute(&self.db)
            .await?;

        sqlx::query!("DELETE FROM user_courses WHERE user_id = $1", user_id)
            .execute(&self.db)
            .await?;

        for (subject_id, course_id) in &courses {
            sqlx::query!(
                "INSERT INTO user_courses (user_id, subject_id, course_id) VALUES ($1, $2, $3)",
                user_id,
                subject_id,
                course_id
            )
            .execute(&self.db)
            .await?;
        }

        let courses_json: Vec<Value> = courses
            .iter()
            .map(|(s, c)| json!({ "subjectId": s, "courseId": c }))
            .collect();

        sqlx::query!(
            "INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'profile:setup:complete', $2)",
            user_id, json!({ "courses": courses_json })
        ).execute(&self.db).await?;

        Ok(json!({ "ok": true, "doneSetup": true }))
    }

    pub async fn get_checks(&self, user_id: Uuid) -> AppResult<Value> {
        let rows = sqlx::query!(
            "SELECT item_id FROM keep_checked WHERE user_id = $1",
            user_id
        )
        .fetch_all(&self.db)
        .await?;

        Ok(json!({ "itemIds": rows.iter().map(|r| r.item_id).collect::<Vec<_>>() }))
    }

    pub async fn get_pins(&self, user_id: Uuid) -> AppResult<Value> {
        let rows = sqlx::query!(
            "SELECT item_id FROM pinned_items WHERE user_id = $1",
            user_id
        )
        .fetch_all(&self.db)
        .await?;

        Ok(json!({ "itemIds": rows.iter().map(|r| r.item_id).collect::<Vec<_>>() }))
    }

    pub async fn get_visibility(&self, user_id: Uuid) -> AppResult<Value> {
        let rows = sqlx::query!(
            "SELECT item_id, status FROM user_item_visibility WHERE user_id = $1",
            user_id
        )
        .fetch_all(&self.db)
        .await?;

        let mut archived = vec![];

        let mut kept = vec![];

        for r in rows {
            match r.status.as_deref() {
                Some("archived") => archived.push(r.item_id),
                Some("kept") => kept.push(r.item_id),
                _ => {}
            }
        }
        Ok(json!({ "archived": archived, "kept": kept }))
    }

    pub async fn set_visibility(
        &self,
        tenant_id: Uuid,
        item_id: Uuid,
        user_id: Uuid,
        status: &str,
    ) -> AppResult<Value> {
        sqlx::query!(
            "SELECT id FROM items WHERE id = $1 AND tenant_id = $2",
            item_id,
            tenant_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Item not found."))?;

        sqlx::query!(
            "DELETE FROM user_item_visibility WHERE item_id = $1 AND user_id = $2",
            item_id,
            user_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            "INSERT INTO user_item_visibility (item_id, user_id, status) VALUES ($1, $2, $3)",
            item_id,
            user_id,
            status
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            "INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'item:visibility:set', $2)",
            user_id, json!({ "itemId": item_id, "status": status })
        ).execute(&self.db).await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn remove_visibility(&self, item_id: Uuid, user_id: Uuid) -> AppResult<Value> {
        sqlx::query!(
            "DELETE FROM user_item_visibility WHERE item_id = $1 AND user_id = $2",
            item_id,
            user_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            "INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'item:visibility:remove', $2)",
            user_id, json!({ "itemId": item_id })
        ).execute(&self.db).await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn log_page_load(&self, user_id: Uuid, user_agent: &str) -> AppResult<Value> {
        let ua = &user_agent[..user_agent.len().min(100)];
        sqlx::query!(
            "INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'page:load', $2)",
            user_id,
            json!({ "userAgent": ua })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn check_item(
        &self,
        tenant_id: Uuid,
        item_id: Uuid,
        user_id: Uuid,
    ) -> AppResult<Value> {
        sqlx::query!(
            "SELECT id FROM items WHERE id = $1 AND tenant_id = $2",
            item_id,
            tenant_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Not found."))?;

        sqlx::query!(
            "DELETE FROM keep_checked WHERE item_id = $1 AND user_id = $2",
            item_id,
            user_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            "INSERT INTO keep_checked (item_id, user_id, checked_at) VALUES ($1, $2, now())",
            item_id,
            user_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            "INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'item:check', $2)",
            user_id,
            json!({ "itemId": item_id })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn uncheck_item(&self, item_id: Uuid, user_id: Uuid) -> AppResult<Value> {
        sqlx::query!(
            "DELETE FROM keep_checked WHERE item_id = $1 AND user_id = $2",
            item_id,
            user_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            "INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'item:uncheck', $2)",
            user_id,
            json!({ "itemId": item_id })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn pin_item(
        &self,
        tenant_id: Uuid,
        item_id: Uuid,
        user_id: Uuid,
    ) -> AppResult<Value> {
        sqlx::query!(
            "SELECT id FROM items WHERE id = $1 AND tenant_id = $2",
            item_id,
            tenant_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Not found."))?;

        sqlx::query!(
            "DELETE FROM pinned_items WHERE item_id = $1 AND user_id = $2",
            item_id,
            user_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            "INSERT INTO pinned_items (item_id, user_id, pinned_at) VALUES ($1, $2, now())",
            item_id,
            user_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            "INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'item:pin', $2)",
            user_id,
            json!({ "itemId": item_id })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn unpin_item(&self, item_id: Uuid, user_id: Uuid) -> AppResult<Value> {
        sqlx::query!(
            "DELETE FROM pinned_items WHERE item_id = $1 AND user_id = $2",
            item_id,
            user_id
        )
        .execute(&self.db)
        .await?;

        sqlx::query!(
            "INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'item:unpin', $2)",
            user_id,
            json!({ "itemId": item_id })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true }))
    }
}
