use crate::common::cloudinary::Cloudinary;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use std::{collections::HashSet, time::Duration};
use tokio::time::MissedTickBehavior;

/// Deleting an item hides its files at once; the files themselves linger at
/// most this long.
const PURGE_INTERVAL: Duration = Duration::from_secs(60);
/// Bounds the Cloudinary calls of one pass; a backlog drains over several.
const PURGE_BATCH_SIZE: i64 = 100;

/// Deletes the Cloudinary files the database queues whenever an item is
/// deleted or loses an image (see the triggers in migration 0040). The queue
/// is durable, so a failed or interrupted deletion is retried on the next pass
/// instead of leaving the file behind.
pub fn spawn_purge_worker(db: PgPool, cloudinary: Cloudinary) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(PURGE_INTERVAL);
        interval.set_missed_tick_behavior(MissedTickBehavior::Delay);

        loop {
            interval.tick().await;
            if let Err(e) = purge_queued_assets(&db, &cloudinary).await {
                tracing::warn!("Asset purge failed: {e}");
            }
        }
    });
}

async fn purge_queued_assets(db: &PgPool, cloudinary: &Cloudinary) -> sqlx::Result<()> {
    let queued = sqlx::query!(
        r#"SELECT public_id, queued_at FROM asset_deletion_queue
           ORDER BY queued_at
           LIMIT $1"#,
        PURGE_BATCH_SIZE
    )
    .fetch_all(db)
    .await?;

    if queued.is_empty() {
        return Ok(());
    }

    let public_ids: Vec<String> = queued.iter().map(|q| q.public_id.clone()).collect();
    let unreferenced = unreferenced(db, &public_ids).await?;

    let mut settled_ids = Vec::with_capacity(queued.len());
    let mut settled_at: Vec<DateTime<Utc>> = Vec::with_capacity(queued.len());

    for entry in queued {
        // A file still in use, or outside this deployment's folder, is not
        // ours to delete; its entry is settled without touching Cloudinary.
        let deletable =
            unreferenced.contains(&entry.public_id) && cloudinary.owns(&entry.public_id);

        if deletable && let Err(e) = cloudinary.destroy(&entry.public_id).await {
            tracing::warn!(public_id = entry.public_id, "Cloudinary delete failed: {e}");
            continue;
        }

        settled_ids.push(entry.public_id);
        settled_at.push(entry.queued_at);
    }

    // An entry queued again since it was read may have lost the reference
    // that kept it, so only the exact entries handled here are removed.
    sqlx::query!(
        r#"DELETE FROM asset_deletion_queue q
           USING unnest($1::text[], $2::timestamptz[]) AS settled(public_id, queued_at)
           WHERE q.public_id = settled.public_id AND q.queued_at = settled.queued_at"#,
        &settled_ids,
        &settled_at
    )
    .execute(db)
    .await?;

    Ok(())
}

/// Public IDs are chosen by the client, so another task or a group avatar may
/// point at the same file; only files referenced nowhere may be deleted.
async fn unreferenced(db: &PgPool, public_ids: &[String]) -> sqlx::Result<HashSet<String>> {
    let ids = sqlx::query_scalar!(
        r#"SELECT public_id AS "public_id!" FROM unnest($1::text[]) AS public_id
           EXCEPT
           SELECT ids.public_id FROM items, LATERAL item_asset_ids(items.images) AS ids(public_id)
           WHERE ids.public_id = ANY($1)
           EXCEPT
           SELECT public_id FROM unnest($1::text[]) AS public_id
           JOIN groups g ON g.avatar_url LIKE '%/' || public_id || '.%'"#,
        public_ids
    )
    .fetch_all(db)
    .await?;

    Ok(ids.into_iter().collect())
}
