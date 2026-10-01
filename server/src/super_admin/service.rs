use super::dto::*;
use crate::{
    auth::{
        session_context::is_superadmin,
        token::{ADMIN_REVOKE, TokenService},
    },
    common::{
        cloudinary::Cloudinary,
        name_generator::generate_user_name,
        pagination::{PAGE_SIZE, Page, contains_pattern, search_term},
        role::{MemberRole, Role},
    },
    error::{AppError, AppResult},
    group::{
        member_policy::{self, Caller, Target},
        service::role_from_db,
    },
    items::assets,
    state::AppState,
};
use serde_json::{Value, json};
use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

const ITEM_RETENTION_DAYS: i32 = 90;
const ACTIVITY_RETENTION_DAYS: i32 = 30;
const STATS_WINDOW_DAYS: i32 = 7;
const DAILY_ACTIVITY_DAYS: i32 = 30;
const ACTIVITY_LOG_LIMIT: i64 = 200;

/// Admin actions are recorded against the acting admin, so the entry survives
/// the deletion of whatever it targets.
async fn log_admin_action(
    conn: &mut PgConnection,
    admin_id: Uuid,
    action: &str,
    meta: Value,
) -> AppResult<()> {
    sqlx::query!(
        r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, $2, $3)"#,
        admin_id,
        action,
        meta
    )
    .execute(conn)
    .await?;

    Ok(())
}

/// Splits a search into the text pattern and, when it is one, the exact id.
fn search_params(raw: Option<&str>) -> (Option<String>, Option<Uuid>) {
    let term = search_term(raw);
    (
        term.map(contains_pattern),
        term.and_then(|t| Uuid::parse_str(t).ok()),
    )
}

pub struct SuperAdminService {
    db: PgPool,
    tokens: TokenService,
    cloudinary: Cloudinary,
}

impl SuperAdminService {
    pub fn from_state(s: &AppState) -> Self {
        Self {
            db: s.db.clone(),
            tokens: TokenService::from_state(s),
            cloudinary: s.cloudinary.clone(),
        }
    }

    /// One round trip that scans each large table once.
    pub async fn get_stats(&self) -> AppResult<StatsDto> {
        let row = sqlx::query!(
            r#"SELECT u.total AS "user_count!", u.verified AS "verified_users!",
                      u.new_recently AS "new_users!", u.active_recently AS "active_users!",
                      i.total AS "item_count!", i.new_recently AS "new_items!", i.expired AS "old_items!",
                      (SELECT COUNT(*) FROM user_roles
                       WHERE tenant_id IS NULL AND role_id = $1) AS "admin_count!",
                      (SELECT COUNT(*) FROM banned_users) AS "banned_count!",
                      (SELECT COUNT(*) FROM reports) AS "report_count!",
                      (SELECT COUNT(*) FROM user_activity
                       WHERE created_at < now() - make_interval(days => $4)) AS "old_activity!"
               FROM (SELECT COUNT(*) AS total,
                            COUNT(*) FILTER (WHERE email_verified) AS verified,
                            COUNT(*) FILTER (WHERE created_at >= now() - make_interval(days => $2)) AS new_recently,
                            COUNT(*) FILTER (WHERE last_login_at >= now() - make_interval(days => $2)) AS active_recently
                     FROM users) u,
                    (SELECT COUNT(*) AS total,
                            COUNT(*) FILTER (WHERE created_at >= now() - make_interval(days => $2)) AS new_recently,
                            COUNT(*) FILTER (WHERE created_at < now() - make_interval(days => $3)) AS expired
                     FROM items) i"#,
            Role::Superadmin.db_id_i32(),
            STATS_WINDOW_DAYS,
            ITEM_RETENTION_DAYS,
            ACTIVITY_RETENTION_DAYS,
        )
        .fetch_one(&self.db)
        .await?;

        Ok(StatsDto {
            user_count: row.user_count,
            verified_users: row.verified_users,
            unverified_users: row.user_count - row.verified_users,
            admin_count: row.admin_count,
            banned_count: row.banned_count,
            new_users_this_week: row.new_users,
            active_users_this_week: row.active_users,
            item_count: row.item_count,
            new_items_this_week: row.new_items,
            old_items_count: row.old_items,
            old_activity_count: row.old_activity,
            report_count: row.report_count,
        })
    }

