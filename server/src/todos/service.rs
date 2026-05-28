use crate::{
    common::encryption::EncryptionService,
    error::{AppError, AppResult},
    state::AppState,
};
use fractional_index::FractionalIndex;
use serde::Deserialize;
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

pub struct TodoService {
    db: PgPool,
    enc: EncryptionService,
}

#[derive(Deserialize)]
struct FiWrapper(#[serde(with = "fractional_index::stringify")] FractionalIndex);

fn parse_index(s: &str) -> AppResult<FractionalIndex> {
    serde_json::from_value::<FiWrapper>(serde_json::Value::String(s.to_string()))
        .map(|w| w.0)
        .map_err(|_| AppError::internal("Invalid position encoding"))
}

impl TodoService {
    pub fn from_state(state: &AppState) -> Self {
        Self {
            db: state.db.clone(),
            enc: state.encryption.clone(),
        }
    }

    pub async fn get_todos(&self, user_id: Uuid) -> AppResult<Vec<Value>> {
        let todos = sqlx::query!(
            r#"SELECT id, encrypted_title, encrypted_description, completed, position, created_at, updated_at
               FROM encrypted_todos WHERE user_id = $1
               ORDER BY position ASC NULLS LAST, created_at ASC"#,
            user_id
        )
            .fetch_all(&self.db)
            .await?;

        let uid = user_id.to_string();

        let mut result = Vec::with_capacity(todos.len());

        for t in todos {
            let title_payload: crate::common::encryption::EncryptedPayload =
                serde_json::from_value(t.encrypted_title)
                    .map_err(|_| AppError::internal("Invalid encrypted title"))?;

            let title = self.enc.decrypt(&title_payload, &uid).await?;

            let description = match t.encrypted_description {
                Some(desc_val) => {
                    match serde_json::from_value::<crate::common::encryption::EncryptedPayload>(
                        desc_val,
                    ) {
                        Ok(p) if !p.data.is_empty() => {
                            self.enc.decrypt(&p, &uid).await.unwrap_or_default()
                        }
                        _ => String::new(),
                    }
                }
                None => String::new(),
            };

            result.push(json!({
                "id": t.id,
                "title": title,
                "description": description,
                "completed": t.completed,
                "position": t.position.unwrap_or_default(),
                "createdAt": t.created_at,
                "updatedAt": t.updated_at,
            }));
        }

        Ok(result)
    }

    pub async fn create_todo(
        &self,
        user_id: Uuid,
        title: &str,
        description: Option<&str>,
    ) -> AppResult<Value> {
        let uid = user_id.to_string();

        let first = sqlx::query!(
            r#"SELECT position FROM encrypted_todos
               WHERE user_id = $1
               ORDER BY position ASC NULLS LAST LIMIT 1"#,
            user_id
        )
        .fetch_optional(&self.db)
        .await?;

        let new_pos = if let Some(row) = first {
            if let Some(pos) = row.position {
                FractionalIndex::new_before(&parse_index(&pos)?)
            } else {
                FractionalIndex::default()
            }
        } else {
            FractionalIndex::default()
        };

        let new_pos_str = new_pos.to_string();

        let enc_title = self.enc.encrypt(title.trim(), &uid).await?;

        let enc_desc = self
            .enc
            .encrypt(description.unwrap_or("").trim(), &uid)
            .await?;

        let todo = sqlx::query!(
            r#"INSERT INTO encrypted_todos (user_id, encrypted_title, encrypted_description, position)
               VALUES ($1, $2, $3, $4)
               RETURNING id, completed, position, created_at, updated_at"#,
            user_id,
            serde_json::to_value(&enc_title).unwrap(),
            serde_json::to_value(&enc_desc).unwrap(),
            new_pos_str,
        )
            .fetch_one(&self.db)
            .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'todo:create', $2)"#,
            user_id,
            json!({ "todoId": todo.id })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({
            "id": todo.id,
            "title": title.trim(),
            "description": description.unwrap_or("").trim(),
            "completed": todo.completed,
            "position": todo.position.unwrap_or_default(),
            "createdAt": todo.created_at,
            "updatedAt": todo.updated_at,
        }))
    }

    pub async fn update_todo(
        &self,
        user_id: Uuid,
        id: Uuid,
        title: &str,
        description: Option<&str>,
    ) -> AppResult<Value> {
        let uid = user_id.to_string();

        sqlx::query!(
            r#"SELECT id FROM encrypted_todos WHERE id = $1 AND user_id = $2"#,
            id,
            user_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Private entry not found"))?;

        let enc_title = self.enc.encrypt(title.trim(), &uid).await?;

        let enc_desc = self
            .enc
            .encrypt(description.unwrap_or("").trim(), &uid)
            .await?;

        let updated = sqlx::query!(
            r#"UPDATE encrypted_todos
               SET encrypted_title = $1, encrypted_description = $2
               WHERE id = $3
               RETURNING id, completed, position, created_at, updated_at"#,
            serde_json::to_value(&enc_title).unwrap(),
            serde_json::to_value(&enc_desc).unwrap(),
            id,
        )
        .fetch_one(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'todo:update', $2)"#,
            user_id,
            json!({ "todoId": id })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({
            "id": updated.id,
            "title": title.trim(),
            "description": description.unwrap_or("").trim(),
            "completed": updated.completed,
            "position": updated.position.unwrap_or_default(),
            "createdAt": updated.created_at,
            "updatedAt": updated.updated_at,
        }))
    }

    pub async fn toggle_todo(&self, user_id: Uuid, id: Uuid) -> AppResult<Value> {
        let todo = sqlx::query!(
            r#"SELECT id, completed FROM encrypted_todos WHERE id = $1 AND user_id = $2"#,
            id,
            user_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Private entry not found"))?;

        let new_completed = !todo.completed;

        let updated = sqlx::query!(
            r#"UPDATE encrypted_todos SET completed = $1 WHERE id = $2
               RETURNING id, position, updated_at"#,
            new_completed,
            id
        )
        .fetch_one(&self.db)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'todo:toggle', $2)"#,
            user_id,
            json!({ "todoId": id, "completed": new_completed })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({
            "id": updated.id,
            "completed": new_completed,
            "position": updated.position.unwrap_or_default(),
            "updatedAt": updated.updated_at,
        }))
    }

    pub async fn reorder_todo(
        &self,
        user_id: Uuid,
        id: Uuid,
        prev: Option<&str>,
        next: Option<&str>,
    ) -> AppResult<Value> {
        sqlx::query!(
            r#"SELECT id FROM encrypted_todos WHERE id = $1 AND user_id = $2"#,
            id,
            user_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Private entry not found"))?;

        let new_pos = match (prev, next) {
            (None, None) => FractionalIndex::default(),
            (Some(p), None) => FractionalIndex::new_after(&parse_index(p)?),
            (None, Some(n)) => FractionalIndex::new_before(&parse_index(n)?),
            (Some(p), Some(n)) => FractionalIndex::new_between(&parse_index(p)?, &parse_index(n)?)
                .ok_or_else(|| AppError::bad_request("Cannot insert between these positions"))?,
        };

        let new_pos_str = new_pos.to_string();

        let updated = sqlx::query!(
            r#"UPDATE encrypted_todos SET position = $1 WHERE id = $2
               RETURNING id, updated_at"#,
            new_pos_str,
            id
        )
        .fetch_one(&self.db)
        .await?;

        Ok(json!({
            "id": updated.id,
            "position": new_pos_str,
            "updatedAt": updated.updated_at,
        }))
    }

    pub async fn delete_todo(&self, user_id: Uuid, id: Uuid) -> AppResult<Value> {
        sqlx::query!(
            r#"SELECT id FROM encrypted_todos WHERE id = $1 AND user_id = $2"#,
            id,
            user_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Private entry not found"))?;

        sqlx::query!(r#"DELETE FROM encrypted_todos WHERE id = $1"#, id)
            .execute(&self.db)
            .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'todo:delete', $2)"#,
            user_id,
            json!({ "todoId": id })
        )
        .execute(&self.db)
        .await?;

        Ok(json!({ "ok": true }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_roundtrip() {
        let idx = FractionalIndex::default();

        let s = idx.to_string();

        let parsed = parse_index(&s).unwrap();

        let after = FractionalIndex::new_before(&parsed);

        println!("{}", after.to_string());
    }
}
