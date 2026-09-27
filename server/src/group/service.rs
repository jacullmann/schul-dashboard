use crate::{
    auth::session_context::{is_superadmin, remember_visited_group, resolve_landing_group},
    common::{
        extractors::TenantContext,
        group_type::GroupType,
        name_generator::generate_user_name,
        permission::GroupPermissions,
        role::{MemberRole, Role},
    },
    error::{AppError, AppResult},
    group::{
        dto::{GroupMemberDto, GroupStatusDto, GroupSummaryDto},
        member_policy::{self, Caller, Target},
    },
    state::AppState,
};
use serde_json::{Value, json};
use sqlx::{PgConnection, PgPool};
use uuid::Uuid;

/// Locks the group row for the rest of the transaction. Every change to a
/// group's membership takes this lock first, so an owner check in one request
/// cannot interleave with an ownership transfer in another.
pub(crate) async fn lock_group_owner(conn: &mut PgConnection, tenant_id: Uuid) -> AppResult<Uuid> {
    sqlx::query_scalar!(
        r#"SELECT owner_id FROM groups WHERE id = $1 FOR UPDATE"#,
        tenant_id
    )
    .fetch_optional(conn)
    .await?
    .ok_or_else(|| AppError::not_found("Group not found."))
}

/// An unknown id means the `roles` table and `Role` drifted apart, which must
/// surface as an error rather than quietly demote someone to a plain member.
pub(crate) fn role_from_db(id: i32) -> AppResult<Role> {
    Role::from_db_id(id.into()).ok_or_else(|| AppError::internal(format!("Unknown role id {id}")))
}

pub struct CreateGroupParams<'a> {
    pub user_id: Uuid,
    pub group_name: &'a str,
    pub avatar_url: Option<&'a str>,
    pub group_type: GroupType,
    pub dalton_enabled: bool,
    pub ip: Option<&'a str>,
    pub ua: Option<&'a str>,
}

struct Membership {
    id: Uuid,
    name: String,
    owner_id: Uuid,
    schedule_config: Value,
    avatar_url: Option<String>,
    permissions: Value,
    group_type: String,
    dalton_enabled: bool,
    role_name: String,
}

pub struct AcceptInviteParams<'a> {
    pub user_id: Uuid,
    pub token: &'a str,
    pub ip: Option<&'a str>,
    pub ua: Option<&'a str>,
}

pub struct GroupService {
    db: PgPool,
}

impl GroupService {
    pub fn from_state(s: &AppState) -> Self {
        Self { db: s.db.clone() }
    }

    pub async fn create_group(&self, params: CreateGroupParams<'_>) -> AppResult<Value> {
        let user_id = params.user_id;
        let group_name = params.group_name;
        let avatar_url = params.avatar_url;
        let group_type = params.group_type;
        let dalton_enabled = params.dalton_enabled;
        let ip = params.ip;
        let ua = params.ua;
        let ip_parsed: Option<ipnetwork::IpNetwork> = ip.and_then(|s| s.parse().ok());

        let mut tx = self.db.begin().await?;

        let group = sqlx::query!(
            r#"INSERT INTO groups (name, avatar_url, owner_id, group_type, dalton_enabled)
               VALUES ($1, $2, $3, $4, $5) RETURNING id, name"#,
            group_name,
            avatar_url,
            user_id,
            group_type.as_str(),
            dalton_enabled
        )
        .fetch_one(&mut *tx)
        .await?;

        let group_id = group.id;
        let group_name_str = group.name;

        sqlx::query!(
            r#"INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES ($1, $2, $3)"#,
            user_id,
            Role::Admin.db_id_i32(),
            group_id
        )
        .execute(&mut *tx)
        .await?;

        sqlx::query!(
            r#"INSERT INTO security_events (event_type, event_status, ip_address, user_agent, metadata)
             VALUES ('group_create', 'success', $1::inet, $2, $3)"#,
            ip_parsed, ua, json!({ "groupName": group_name_str, "groupId": group_id, "createdBy": user_id, "groupType": group_type.as_str(), "daltonEnabled": dalton_enabled })
        ).execute(&mut *tx).await?;

        tx.commit().await?;

        Ok(json!({ "ok": true, "groupId": group_id }))
    }

