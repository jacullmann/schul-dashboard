//! Wrong passwords at sign-in, counted per account under the growing locks of
//! [`lockout`].
//!
//! Sign-in needs no session, so it takes the most guesses and the most load.
//! Each attempt is therefore counted as a miss *before* the password is
//! hashed, and a correct password takes it back. The account row is locked
//! only for that short count, never while Argon2 runs, so a flood of sign-ins
//! cannot hold every database connection while waiting for a core. Because
//! the miss that completes a run locks at once, parallel guesses cannot slip
//! past it either: a run allows exactly as many guesses as the policy says.

use crate::{
    common::lockout,
    error::{AppError, AppResult, AuthFailure},
};
use chrono::{TimeDelta, Utc};
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

/// A password attempt already counted as a miss against the account. Settle it
/// with [`Self::accept`] or [`Self::reject`] once the password is checked.
#[must_use = "a reserved attempt stays counted as a miss until it is settled"]
pub struct Attempt {
    user_id: Uuid,
    misses: i32,
    /// The lock this attempt starts if the password turns out wrong.
    starts_lock: Option<TimeDelta>,
}

/// Counts an attempt for the account, unless its password is locked.
pub async fn reserve(db: &PgPool, user_id: Uuid) -> AppResult<Attempt> {
    let mut tx = db.begin().await?;

    let stored = sqlx::query!(
        r#"SELECT password_failed_attempts, password_locked_until
           FROM users WHERE id = $1 FOR UPDATE"#,
        user_id
    )
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AuthFailure::InvalidCredentials)?;

    let now = Utc::now();
    let counter = lockout::Counter {
        misses: stored.password_failed_attempts,
        locked_until: stored.password_locked_until,
    };
    if let Some(retry_after) = counter.locked_for(now) {
        return Err(AppError::LoginLocked { retry_after });
    }

    let counter = counter.after_miss(now);
    sqlx::query!(
        r#"UPDATE users SET password_failed_attempts = $2, password_locked_until = $3
           WHERE id = $1"#,
        user_id,
        counter.misses,
        counter.locked_until
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Attempt {
        user_id,
        misses: counter.misses,
        starts_lock: counter.locked_for(now),
    })
}

impl Attempt {
    /// The password was right: the run of misses ends, and with it the lock
    /// this attempt may have started.
    pub async fn accept(self, db: &PgPool) -> AppResult<()> {
        sqlx::query!(
            r#"UPDATE users SET password_failed_attempts = 0, password_locked_until = NULL
               WHERE id = $1"#,
            self.user_id
        )
        .execute(db)
        .await?;

        Ok(())
    }

    /// The password was wrong. The miss is already counted; this records why
    /// and returns the answer the client gets.
    pub async fn reject(self, db: &PgPool, ip: Option<&str>) -> AppError {
        match self.record_miss(db, ip).await {
            Ok(()) => match self.starts_lock {
                Some(retry_after) => AppError::LoginLocked { retry_after },
                None => AuthFailure::InvalidCredentials.into(),
            },
            Err(e) => e,
        }
    }

    async fn record_miss(&self, db: &PgPool, ip: Option<&str>) -> AppResult<()> {
        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'auth:login_failed', $2)"#,
            self.user_id,
            json!({ "ip": ip, "reason": "bad_password" })
        )
        .execute(db)
        .await?;

        if let Some(lock) = self.starts_lock {
            sqlx::query!(
                r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'auth:login:locked', $2)"#,
                self.user_id,
                json!({ "consecutiveMisses": self.misses, "lockedForSecs": lock.num_seconds() })
            )
            .execute(db)
            .await?;
        }

        Ok(())
    }
}
