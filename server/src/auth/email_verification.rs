//! Links that confirm the email address of a new account.
//!
//! An unconfirmed account lives for [`EMAIL_VERIFY_TTL`] after it signed up
//! (`cleanup_unverified_users()`, migration 0040), and every link expires with
//! it: a link resent later must not outlive the account it confirms.

use super::email_code::Issuance;
use crate::{
    common::send_limit::{MAIL_LIMITS, longest_window, retry_after},
    config::{EMAIL_VERIFY_TTL, chrono_ttl},
    error::AppResult,
};
use chrono::{DateTime, Utc};
use sqlx::PgConnection;

/// Stores a new link for the account `email` signed up at `signed_up_at`,
/// unless the address received as many mails as it may for now. The caller
/// holds [`lock_address`](super::email_code::lock_address) for `email`.
pub async fn issue(
    conn: &mut PgConnection,
    email: &str,
    signed_up_at: DateTime<Utc>,
) -> AppResult<Issuance> {
    let now = Utc::now();

    let sent_newest_first = sqlx::query_scalar!(
        r#"SELECT created_at FROM verifications
           WHERE email = $1 AND created_at > $2
           ORDER BY created_at DESC"#,
        email,
        now - longest_window(&MAIL_LIMITS)
    )
    .fetch_all(&mut *conn)
    .await?;

    if let Some(retry_after) = retry_after(&MAIL_LIMITS, &sent_newest_first, now) {
        return Ok(Issuance::Throttled { retry_after });
    }

    let token = hex::encode(rand::random::<[u8; 32]>());

    sqlx::query!(
        r#"INSERT INTO verifications (email, token, expires_at, created_at)
           VALUES ($1, $2, $3, $4)"#,
        email,
        token,
        link_expiry(signed_up_at),
        now
    )
    .execute(&mut *conn)
    .await?;

    Ok(Issuance::Issued(token))
}

pub fn link_expiry(signed_up_at: DateTime<Utc>) -> DateTime<Utc> {
    signed_up_at + chrono_ttl(EMAIL_VERIFY_TTL)
}