    pub async fn get_status(&self, user_id: Option<Uuid>) -> AppResult<GroupStatusDto> {
        let Some(user_id) = user_id else {
            return Ok(GroupStatusDto {
                authenticated: false,
                groups: Vec::new(),
                landing_group_id: None,
            });
        };

        // Independent reads, so they run concurrently.
        let (is_superadmin, landing_group_id, memberships) = tokio::try_join!(
            is_superadmin(&self.db, user_id),
            resolve_landing_group(&self.db, user_id),
            self.memberships(user_id),
        )?;

        let groups = memberships
            .into_iter()
            .map(|g| {
                let role = Role::from_str_or_user(&g.role_name);
                let has_owner_rights = is_superadmin || g.owner_id == user_id;
                let effective_permissions =
                    GroupPermissions::from_json_with_defaults(&g.permissions)
                        .effective_keys(role, has_owner_rights);

                GroupSummaryDto {
                    id: g.id,
                    name: g.name,
                    owner_id: g.owner_id,
                    role: role.as_str(),
                    schedule_config: g.schedule_config,
                    avatar_url: g.avatar_url,
                    permissions: g.permissions,
                    group_type: GroupType::from_str_or_regular(&g.group_type).as_str(),
                    dalton_enabled: g.dalton_enabled,
                    effective_permissions,
                }
            })
            .collect();

        Ok(GroupStatusDto {
            authenticated: true,
            groups,
            landing_group_id,
        })
    }

    async fn memberships(&self, user_id: Uuid) -> AppResult<Vec<Membership>> {
        Ok(sqlx::query_as!(
            Membership,
            r#"SELECT g.id, g.name, g.owner_id, g.schedule_config, g.avatar_url, g.permissions,
                      g.group_type, g.dalton_enabled, r.name AS role_name
               FROM user_roles ur
               JOIN groups g ON g.id = ur.tenant_id
               JOIN roles r ON r.id = ur.role_id
               WHERE ur.user_id = $1
               ORDER BY ur.assigned_at"#,
            user_id
        )
        .fetch_all(&self.db)
        .await?)
    }

    /// Also serves superadmins looking at a group they are not a member of,
    /// which therefore is missing from their status list.
    pub async fn get_group(&self, tc: &TenantContext) -> AppResult<GroupSummaryDto> {
        let g = sqlx::query!(
            r#"SELECT name, schedule_config, avatar_url, permissions, group_type, dalton_enabled
               FROM groups WHERE id = $1"#,
            tc.tenant_id
        )
        .fetch_optional(&self.db)
        .await?
        .ok_or_else(|| AppError::not_found("Group not found."))?;

        Ok(GroupSummaryDto {
            id: tc.tenant_id,
            name: g.name,
            owner_id: tc.group_owner_id,
            role: tc.tenant_role.as_str(),
            schedule_config: g.schedule_config,
            avatar_url: g.avatar_url,
            permissions: g.permissions,
            group_type: GroupType::from_str_or_regular(&g.group_type).as_str(),
            dalton_enabled: g.dalton_enabled,
            effective_permissions: tc.effective_permission_keys(),
        })
    }

    pub async fn record_visit(&self, user_id: Uuid, group_id: Uuid) -> AppResult<()> {
        remember_visited_group(&self.db, user_id, group_id).await
    }

