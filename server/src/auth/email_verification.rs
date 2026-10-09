//! Sign-ups waiting for their email address to be confirmed.
//!
//! A sign-up creates no account. It is stored here with the password it chose
//! and lives for [`EMAIL_VERIFY_TTL`] (`cleanup_unverified_users()`, migration
//! 0063). The account only comes into being when the emailed link is opened
//! and that same password is entered: the link proves the mailbox, the
//! password proves who signed up. Several sign-ups for one address therefore
//! never interfere, and someone who signs up with another person's address
//! cannot hold or take over the account they would get.

use super::email_code::Issuance;
use crate::{
    common::send_limit::{MAIL_LIMITS, longest_window, retry_after},
    config::{EMAIL_VERIFY_TTL, chrono_ttl},
    error::AppResult,
};
use chrono::{DateTime, Utc};
use sqlx::{PgConnection, PgExecutor};

/// What a confirmed sign-up turns into.
pub struct SignUp {
    pub password_hash: String,
    pub preferences: serde_json::Value,
}

pub struct PendingSignUp {
    pub email: String,
    pub expires_at: DateTime<Utc>,
    pub sign_up: SignUp,
}

/// A link mailed again for the latest sign-up of an address.
pub struct ResentLink {
    pub token: String,
    pub language: Option<String>,
}

/// Stores a sign-up for `email` with a new link, unless the address received
/// as many mails as it may for now. The caller holds
/// [`lock_address`](super::email_code::lock_address) for `email`.
pub async fn issue(conn: &mut PgConnection, email: &str, sign_up: &SignUp) -> AppResult<Issuance> {
    let now = Utc::now();
    if let Some(retry_after) = throttled(conn, email, now).await? {
        return Ok(Issuance::Throttled { retry_after });
    }

    let token = new_token();
    sqlx::query!(
        r#"INSERT INTO verifications (email, token, password_hash, preferences, expires_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)"#,
        email,
        token,
        sign_up.password_hash,
        sign_up.preferences,
        now + chrono_ttl(EMAIL_VERIFY_TTL),
        now
    )
    .execute(&mut *conn)
    .await?;

    Ok(Issuance::Issued(token))
}

/// Mails a new link for the latest sign-up of `email` that has not expired.
/// The link expires with its sign-up, however late it is sent. The caller
/// holds [`lock_address`](super::email_code::lock_address) for `email`.
pub async fn reissue_latest(conn: &mut PgConnection, email: &str) -> AppResult<Option<ResentLink>> {
    let now = Utc::now();
    if throttled(conn, email, now).await?.is_some() {
        return Ok(None);
    }

    let resent = sqlx::query!(
        r#"INSERT INTO verifications (email, token, password_hash, preferences, expires_at, created_at)
           SELECT email, $2, password_hash, preferences, expires_at, $3
           FROM verifications
           WHERE email = $1 AND expires_at > $3
           ORDER BY created_at DESC
           LIMIT 1
           RETURNING token, preferences->>'language' AS language"#,
        email,
        new_token(),
        now
    )
    .fetch_optional(&mut *conn)
    .await?;

    Ok(resent.map(|row| ResentLink {
        token: row.token,
        language: row.language,
    }))
}

pub async fn find<'e>(db: impl PgExecutor<'e>, token: &str) -> AppResult<Option<PendingSignUp>> {
    let row = sqlx::query!(
        r#"SELECT email, password_hash, preferences, expires_at
           FROM verifications WHERE token = $1"#,
        token
    )
    .fetch_optional(db)
    .await?;

    Ok(row.map(|row| PendingSignUp {
        email: row.email,
        expires_at: row.expires_at,
        sign_up: SignUp {
            password_hash: row.password_hash,
            preferences: row.preferences,
        },
    }))
}

/// Removes every sign-up of `email` once one of them became the account.
/// `false` when the link of `token` was used up in the meantime.
pub async fn settle(conn: &mut PgConnection, email: &str, token: &str) -> AppResult<bool> {
    let used = sqlx::query_scalar!(
        r#"WITH settled AS (DELETE FROM verifications WHERE email = $1 RETURNING token)
           SELECT EXISTS (SELECT 1 FROM settled WHERE token = $2) AS "used!""#,
        email,
        token
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

fn new_token() -> String {
    hex::encode(rand::random::<[u8; 32]>())
}
