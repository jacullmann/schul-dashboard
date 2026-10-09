//! Sign-ups waiting for their email address to be confirmed.
//!
//! A sign-up creates no account. It is stored here with the password it chose
//! and lives for [`EMAIL_VERIFY_TTL`] (`cleanup_unverified_users()`, migration
//! 0063). The account only comes into being when the emailed code is entered
//! together with that same password: the code proves the mailbox, the
//! password proves who signed up. Several sign-ups for one address therefore
//! never interfere, and someone who signs up with another person's address
//! cannot hold or take over the account they would get.
//!
//! Every code allows [`MAX_ATTEMPTS_PER_CODE`] guesses, and an address
//! receives only as many codes as [`MAIL_LIMITS`] allow, so a code can be
//! short without being guessable.

use super::email_code::{EmailCode, Issuance, MAX_ATTEMPTS_PER_CODE};
use crate::{
    common::send_limit::{MAIL_LIMITS, longest_window, retry_after},
    config::{EMAIL_VERIFY_TTL, chrono_ttl},
    error::AppResult,
};
use chrono::{DateTime, Utc};
use sqlx::{PgConnection, PgExecutor};
use uuid::Uuid;

/// What a confirmed sign-up turns into.
pub struct SignUp {
    pub password_hash: String,
    pub preferences: serde_json::Value,
}

/// A sign-up whose code was entered, before its password was checked.
pub struct PendingSignUp {
    pub id: Uuid,
    pub sign_up: SignUp,
}

/// A code mailed again for the latest sign-up of an address.
pub struct ResentCode {
    pub code: EmailCode,
    pub language: Option<String>,
}

/// Stores a sign-up for `email` with a new code, unless the address received
/// as many mails as it may for now. The caller holds
/// [`lock_address`](super::email_code::lock_address) for `email`.
pub async fn issue(conn: &mut PgConnection, email: &str, sign_up: &SignUp) -> AppResult<Issuance> {
    let now = Utc::now();
    if let Some(retry_after) = throttled(conn, email, now).await? {
        return Ok(Issuance::Throttled { retry_after });
    }

    let code = EmailCode::generate();
    sqlx::query!(
        r#"INSERT INTO verifications
               (email, code, password_hash, preferences, expires_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)"#,
        email,
        code.as_str(),
        sign_up.password_hash,
        sign_up.preferences,
        now + chrono_ttl(EMAIL_VERIFY_TTL),
        now
    )
    .execute(&mut *conn)
    .await?;

    Ok(Issuance::Issued(code))
}

/// Mails a new code for the latest sign-up of `email` that has not expired.
/// The code expires with its sign-up, however late it is sent. The caller
/// holds [`lock_address`](super::email_code::lock_address) for `email`.
pub async fn reissue_latest(conn: &mut PgConnection, email: &str) -> AppResult<Option<ResentCode>> {
    let now = Utc::now();
    if throttled(conn, email, now).await?.is_some() {
        return Ok(None);
    }

    let code = EmailCode::generate();
    let language = sqlx::query_scalar!(
        r#"INSERT INTO verifications
               (email, code, password_hash, preferences, expires_at, created_at)
           SELECT email, $2, password_hash, preferences, expires_at, $3
           FROM verifications
           WHERE email = $1 AND expires_at > $3
           ORDER BY created_at DESC
           LIMIT 1
           RETURNING preferences->>'language' AS language"#,
        email,
        code.as_str(),
        now
    )
    .fetch_optional(&mut *conn)
    .await?;

    Ok(language.map(|language| ResentCode { code, language }))
}

/// Uses up a guess of every sign-up of `email` that is still waiting and
/// returns the one `code` was mailed for, if any. The guess counts even when
/// the request fails afterwards.
pub async fn redeem<'e>(
    db: impl PgExecutor<'e>,
    email: &str,
    code: &EmailCode,
) -> AppResult<Option<PendingSignUp>> {
    let waiting = sqlx::query!(
        r#"UPDATE verifications SET attempts = attempts + 1
           WHERE email = $1 AND expires_at > now() AND attempts < $2
           RETURNING id, code, password_hash, preferences"#,
        email,
        MAX_ATTEMPTS_PER_CODE
    )
    .fetch_all(db)
    .await?;

    let matched = waiting.into_iter().find(|row| code.matches(&row.code));

    Ok(matched.map(|row| PendingSignUp {
        id: row.id,
        sign_up: SignUp {
            password_hash: row.password_hash,
            preferences: row.preferences,
        },
    }))
}

/// Removes every sign-up of `email` once the one of `id` became the account.
/// `false` when that sign-up was settled in the meantime.
pub async fn settle(conn: &mut PgConnection, email: &str, id: Uuid) -> AppResult<bool> {
    let used = sqlx::query_scalar!(
        r#"WITH settled AS (DELETE FROM verifications WHERE email = $1 RETURNING id)
           SELECT EXISTS (SELECT 1 FROM settled WHERE id = $2) AS "used!""#,
        email,
        id
    )
    .fetch_one(conn)
    .await?;

    Ok(used)
}

/// The password of the latest sign-up of `email` that has not expired, so a
/// sign-in with it can be told to confirm the address first.
pub async fn latest_password_hash<'e>(
    db: impl PgExecutor<'e>,
    email: &str,
) -> AppResult<Option<String>> {
    Ok(sqlx::query_scalar!(
        r#"SELECT password_hash FROM verifications
           WHERE email = $1 AND expires_at > now()
           ORDER BY created_at DESC
           LIMIT 1"#,
        email
    )
    .fetch_optional(db)
    .await?)
}

async fn throttled(
    conn: &mut PgConnection,
    email: &str,
    now: DateTime<Utc>,
) -> AppResult<Option<chrono::TimeDelta>> {
    let sent_newest_first = sqlx::query_scalar!(
        r#"SELECT created_at FROM verifications
           WHERE email = $1 AND created_at > $2
           ORDER BY created_at DESC"#,
        email,
        now - longest_window(&MAIL_LIMITS)
    )
    .fetch_all(conn)
    .await?;

    Ok(retry_after(&MAIL_LIMITS, &sent_newest_first, now))
}
