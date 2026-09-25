use crate::error::AppResult;
use sqlx::PgPool;
use uuid::Uuid;

pub struct SessionContext {
    pub global_role: String,
    pub active_group_id: Option<Uuid>,
}

/// The last active group only wins while the user is still a member of it, so a
/// group they left or only visited as superadmin falls back to their newest one.
pub async fn resolve_session_context(db: &PgPool, user_id: Uuid) -> AppResult<SessionContext> {
    let row = sqlx::query!(
        r#"
        SELECT
            (SELECT r.name FROM user_roles ur
             JOIN roles r ON r.id = ur.role_id
             WHERE ur.user_id = u.id AND ur.tenant_id IS NULL
             LIMIT 1) AS global_role,
            (SELECT ur.tenant_id FROM user_roles ur
             WHERE ur.user_id = u.id AND ur.tenant_id IS NOT NULL
             ORDER BY ur.tenant_id = u.last_active_group_id DESC NULLS LAST,
                      ur.assigned_at DESC
             LIMIT 1) AS active_group_id
        FROM users u
        WHERE u.id = $1
        "#,
        user_id
    )
    .fetch_optional(db)
    .await?;

    let (global_role, active_group_id) =
        row.map_or((None, None), |r| (r.global_role, r.active_group_id));

    Ok(SessionContext {
        global_role: global_role.unwrap_or_else(|| "user".into()),
        active_group_id,
    })
}

pub async fn remember_active_group(db: &PgPool, user_id: Uuid, group_id: Uuid) -> AppResult<()> {
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
