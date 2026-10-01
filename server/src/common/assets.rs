//! Lifecycle of uploaded files. Every upload is recorded in `uploaded_assets`
//! before it is signed; a periodic sweep deletes recorded files that nothing
//! references anymore (`orphaned_assets()` in migration 0040). Deleting a task,
//! replacing a group picture or abandoning an upload therefore needs no
//! cleanup code of its own.

use crate::{
    common::cloudinary::{Cloudinary, RawExtension, UploadSignature},
    error::AppResult,
};
use sqlx::PgPool;
use std::time::Duration;
use tokio::time::MissedTickBehavior;

const SWEEP_INTERVAL: Duration = Duration::from_secs(5 * 60);
/// Bounds the Cloudinary calls of one pass; a backlog drains over several.
const SWEEP_BATCH_SIZE: i64 = 100;
/// Its heartbeat tells the superadmin overview whether the sweep keeps up.
const SWEEP_WORKER: &str = "asset-sweep";

/// Records the upload before handing out its signature, so no file can reach
/// Cloudinary without the sweep knowing it.
pub async fn issue_upload(
    db: &PgPool,
    cloudinary: &Cloudinary,
    raw_extension: Option<RawExtension>,
) -> AppResult<UploadSignature> {
    let public_id = cloudinary.new_public_id(raw_extension);

    sqlx::query!(
        r#"INSERT INTO uploaded_assets (public_id) VALUES ($1)"#,
        public_id
    )
    .execute(db)
    .await?;

    Ok(cloudinary.sign_upload(&public_id))
}

pub fn spawn_sweeper(db: PgPool, cloudinary: Cloudinary) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(SWEEP_INTERVAL);
        interval.set_missed_tick_behavior(MissedTickBehavior::Delay);

        loop {
            interval.tick().await;
            if let Err(e) = sweep_orphaned_assets(&db, &cloudinary).await {
                tracing::warn!("Asset sweep failed: {e}");
            }
        }
    });
}

async fn sweep_orphaned_assets(db: &PgPool, cloudinary: &Cloudinary) -> sqlx::Result<()> {
    let orphaned = sqlx::query_scalar!(
        r#"SELECT public_id AS "public_id!" FROM orphaned_assets()
           ORDER BY uploaded_at
           LIMIT $1"#,
        SWEEP_BATCH_SIZE
    )
    .fetch_all(db)
    .await?;

    let picked = orphaned.len();
    let mut deleted = Vec::with_capacity(picked);
    for public_id in orphaned {
        match cloudinary.destroy(&public_id).await {
            Ok(()) => deleted.push(public_id),
            // Stays recorded and is retried on the next pass.
            Err(e) => tracing::warn!(public_id, "Cloudinary delete failed: {e}"),
        }
    }

    if !deleted.is_empty() {
        sqlx::query!(
            r#"DELETE FROM uploaded_assets WHERE public_id = ANY($1)"#,
            &deleted
        )
        .execute(db)
        .await?;
    }

    // A pass only counts once every orphan it picked is gone, so a Cloudinary
    // outage shows up in the overview instead of hiding behind a running loop.
    if deleted.len() == picked {
        sqlx::query!(
            r#"INSERT INTO worker_heartbeats (worker, succeeded_at) VALUES ($1, now())
               ON CONFLICT (worker) DO UPDATE SET succeeded_at = EXCLUDED.succeeded_at"#,
            SWEEP_WORKER
        )
        .execute(db)
        .await?;
    }

    Ok(())
}
