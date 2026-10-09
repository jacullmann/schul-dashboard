use crate::{
    common::role::Role,
    error::{AppError, AppResult},
};
use sqlx::PgPool;
use uuid::Uuid;

/// Superadmin is the only platform-wide role; everyone else is a plain user
/// whose rights come from their group memberships.
pub async fn is_superadmin(db: &PgPool, user_id: Uuid) -> AppResult<bool> {
    let is_superadmin = sqlx::query_scalar!(
        r#"SELECT EXISTS (
               SELECT 1 FROM user_roles
               WHERE user_id = $1 AND tenant_id IS NULL AND role_id = $2
           ) AS "is_superadmin!""#,
        user_id,
        Role::Superadmin.db_id_i32()
    )
    .fetch_one(db)
    .await?;

    Ok(is_superadmin)
}

/// A banned or deleted account keeps a signed access token until it expires,
/// so every authenticated request confirms the account is still in good
/// standing.
pub async fn account_is_active(db: &PgPool, user_id: Uuid) -> AppResult<bool> {
    let is_active = sqlx::query_scalar!(
        r#"SELECT EXISTS (
               SELECT 1 FROM users u
               WHERE u.id = $1
                 AND NOT EXISTS (SELECT 1 FROM banned_users b WHERE b.user_id = u.id)
           ) AS "is_active!""#,
        user_id
    )
    .fetch_one(db)
    .await?;

    Ok(is_active)
}

/// Where the session an access token was issued for stands.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SessionStatus {
    Active,
    /// Signed out, revoked, or the account was banned or deleted.
    Ended,
    /// The session is fine but shutdown turns everyone except superadmins
    /// away. It is kept, so it resumes once shutdown ends.
    Shutdown,
}

impl SessionStatus {
    /// An ended session wins over shutdown: a banned user is signed out
    /// rather than told to come back later.
    pub const fn of(session_active: bool, shutdown_applies: bool) -> Self {
        match (session_active, shutdown_applies) {
            (false, _) => Self::Ended,
            (true, true) => Self::Shutdown,
            (true, false) => Self::Active,
        }
    }

    pub const fn ensure_active(self) -> AppResult<()> {
        match self {
            Self::Active => Ok(()),
            Self::Ended => Err(AppError::TokenExpired),
            Self::Shutdown => Err(AppError::Shutdown),
        }
    }
}

/// Whether the account is in good standing, the session an access token was
/// issued for has not ended, and shutdown admits the user. Checking the
/// session makes signing out, ending a session or changing the password take
/// effect on the very next request instead of when the short-lived access
/// token expires. Shutdown is read in the same round trip, so it costs
/// every request nothing but a primary key lookup.
pub async fn session_status(
    db: &PgPool,
    user_id: Uuid,
    session_id: Uuid,
) -> AppResult<SessionStatus> {
    let row = sqlx::query!(
        r#"SELECT EXISTS (
                      SELECT 1 FROM users u
                      WHERE u.id = $1
                        AND NOT EXISTS (SELECT 1 FROM banned_users b WHERE b.user_id = u.id)
                        AND EXISTS (
                            SELECT 1 FROM refresh_tokens t
                            WHERE t.family_id = $2 AND t.user_id = u.id AND t.revoked_at IS NULL
                        )
                  ) AS "session_active!",
                  ac.shutdown AND NOT EXISTS (
                      SELECT 1 FROM user_roles
                      WHERE user_id = $1 AND tenant_id IS NULL AND role_id = $3
                  ) AS "shutdown_applies!"
           FROM access_controls ac"#,
        user_id,
        session_id,
        Role::Superadmin.db_id_i32()
    )
    .fetch_one(db)
    .await?;

    Ok(SessionStatus::of(row.session_active, row.shutdown_applies))
}

/// Where the app opens after sign-in. The last visited group only wins while
/// the user is still a member of it, so a group they left or only visited as
/// superadmin falls back to their newest one.
pub async fn resolve_landing_group(db: &PgPool, user_id: Uuid) -> AppResult<Option<Uuid>> {
    let group_id = sqlx::query_scalar!(
        r#"SELECT ur.tenant_id AS "tenant_id!"
           FROM user_roles ur
           JOIN users u ON u.id = ur.user_id
           WHERE ur.user_id = $1 AND ur.tenant_id IS NOT NULL
           ORDER BY ur.tenant_id = u.last_active_group_id DESC NULLS LAST,
                    ur.assigned_at DESC
           LIMIT 1"#,
        user_id
    )
    .fetch_optional(db)
    .await?;

    Ok(group_id)
}

/// Only a hint for the next sign-in: requests never read it to pick a group.
pub async fn remember_visited_group(db: &PgPool, user_id: Uuid, group_id: Uuid) -> AppResult<()> {
    sqlx::query!(
        r#"UPDATE users SET last_active_group_id = $2
           WHERE id = $1 AND last_active_group_id IS DISTINCT FROM $2"#,
        user_id,
        group_id
    )
    .execute(db)
    .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ended_session_wins_over_shutdown() {
        assert_eq!(SessionStatus::of(false, true), SessionStatus::Ended);
        assert_eq!(SessionStatus::of(false, false), SessionStatus::Ended);
    }

    #[test]
    fn shutdown_turns_away_an_active_session() {
        assert_eq!(SessionStatus::of(true, true), SessionStatus::Shutdown);
        assert_eq!(SessionStatus::of(true, false), SessionStatus::Active);
    }

    #[test]
    fn statuses_map_to_their_errors() {
        assert!(SessionStatus::Active.ensure_active().is_ok());
        assert!(matches!(
            SessionStatus::Ended.ensure_active(),
            Err(AppError::TokenExpired)
        ));
        assert!(matches!(
            SessionStatus::Shutdown.ensure_active(),
            Err(AppError::Shutdown)
        ));
    }
}
