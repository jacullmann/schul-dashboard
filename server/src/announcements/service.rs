use super::dto::{AnnouncementColor, AnnouncementContent, AnnouncementDto};
use crate::{
    error::{AppError, AppResult},
    state::AppState,
};
use sqlx::PgPool;
use uuid::Uuid;

/// The banner rotates through only the newest announcements.
const VISIBLE_LIMIT: i64 = 5;

pub struct AnnouncementService {
    db: PgPool,
}

impl AnnouncementService {
    pub fn from_state(s: &AppState) -> Self {
        Self { db: s.db.clone() }
    }

    /// Carries the read flag along so a client learns what is unread in the
    /// same round-trip, instead of fetching every read receipt separately.
    pub async fn list_visible(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
    ) -> AppResult<Vec<AnnouncementDto>> {
        let announcements = sqlx::query_as!(
            AnnouncementDto,
            r#"SELECT a.id, a.content, a.color AS "color: AnnouncementColor",
                      a.created_by, a.created_at,
                      EXISTS (
                          SELECT 1 FROM user_announcement_read_status r
                          WHERE r.announcement_id = a.id AND r.user_id = $2
                      ) AS "read!"
               FROM announcements a
               WHERE a.tenant_id = $1
               ORDER BY a.created_at DESC
               LIMIT $3"#,
            tenant_id,
            user_id,
            VISIBLE_LIMIT
        )
        .fetch_all(&self.db)
        .await?;

        Ok(announcements)
    }

    /// Ids outside the tenant are skipped by the join rather than reported, so
    /// the endpoint cannot be used to probe other groups' announcements.
    pub async fn mark_read(&self, tenant_id: Uuid, user_id: Uuid, ids: &[Uuid]) -> AppResult<()> {
        sqlx::query!(
            r#"INSERT INTO user_announcement_read_status (user_id, announcement_id)
               SELECT $1, a.id FROM announcements a
               WHERE a.tenant_id = $2 AND a.id = ANY($3)
               ON CONFLICT (user_id, announcement_id) DO NOTHING"#,
            user_id,
            tenant_id,
            ids
        )
        .execute(&self.db)
        .await?;

        Ok(())
    }

    pub async fn create(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        content: &AnnouncementContent,
        color: AnnouncementColor,
    ) -> AppResult<AnnouncementDto> {
        let announcement = sqlx::query_as!(
            AnnouncementDto,
            r#"INSERT INTO announcements (tenant_id, content, color, created_by)
               VALUES ($1, $2, $3, $4)
               RETURNING id, content, color AS "color: AnnouncementColor",
                         created_by, created_at, false AS "read!""#,
            tenant_id,
            content.as_str(),
            color as AnnouncementColor,
            user_id
        )
        .fetch_one(&self.db)
        .await?;

        Ok(announcement)
    }

    pub async fn delete(&self, tenant_id: Uuid, id: Uuid) -> AppResult<()> {
        let deleted = sqlx::query!(
            r#"DELETE FROM announcements WHERE id = $1 AND tenant_id = $2"#,
            id,
            tenant_id
        )
        .execute(&self.db)
        .await?
        .rows_affected();

        if deleted == 0 {
            return Err(AppError::not_found("Announcement not found."));
        }

        Ok(())
    }
}