    pub async fn leave_group(&self, user_id: Uuid, group_id: Uuid) -> AppResult<()> {
        let mut tx = self.db.begin().await?;
        let owner_id = lock_group_owner(&mut tx, group_id).await?;

        if owner_id == user_id {
            return Err(AppError::forbidden("The owner cannot leave the group."));
        }

        sqlx::query!(
            r#"DELETE FROM user_roles WHERE user_id = $1 AND tenant_id = $2"#,
            user_id,
            group_id
        )
        .execute(&mut *tx)
        .await?;

        sqlx::query!(
            r#"DELETE FROM user_courses
               WHERE user_id = $1
                 AND course_id IN (SELECT id FROM courses WHERE tenant_id = $2)"#,
            user_id,
            group_id
        )
        .execute(&mut *tx)
        .await?;

        sqlx::query!(
            r#"INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'group:leave', $2)"#,
            user_id,
            json!({ "groupId": group_id })
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(())
    }

    pub async fn create_invite(&self, tenant_id: Uuid, user_id: Uuid) -> AppResult<Value> {
        let token = hex::encode(rand::random::<[u8; 32]>());
        let expires_at = chrono::Utc::now() + chrono::Duration::days(7);

        sqlx::query!(
            "INSERT INTO group_invites (token, tenant_id, created_by, expires_at) VALUES ($1, $2, $3, $4)",
            token.clone(),
            tenant_id,
            user_id,
            expires_at
        )
            .execute(&self.db)
            .await?;

        Ok(json!({ "token": token }))
    }

    pub async fn list_members(
        &self,
        tenant_id: Uuid,
        caller: Caller,
    ) -> AppResult<Vec<GroupMemberDto>> {
        let owner_id =
            sqlx::query_scalar!(r#"SELECT owner_id FROM groups WHERE id = $1"#, tenant_id)
                .fetch_optional(&self.db)
                .await?
                .ok_or_else(|| AppError::not_found("Group not found."))?;

        let rows = sqlx::query!(
            r#"SELECT user_id, assigned_at, role_id FROM user_roles WHERE tenant_id = $1"#,
            tenant_id
        )
        .fetch_all(&self.db)
        .await?;

        let targets = rows
            .into_iter()
            .map(|r| {
                let role = role_from_db(r.role_id)?;
                Ok((r.user_id, r.assigned_at, role))
            })
            .collect::<AppResult<Vec<_>>>()?;

        let caller_role = targets
            .iter()
            .find(|(user_id, ..)| *user_id == caller.user_id)
            .map(|(.., role)| *role);
        let actor = caller.resolve(owner_id, caller_role);

        let mut members: Vec<GroupMemberDto> = targets
            .into_iter()
            .map(|(user_id, joined_at, role)| {
                let target = Target {
                    user_id,
                    role: MemberRole::resolve(role, user_id == owner_id),
                };
                GroupMemberDto {
                    generated_name: generate_user_name(&user_id.to_string()),
                    role: target.role,
                    user_id,
                    joined_at,
                    assignable_roles: member_policy::assignable_roles(actor, target),
                    can_remove: member_policy::ensure_can_remove(actor, target).is_ok(),
                }
            })
            .collect();

        members.sort_by(|a, b| {
            a.role
                .cmp(&b.role)
                .then_with(|| a.generated_name.cmp(&b.generated_name))
        });

        Ok(members)
    }

    pub async fn get_invite(&self, token: &str) -> AppResult<Value> {
        let invite = sqlx::query!(
            r#"SELECT g.name,
                      g.avatar_url,
                      (SELECT COUNT(*) FROM user_roles WHERE tenant_id = g.id) AS "member_count!"
               FROM group_invites gi
               JOIN groups g ON g.id = gi.tenant_id
               WHERE gi.token = $1 AND gi.expires_at > now() AND gi.used_at IS NULL AND gi.revoked_at IS NULL"#,
            token
        )
        .fetch_optional(&self.db)
        .await?;

        let invite = match invite {
            Some(r) => r,
            None => {
                return Err(AppError::BadRequest(
                    "Invalid or expired invite token.".into(),
                ));
            }
        };

        Ok(json!({
            "valid": true,
            "groupName": invite.name,
            "avatarUrl": invite.avatar_url,
            "memberCount": invite.member_count,
        }))
    }

    pub async fn accept_invite(&self, params: AcceptInviteParams<'_>) -> AppResult<Value> {
        let user_id = params.user_id;
        let token = params.token;
        let ip = params.ip;
        let ua = params.ua;

        let mut tx = self.db.begin().await?;

        let invite = sqlx::query!(
            "UPDATE group_invites SET used_at = now(), used_by = $2 WHERE token = $1 AND expires_at > now() AND used_at IS NULL AND revoked_at IS NULL RETURNING tenant_id",
            token,
            user_id
        )
        .fetch_optional(&mut *tx)
        .await?;

        let group_id: Uuid = match invite {
            Some(row) => row.tenant_id,
            None => {
                return Err(AppError::BadRequest(
                    "Invalid or expired invite token.".into(),
                ));
            }
        };

        let ban = sqlx::query!(
            "SELECT id FROM group_bans WHERE tenant_id = $1 AND user_id = $2",
            group_id,
            user_id
        )
        .fetch_optional(&mut *tx)
        .await?;

        if ban.is_some() {
            return Err(AppError::forbidden("You have been banned from this group."));
        }

        // Joining twice keeps the existing membership and its role.
        sqlx::query!(
            r#"INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES ($1, $2, $3)
               ON CONFLICT (user_id, tenant_id) WHERE tenant_id IS NOT NULL DO NOTHING"#,
            user_id,
            Role::User.db_id_i32(),
            group_id
        )
        .execute(&mut *tx)
        .await?;

        let ip_parsed: Option<ipnetwork::IpNetwork> = ip.and_then(|s| s.parse().ok());

        sqlx::query!(
            "INSERT INTO security_events (event_type, event_status, ip_address, user_agent, metadata) VALUES ('group_invite_accept', 'success', $1::inet, $2, $3)",
            ip_parsed,
            ua,
            json!({ "groupId": group_id, "userId": user_id, "token": token })
        )
            .execute(&mut *tx)
            .await?;

        sqlx::query!(
            "INSERT INTO user_activity (user_id, type, meta) VALUES ($1, 'group:join', $2)",
            user_id,
            json!({ "groupId": group_id, "by": "invite" })
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(json!({ "ok": true, "groupId": group_id }))
    }
}
