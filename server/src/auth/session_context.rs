use crate::error::AppResult;
use sqlx::PgPool;
use uuid::Uuid;

pub async fn load_global_role(db: &PgPool, user_id: Uuid) -> AppResult<String> {
    let role = sqlx::query_scalar!(
        r#"SELECT r.name FROM user_roles ur
           JOIN roles r ON r.id = ur.role_id
           WHERE ur.user_id = $1 AND ur.tenant_id IS NULL
           LIMIT 1"#,
        user_id
    )
    .fetch_optional(db)
    .await?;

    Ok(role.unwrap_or_else(|| "user".into()))
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
