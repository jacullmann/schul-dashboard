use sqlx::PgPool;
use std::time::Duration;
use tracing::{error, info};

pub fn start_background_jobs(db: PgPool) {
    let cleanup_tokens_db = db.clone();
    let cleanup_messages_db = db.clone();

    tokio::spawn(async move {
        tokio::time::sleep(Duration::from_secs(30)).await;

        let mut interval = tokio::time::interval(Duration::from_secs(6 * 60 * 60));

        loop {
            interval.tick().await;

            match sqlx::query!(
                r#"DELETE FROM refresh_tokens
                   WHERE expires_at < now()
                      OR (revoked_at IS NOT NULL AND revoked_at < now() - interval '7 days')"#
            )
            .execute(&cleanup_tokens_db)
            .await
            {
                Ok(r) => info!("Token cleanup: {} rows deleted", r.rows_affected()),
                Err(e) => error!("Token cleanup failed: {e}"),
            }
        }
    });

    tokio::spawn(async move {
        tokio::time::sleep(Duration::from_secs(45)).await;

        let mut interval = tokio::time::interval(Duration::from_secs(12 * 60 * 60));

        loop {
            interval.tick().await;

            info!("Starting old messages cleanup job...");

            let mut tx = match cleanup_messages_db.begin().await {
                Ok(tx) => tx,
                Err(e) => {
                    error!("Failed to start transaction for messages cleanup: {e}");
                    continue;
                }
            };

            let update_res = sqlx::query!(
                r#"UPDATE public.group_messages
                   SET parent_id = NULL
                   WHERE parent_id IN (
                       SELECT id FROM public.group_messages
                       WHERE created_at < now() - INTERVAL '7 days'
                   )"#
            )
            .execute(&mut *tx)
            .await;

            if let Err(e) = update_res {
                error!("messages cleanup step 1 (UPDATE) failed: {e}. rolling back transaction.");
                let _ = tx.rollback().await;
                continue;
            }

            let updated_rows = update_res.unwrap().rows_affected();

            info!("messages cleanup (step 1/2): nullified {updated_rows} parent references");

            let delete_res = sqlx::query!(
                r#"DELETE FROM public.group_messages
                   WHERE created_at < now() - INTERVAL '7 days'"#
            )
            .execute(&mut *tx)
            .await;

            if let Err(e) = delete_res {
                error!("messages cleanup step 2 (DELETE) failed: {e}. rolling back transaction.");

                let _ = tx.rollback().await;

                continue;
            }

            let deleted_rows = delete_res.unwrap().rows_affected();

            info!("messages cleanup (step 2/2): deleted {deleted_rows} old messages");

            match tx.commit().await {
                Ok(_) => info!("messages cleanup transaction successfully committed."),
                Err(e) => error!("failed to commit messages cleanup transaction: {e}"),
            }
        }
    });
}