    /// Growth, usage and failed logins per day, oldest first, with empty days included.
    /// A failed login is an attempt against an account, not activity of its owner.
    pub async fn get_daily_activity(&self) -> AppResult<Vec<DailyActivityDto>> {
        let rows = sqlx::query!(
            r#"SELECT d.day AS "day!",
                      COALESCE(u.n, 0) AS "new_users!",
                      COALESCE(g.n, 0) AS "new_groups!",
                      COALESCE(i.n, 0) AS "new_items!",
                      COALESCE(a.app_opens, 0) AS "app_opens!",
                      COALESCE(a.active_users, 0) AS "active_users!",
                      COALESCE(a.failed_logins, 0) AS "failed_logins!"
               FROM (SELECT current_date - offset_days AS day
                     FROM generate_series($1 - 1, 0, -1) AS offset_days) d
               LEFT JOIN (SELECT created_at::date AS day, COUNT(*) AS n FROM users
                          WHERE created_at >= current_date - ($1 - 1)
                          GROUP BY 1) u USING (day)
               LEFT JOIN (SELECT created_at::date AS day, COUNT(*) AS n FROM groups
                          WHERE created_at >= current_date - ($1 - 1)
                          GROUP BY 1) g USING (day)
               LEFT JOIN (SELECT created_at::date AS day, COUNT(*) AS n FROM items
                          WHERE created_at >= current_date - ($1 - 1)
                          GROUP BY 1) i USING (day)
               LEFT JOIN (SELECT created_at::date AS day,
                                 COUNT(*) FILTER (WHERE type = 'page:load') AS app_opens,
                                 COUNT(DISTINCT user_id) FILTER (WHERE type <> 'auth:login_failed') AS active_users,
                                 COUNT(*) FILTER (WHERE type = 'auth:login_failed') AS failed_logins
                          FROM user_activity
                          WHERE created_at >= current_date - ($1 - 1)
                          GROUP BY 1) a USING (day)
               ORDER BY d.day"#,
            DAILY_ACTIVITY_DAYS,
        )
        .fetch_all(&self.db)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| DailyActivityDto {
                day: r.day,
                new_users: r.new_users,
                new_groups: r.new_groups,
                new_items: r.new_items,
                app_opens: r.app_opens,
                active_users: r.active_users,
                failed_logins: r.failed_logins,
            })
            .collect())
    }

    /// Platform-wide counterpart of the per-group cleanup in group admin.
    pub async fn cleanup_old_items(&self, admin_id: Uuid) -> AppResult<Value> {
        let mut tx = self.db.begin().await?;

        let images = sqlx::query_scalar!(
            r#"DELETE FROM items WHERE created_at < now() - make_interval(days => $1)
               RETURNING images"#,
            ITEM_RETENTION_DAYS
        )
        .fetch_all(&mut *tx)
        .await?;
        let deleted = images.len();

        log_admin_action(
            &mut tx,
            admin_id,
            "admin:cleanup:old_items",
            json!({ "deletedCount": deleted }),
        )
        .await?;

        tx.commit().await?;

        assets::delete_detached(
            self.db.clone(),
            self.cloudinary.clone(),
            images.iter().flatten(),
        );

        Ok(json!({ "ok": true, "deletedCount": deleted }))
    }

    /// The admin's own entry is written after the purge so it is never swept up.
    pub async fn cleanup_old_activity(&self, admin_id: Uuid) -> AppResult<Value> {
        let mut tx = self.db.begin().await?;

        let deleted = sqlx::query!(
            r#"DELETE FROM user_activity WHERE created_at < now() - make_interval(days => $1)"#,
            ACTIVITY_RETENTION_DAYS
        )
        .execute(&mut *tx)
        .await?
        .rows_affected();

        log_admin_action(
            &mut tx,
            admin_id,
            "admin:cleanup:old_activity",
            json!({ "deletedCount": deleted }),
        )
        .await?;

        tx.commit().await?;

        Ok(json!({ "ok": true, "deletedCount": deleted }))
    }

    pub async fn list_groups(&self, query: &GroupsQuery) -> AppResult<Page<AdminGroupDto>> {
        let (pattern, search_id) = search_params(query.search.as_deref());
        let group_type = match query.r#type {
            GroupTypeFilter::All => None,
            filter => Some(filter.as_str()),
        };

        let rows_query = sqlx::query!(
            r#"SELECT g.id, g.name, g.group_type, g.owner_id, g.created_at,
                      u.email AS owner_email,
                      members.n AS "member_count!", items.n AS "item_count!"
               FROM groups g
               JOIN users u ON u.id = g.owner_id
               CROSS JOIN LATERAL (SELECT COUNT(*) AS n FROM user_roles WHERE tenant_id = g.id) members
               CROSS JOIN LATERAL (SELECT COUNT(*) AS n FROM items WHERE tenant_id = g.id) items
               WHERE ($1::text IS NULL OR g.name ILIKE $1 OR u.email ILIKE $1 OR g.id = $2)
                 AND ($3::text IS NULL OR g.group_type = $3)
               ORDER BY
                 CASE WHEN $4 = 'name' AND $5 = 'asc' THEN g.name END ASC,
                 CASE WHEN $4 = 'name' AND $5 = 'desc' THEN g.name END DESC,
                 CASE WHEN $4 = 'memberCount' AND $5 = 'asc' THEN members.n END ASC,
                 CASE WHEN $4 = 'memberCount' AND $5 = 'desc' THEN members.n END DESC,
                 CASE WHEN $4 = 'itemCount' AND $5 = 'asc' THEN items.n END ASC,
                 CASE WHEN $4 = 'itemCount' AND $5 = 'desc' THEN items.n END DESC,
                 CASE WHEN $5 = 'asc' THEN g.created_at END ASC,
                 g.created_at DESC,
                 g.id
               LIMIT $6 OFFSET $7"#,
            pattern.as_deref(),
            search_id,
            group_type,
            query.sort.as_str(),
            query.order.as_str(),
            PAGE_SIZE,
            query.page.offset(),
        )
        .fetch_all(&self.db);

        let count_query = sqlx::query_scalar!(
            r#"SELECT COUNT(*) AS "count!"
               FROM groups g
               JOIN users u ON u.id = g.owner_id
               WHERE ($1::text IS NULL OR g.name ILIKE $1 OR u.email ILIKE $1 OR g.id = $2)
                 AND ($3::text IS NULL OR g.group_type = $3)"#,
            pattern.as_deref(),
            search_id,
            group_type,
        )
        .fetch_one(&self.db);

        let (rows, total) = tokio::try_join!(rows_query, count_query)?;

        let groups = rows
            .into_iter()
            .map(|g| AdminGroupDto {
                owner_name: generate_user_name(&g.owner_id.to_string()),
                id: g.id,
                name: g.name,
                group_type: g.group_type,
                owner_id: g.owner_id,
                owner_email: g.owner_email,
                created_at: g.created_at,
                member_count: g.member_count,
                item_count: g.item_count,
            })
            .collect();

        Ok(Page::new(groups, total, query.page))
    }

    pub async fn delete_group(&self, group_id: Uuid, admin_id: Uuid) -> AppResult<Value> {
        let mut tx = self.db.begin().await?;

        let images = sqlx::query_scalar!(
            r#"DELETE FROM items WHERE tenant_id = $1 RETURNING images"#,
            group_id
        )
        .fetch_all(&mut *tx)
        .await?;

        let name = sqlx::query_scalar!(
            r#"DELETE FROM groups WHERE id = $1 RETURNING name"#,
            group_id
        )
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| AppError::not_found("Group not found."))?;

        log_admin_action(
            &mut tx,
            admin_id,
            "admin:delete:group",
            json!({ "groupId": group_id, "groupName": name }),
        )
        .await?;

        tx.commit().await?;

        assets::delete_detached(
            self.db.clone(),
            self.cloudinary.clone(),
            images.iter().flatten(),
        );

        Ok(json!({ "ok": true, "deletedGroupId": group_id }))
    }

    pub async fn list_users(&self, query: &UsersQuery) -> AppResult<Page<AdminUserDto>> {
        let (pattern, search_id) = search_params(query.search.as_deref());
        let superadmin_role = Role::Superadmin.db_id_i32();

        let rows_query = sqlx::query!(
            r#"SELECT u.id, u.email, u.email_verified, u.created_at, u.last_login_at,
                      EXISTS (SELECT 1 FROM user_roles ur
                              WHERE ur.user_id = u.id AND ur.tenant_id IS NULL
                                AND ur.role_id = $4) AS "is_superadmin!",
                      EXISTS (SELECT 1 FROM banned_users b WHERE b.user_id = u.id) AS "is_banned!"
               FROM users u
               WHERE ($1::text IS NULL OR u.email ILIKE $1 OR u.id = $2)
                 AND CASE $3
                       WHEN 'active' THEN NOT EXISTS (SELECT 1 FROM banned_users b WHERE b.user_id = u.id)
                       WHEN 'banned' THEN EXISTS (SELECT 1 FROM banned_users b WHERE b.user_id = u.id)
                       WHEN 'unverified' THEN NOT u.email_verified
                       WHEN 'superadmin' THEN EXISTS (SELECT 1 FROM user_roles ur
                                                      WHERE ur.user_id = u.id AND ur.tenant_id IS NULL
                                                        AND ur.role_id = $4)
                       ELSE true
                     END
               ORDER BY
                 CASE WHEN $5 = 'email' AND $6 = 'asc' THEN u.email END ASC,
                 CASE WHEN $5 = 'email' AND $6 = 'desc' THEN u.email END DESC,
                 CASE WHEN $5 = 'lastLoginAt' AND $6 = 'asc' THEN u.last_login_at END ASC NULLS FIRST,
                 CASE WHEN $5 = 'lastLoginAt' AND $6 = 'desc' THEN u.last_login_at END DESC NULLS LAST,
                 CASE WHEN $6 = 'asc' THEN u.created_at END ASC,
                 u.created_at DESC,
                 u.id
               LIMIT $7 OFFSET $8"#,
            pattern.as_deref(),
            search_id,
            query.status.as_str(),
            superadmin_role,
            query.sort.as_str(),
            query.order.as_str(),
            PAGE_SIZE,
            query.page.offset(),
        )
        .fetch_all(&self.db);

        let count_query = sqlx::query_scalar!(
            r#"SELECT COUNT(*) AS "count!"
               FROM users u
               WHERE ($1::text IS NULL OR u.email ILIKE $1 OR u.id = $2)
                 AND CASE $3
                       WHEN 'active' THEN NOT EXISTS (SELECT 1 FROM banned_users b WHERE b.user_id = u.id)
                       WHEN 'banned' THEN EXISTS (SELECT 1 FROM banned_users b WHERE b.user_id = u.id)
                       WHEN 'unverified' THEN NOT u.email_verified
                       WHEN 'superadmin' THEN EXISTS (SELECT 1 FROM user_roles ur
                                                      WHERE ur.user_id = u.id AND ur.tenant_id IS NULL
                                                        AND ur.role_id = $4)
                       ELSE true
                     END"#,
            pattern.as_deref(),
            search_id,
            query.status.as_str(),
            superadmin_role,
        )
        .fetch_one(&self.db);

        let (rows, total) = tokio::try_join!(rows_query, count_query)?;

        let users = rows
            .into_iter()
            .map(|u| AdminUserDto {
                username: generate_user_name(&u.id.to_string()),
                id: u.id,
                email: u.email,
                email_verified: u.email_verified,
                is_superadmin: u.is_superadmin,
                is_banned: u.is_banned,
                created_at: u.created_at,
                last_login_at: u.last_login_at,
            })
            .collect();

        Ok(Page::new(users, total, query.page))
    }

    pub async fn get_user_activity(&self, user_id: Uuid) -> AppResult<Value> {
        let rows = sqlx::query!(
            r#"SELECT type, meta, created_at FROM user_activity
               WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2"#,
            user_id,
            ACTIVITY_LOG_LIMIT
        )
        .fetch_all(&self.db)
        .await?;

        Ok(json!(
            rows.into_iter()
                .map(|r| json!({ "at": r.created_at, "type": r.r#type, "meta": r.meta }))
                .collect::<Vec<_>>()
        ))
    }

    /// The roles offered per group come from the same policy the group admin
    /// UI uses, evaluated with the owner rights every superadmin holds.
    pub async fn get_user_memberships(
        &self,
        user_id: Uuid,
        admin_id: Uuid,
    ) -> AppResult<Vec<UserMembershipDto>> {
        let rows = sqlx::query!(
            r#"SELECT g.id, g.name, g.owner_id, ur.role_id, ur.assigned_at
               FROM user_roles ur
               JOIN groups g ON g.id = ur.tenant_id
               WHERE ur.user_id = $1
               ORDER BY g.name, g.id"#,
            user_id
        )
        .fetch_all(&self.db)
        .await?;

        let caller = superadmin_caller(admin_id);

        rows.into_iter()
            .map(|r| {
                let target = Target {
                    user_id,
                    role: MemberRole::resolve(role_from_db(r.role_id)?, r.owner_id == user_id),
                };
                Ok(UserMembershipDto {
                    group_id: r.id,
                    group_name: r.name,
                    role: target.role,
                    joined_at: r.assigned_at,
                    assignable_roles: member_policy::assignable_roles(
                        caller.resolve(r.owner_id, None),
                        target,
                    ),
                })
            })
            .collect()
    }

    pub async fn ban_user(&self, target_id: Uuid, admin_id: Uuid) -> AppResult<Value> {
        if is_superadmin(&self.db, target_id).await? {
            return Err(AppError::bad_request("Admins cannot be banned."));
        }

        let mut tx = self.db.begin().await?;

        sqlx::query!(
            r#"INSERT INTO banned_users (user_id) VALUES ($1) ON CONFLICT DO NOTHING"#,
            target_id
        )
        .execute(&mut *tx)
        .await?;

        log_admin_action(
            &mut tx,
            admin_id,
            "admin:ban:user",
            json!({ "targetUserId": target_id }),
        )
        .await?;

        tx.commit().await?;

        self.tokens
            .revoke_all_for_user(target_id, ADMIN_REVOKE, None)
            .await?;

        Ok(json!({ "ok": true, "isBanned": true }))
    }

    pub async fn unban_user(&self, target_id: Uuid, admin_id: Uuid) -> AppResult<Value> {
        let mut tx = self.db.begin().await?;

        sqlx::query!(r#"DELETE FROM banned_users WHERE user_id = $1"#, target_id)
            .execute(&mut *tx)
            .await?;

        log_admin_action(
            &mut tx,
            admin_id,
            "admin:unban:user",
            json!({ "targetUserId": target_id }),
        )
        .await?;

        tx.commit().await?;

        Ok(json!({ "ok": true, "isBanned": false }))
    }

    pub async fn delete_user(&self, target_id: Uuid, admin_id: Uuid) -> AppResult<Value> {
        if is_superadmin(&self.db, target_id).await? {
            return Err(AppError::forbidden("Admins cannot be deleted."));
        }

        let mut tx = self.db.begin().await?;

        let owns_group = sqlx::query_scalar!(
            r#"SELECT EXISTS (SELECT 1 FROM groups WHERE owner_id = $1) AS "exists!""#,
            target_id
        )
        .fetch_one(&mut *tx)
        .await?;

        if owns_group {
            return Err(AppError::bad_request(
                "User owns groups and cannot be deleted.",
            ));
        }

        let email = sqlx::query_scalar!(
            r#"DELETE FROM users WHERE id = $1 RETURNING email"#,
            target_id
        )
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| AppError::not_found("User not found."))?;

        log_admin_action(
            &mut tx,
            admin_id,
            "admin:delete:user",
            json!({ "targetUserId": target_id, "email": email }),
        )
        .await?;

        tx.commit().await?;

        Ok(json!({ "ok": true }))
    }

    pub async fn update_user_role(
        &self,
        target_id: Uuid,
        role: GlobalRole,
        admin_id: Uuid,
    ) -> AppResult<Value> {
        if target_id == admin_id {
            return Err(AppError::bad_request(
                "You cannot modify your own global role.",
            ));
        }

        let mut tx = self.db.begin().await?;

        match role {
            GlobalRole::Superadmin => {
                sqlx::query!(
                    r#"INSERT INTO user_roles (user_id, role_id, tenant_id)
                       VALUES ($1, $2, NULL)
                       ON CONFLICT (user_id, role_id) WHERE tenant_id IS NULL DO NOTHING"#,
                    target_id,
                    Role::Superadmin.db_id_i32(),
                )
                .execute(&mut *tx)
                .await?;
            }
            GlobalRole::User => {
                sqlx::query!(
                    r#"DELETE FROM user_roles
                       WHERE user_id = $1 AND role_id = $2 AND tenant_id IS NULL"#,
                    target_id,
                    Role::Superadmin.db_id_i32(),
                )
                .execute(&mut *tx)
                .await?;
            }
        }

        log_admin_action(
            &mut tx,
            admin_id,
            "admin:role_change",
            json!({ "targetUserId": target_id, "newRole": role.as_str() }),
        )
        .await?;

        tx.commit().await?;

        Ok(json!({ "ok": true }))
    }
}

/// Superadmins act with owner rights in every group, whether or not they are
/// a member, so the group's own moderation threshold never applies to them.
pub fn superadmin_caller(admin_id: Uuid) -> Caller {
    Caller {
        user_id: admin_id,
        is_superadmin: true,
        moderate_members_role: Role::User,
    }
}
