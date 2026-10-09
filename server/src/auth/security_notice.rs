//! Emails that tell account owners about changes to how their account is
//! secured, so a change they did not make cannot go unnoticed.

use crate::{
    common::{
        email::{EmailService, SecurityNotice},
        locale::Locale,
    },
    error::{AppError, AppResult},
};
use sqlx::PgPool;
use uuid::Uuid;

/// Sends the notice in the background once the change is committed: a slow or
/// failing mail provider must neither delay nor undo a change that already
/// took effect, so a failure is only logged.
pub fn notify(db: &PgPool, email: &EmailService, user_id: Uuid, event: SecurityNotice) {
    let (db, email) = (db.clone(), email.clone());

    tokio::spawn(async move {
        if let Err(e) = send(&db, &email, user_id, event).await {
            tracing::warn!(%user_id, ?event, "Security notice not sent: {e}");
        }
    });
}

async fn send(
    db: &PgPool,
    email: &EmailService,
    user_id: Uuid,
    event: SecurityNotice,
) -> AppResult<()> {
    let recipient = sqlx::query!(
        r#"SELECT email, preferences->>'language' AS language FROM users WHERE id = $1"#,
        user_id
    )
    .fetch_optional(db)
    .await?
    .ok_or_else(|| AppError::internal("Account vanished before its security notice was sent"))?;

    email
        .send_security_notice(
            &recipient.email,
            Locale::from_stored(recipient.language.as_deref()),
            event,
        )
        .await
}
