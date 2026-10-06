//! One-time codes that prove control of an account's email address. A
//! password reset and the first password of a Google-only account both redeem
//! them, as both grant the same thing: a password for that address.
//!
//! A code is short enough to type, so it is guarded per address rather than
//! per network, which an attacker can switch at will: every code allows only a
//! few guesses, and an address receives only a few codes. That second bound
//! also keeps strangers from flooding someone's inbox through us.

use crate::{
    config::{PASSWORD_RESET_CODE_TTL, chrono_ttl},
    error::{AppError, AppResult},
};
use chrono::{DateTime, TimeDelta, Utc};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use std::num::NonZeroUsize;

const MAX_ATTEMPTS_PER_CODE: i32 = 5;

/// At most `max_codes` codes for one address within any `window`.
struct IssueLimit {
    window: TimeDelta,
    max_codes: NonZeroUsize,
}

/// Ten codes a day leave an attacker 50 guesses a day at a six-character code;
/// the hourly limit spreads them out. The longest window must not outlast how
/// long `cleanup_expired_password_resets()` keeps issued codes (migration 0050).
const ISSUE_LIMITS: [IssueLimit; 2] = [
    IssueLimit {
        window: TimeDelta::hours(1),
        max_codes: NonZeroUsize::new(3).unwrap(),
    },
    IssueLimit {
        window: TimeDelta::days(1),
        max_codes: NonZeroUsize::new(10).unwrap(),
    },
];

#[must_use]
pub enum Issuance {
    Issued(String),
    /// The address received as many codes as it may for now. Nothing was
    /// stored or sent, so the code it got last stays valid.
    Throttled {
        retry_after: TimeDelta,
    },
}

/// Issues a new code for `email`, replacing the previous one, unless the
/// address is at its limit.
pub async fn issue(db: &PgPool, email: &str) -> AppResult<Issuance> {
    let mut tx = db.begin().await?;

    // Serialises requests for the same address until commit, so concurrent
    // ones cannot all pass the limit check below.
    sqlx::query!(
        "SELECT FROM pg_advisory_xact_lock(hashtextextended($1, 0))",
        email
    )
    .execute(&mut *tx)
    .await?;

    let now = Utc::now();
    let issued_newest_first = sqlx::query_scalar!(
        r#"SELECT created_at FROM password_resets
           WHERE email = $1 AND created_at > $2
           ORDER BY created_at DESC"#,
        email,
        now - longest_window()
    )
    .fetch_all(&mut *tx)
    .await?;

    if let Some(retry_after) = retry_after(&issued_newest_first, now) {
        tx.rollback().await?;
        return Ok(Issuance::Throttled { retry_after });
    }

    sqlx::query!(
        r#"UPDATE password_resets SET used = true WHERE email = $1 AND used = false"#,
        email
    )
    .execute(&mut *tx)
    .await?;

    let code = hex::encode_upper(rand::random::<[u8; 3]>());

    // The same clock as the limit check, so a code counts exactly as long as
    // its windows say.
    sqlx::query!(
        r#"INSERT INTO password_resets (email, code, expires_at, created_at)
           VALUES ($1, $2, $3, $4)"#,
        email,
        code,
        now + chrono_ttl(PASSWORD_RESET_CODE_TTL),
        now
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Issuance::Issued(code))
}

/// Checks `code` against the latest code of `email` and uses it up on a match.
pub async fn redeem(db: &PgPool, email: &str, code: &str) -> AppResult<()> {
    let code = code.trim();

    let mut tx = db.begin().await?;

    let pr = sqlx::query!(
        r#"
        UPDATE password_resets SET attempts = attempts + 1
        WHERE id = (
            SELECT id FROM password_resets
            WHERE email = $1 AND used = false
            ORDER BY created_at DESC LIMIT 1
        )
        RETURNING id, code, expires_at, attempts
        "#,
        email
    )
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::BadRequest("Invalid code.".into()))?;

    if pr.attempts > MAX_ATTEMPTS_PER_CODE {
        sqlx::query!(
            r#"UPDATE password_resets SET used = true WHERE id = $1"#,
            pr.id
        )
        .execute(&mut *tx)
        .await?;
        tx.commit().await?;
        return Err(AppError::BadRequest(
            "Too many attempts. Please request a new code.".into(),
        ));
    }

    if pr.expires_at < Utc::now() {
        tx.commit().await?;
        return Err(AppError::BadRequest("Code has expired.".into()));
    }

    if !constant_time_str_eq(code, &pr.code) {
        tx.commit().await?;
        return Err(AppError::BadRequest("Invalid code.".into()));
    }

    sqlx::query!(
        r#"UPDATE password_resets SET used = true WHERE id = $1"#,
        pr.id
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(())
}

/// Comparing digests takes the same time wherever the inputs first differ.
fn constant_time_str_eq(a: &str, b: &str) -> bool {
    Sha256::digest(a.as_bytes()) == Sha256::digest(b.as_bytes())
}

fn longest_window() -> TimeDelta {
    ISSUE_LIMITS
        .iter()
        .map(|limit| limit.window)
        .max()
        .unwrap_or_default()
}

/// How long until the address may receive another code, given when its codes
/// of the longest window were issued, newest first.
fn retry_after(issued_newest_first: &[DateTime<Utc>], now: DateTime<Utc>) -> Option<TimeDelta> {
    ISSUE_LIMITS
        .iter()
        .filter_map(|limit| {
            // Once this code leaves the window, the window has room again.
            let oldest_counted = issued_newest_first.get(limit.max_codes.get() - 1)?;
            let frees_up_at = *oldest_counted + limit.window;
            (frees_up_at > now).then(|| frees_up_at - now)
        })
        .max()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        DateTime::from_timestamp(1_800_000_000, 0).unwrap()
    }

    /// Codes issued the given number of minutes ago, newest first.
    fn issued(minutes_ago: &[i64]) -> Vec<DateTime<Utc>> {
        minutes_ago
            .iter()
            .map(|&m| now() - TimeDelta::minutes(m))
            .collect()
    }

    #[test]
    fn codes_below_every_limit_are_issued() {
        assert_eq!(retry_after(&[], now()), None);
        assert_eq!(retry_after(&issued(&[1, 2]), now()), None);
    }

    #[test]
    fn the_hourly_limit_waits_for_its_oldest_code_to_leave_the_hour() {
        assert_eq!(
            retry_after(&issued(&[1, 2, 40]), now()),
            Some(TimeDelta::minutes(20))
        );
    }

    #[test]
    fn codes_older_than_an_hour_only_count_towards_the_day() {
        assert_eq!(retry_after(&issued(&[1, 2, 61]), now()), None);
    }

    #[test]
    fn the_daily_limit_holds_once_hours_apart_codes_add_up() {
        let ten_codes = issued(&[70, 140, 210, 280, 350, 420, 490, 560, 630, 700]);
        assert_eq!(
            retry_after(&ten_codes, now()),
            Some(TimeDelta::days(1) - TimeDelta::minutes(700))
        );
    }

    #[test]
    fn the_longer_wait_wins_when_both_limits_are_reached() {
        let codes = issued(&[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        assert_eq!(
            retry_after(&codes, now()),
            Some(TimeDelta::days(1) - TimeDelta::minutes(10))
        );
    }
}
