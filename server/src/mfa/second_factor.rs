//! Checks a code against an account's active second factor.
//!
//! A six-digit code is guessable, so wrong codes are counted per account
//! rather than per IP address: an attacker who knows the password could
//! otherwise spread guesses over as many addresses as they control. Every run
//! of consecutive misses locks the factor for twice as long as the previous
//! one, which keeps the expected number of guesses negligible while a user who
//! mistypes a few times is barely slowed down.

use super::totp::{TimeStep, Totp};
use crate::{
    common::{encryption::EncryptionService, jwt::now_secs},
    error::{AppError, AppResult},
};
use chrono::{TimeDelta, Utc};
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

const MISSES_PER_LOCK: i32 = 5;
const FIRST_LOCK: TimeDelta = TimeDelta::minutes(5);
const LONGEST_LOCK: TimeDelta = TimeDelta::hours(24);

#[must_use]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CodeCheck {
    Accepted,
    Rejected,
}

/// How long the factor locks after `consecutive_misses`, if this miss
/// completes a run.
fn lock_after(consecutive_misses: i32) -> Option<TimeDelta> {
    if consecutive_misses <= 0 || consecutive_misses % MISSES_PER_LOCK != 0 {
        return None;
    }

    let doublings = u32::try_from(consecutive_misses / MISSES_PER_LOCK - 1).ok()?;
    let lock = 2_i32
        .checked_pow(doublings)
        .and_then(|factor| FIRST_LOCK.checked_mul(factor))
        .unwrap_or(LONGEST_LOCK);

    Some(lock.min(LONGEST_LOCK))
}

/// Verifies `code` for the user's enabled second factor and records the
/// outcome. A locked factor fails with [`AppError::MfaLocked`] without the code
/// being looked at, as does the miss that starts a lock; an account without an
/// enabled factor is `Rejected`.
pub async fn check_code(
    db: &PgPool,
    enc: &EncryptionService,
    user_id: Uuid,
    code: &str,
) -> AppResult<CodeCheck> {
    let mut tx = db.begin().await?;

    // The row lock serialises concurrent attempts, so parallel requests cannot
    // each see a counter below the limit.
    let Some(user) = sqlx::query!(
        r#"SELECT email, mfa_secret AS "mfa_secret!", mfa_failed_attempts,
                  mfa_locked_until, mfa_last_used_step
           FROM users
           WHERE id = $1 AND mfa_enabled AND mfa_secret IS NOT NULL
           FOR UPDATE"#,
        user_id
    )
    .fetch_optional(&mut *tx)
    .await?
    else {
        return Ok(CodeCheck::Rejected);
    };

    let now = Utc::now();
    if let Some(locked_until) = user.mfa_locked_until
        && locked_until > now
    {
        return Err(AppError::MfaLocked {
            retry_after: locked_until - now,
        });
    }

    let totp = Totp::from_stored(enc, user.mfa_secret, user_id, &user.email).await?;
    let last_used = user.mfa_last_used_step.map(TimeStep::from_db);
    let fresh_step = totp
        .matching_step(code, now_secs())
        .filter(|&step| last_used.is_none_or(|last| step > last));

    let Some(step) = fresh_step else {
        let misses = user.mfa_failed_attempts.saturating_add(1);
        let lock = lock_after(misses);

        sqlx::query!(
            r#"UPDATE users SET mfa_failed_attempts = $2, mfa_locked_until = $3 WHERE id = $1"#,
            user_id,
            misses,
            lock.map(|lock| now + lock)
        )
        .execute(&mut *tx)
        .await?;

        if let Some(lock) = lock {
            sqlx::query!(
                r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'mfa:locked', $2)"#,
                user_id,
                json!({ "consecutiveMisses": misses, "lockedForSecs": lock.num_seconds() })
            )
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;

        // The miss that starts a lock already says so, rather than leaving the
        // user to find out with their next code.
        return match lock {
            Some(retry_after) => Err(AppError::MfaLocked { retry_after }),
            None => Ok(CodeCheck::Rejected),
        };
    };

    sqlx::query!(
        r#"UPDATE users
           SET mfa_failed_attempts = 0, mfa_locked_until = NULL, mfa_last_used_step = $2
           WHERE id = $1"#,
        user_id,
        step.as_db()
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(CodeCheck::Accepted)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn misses_within_a_run_do_not_lock() {
        for misses in [0, 1, 2, 3, 4, 6, 9, 11] {
            assert_eq!(lock_after(misses), None, "locked after {misses}");
        }
    }

    #[test]
    fn each_completed_run_doubles_the_lock() {
        assert_eq!(lock_after(5), Some(TimeDelta::minutes(5)));
        assert_eq!(lock_after(10), Some(TimeDelta::minutes(10)));
        assert_eq!(lock_after(15), Some(TimeDelta::minutes(20)));
        assert_eq!(lock_after(20), Some(TimeDelta::minutes(40)));
    }

    #[test]
    fn locks_never_exceed_a_day() {
        assert_eq!(lock_after(50), Some(LONGEST_LOCK));
        assert_eq!(lock_after(5 * 40), Some(LONGEST_LOCK));
        assert_eq!(lock_after(i32::MAX - i32::MAX % 5), Some(LONGEST_LOCK));
    }
}
