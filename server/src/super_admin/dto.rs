use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::common::{
    pagination::{PageNumber, SortOrder},
    role::MemberRole,
};

/// The only roles that exist outside of a group.
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GlobalRole {
    Superadmin,
    User,
}

impl GlobalRole {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Superadmin => "superadmin",
            Self::User => "user",
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserRoleDto {
    pub role: GlobalRole,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangeMembershipRoleDto {
    pub role: MemberRole,
}

#[derive(Debug, Clone, Copy, Default, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UserStatusFilter {
    #[default]
    All,
    Active,
    Banned,
    Unverified,
    Superadmin,
}

impl UserStatusFilter {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::All => "all",
            Self::Active => "active",
            Self::Banned => "banned",
            Self::Unverified => "unverified",
            Self::Superadmin => "superadmin",
        }
    }
}

#[derive(Debug, Clone, Copy, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum UserSort {
    #[default]
    CreatedAt,
    LastLoginAt,
    Email,
}

impl UserSort {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::CreatedAt => "createdAt",
            Self::LastLoginAt => "lastLoginAt",
            Self::Email => "email",
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsersQuery {
    #[serde(default)]
    pub page: PageNumber,
    pub search: Option<String>,
    #[serde(default)]
    pub status: UserStatusFilter,
    #[serde(default)]
    pub sort: UserSort,
    #[serde(default)]
    pub order: SortOrder,
}

#[derive(Debug, Clone, Copy, Default, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GroupTypeFilter {
    #[default]
    All,
    Regular,
    Abitur,
}

impl GroupTypeFilter {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::All => "all",
            Self::Regular => "regular",
            Self::Abitur => "abitur",
        }
    }
}

#[derive(Debug, Clone, Copy, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum GroupSort {
    #[default]
    CreatedAt,
    Name,
    MemberCount,
    ItemCount,
}

impl GroupSort {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::CreatedAt => "createdAt",
            Self::Name => "name",
            Self::MemberCount => "memberCount",
            Self::ItemCount => "itemCount",
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupsQuery {
    #[serde(default)]
    pub page: PageNumber,
    pub search: Option<String>,
    #[serde(default)]
    pub r#type: GroupTypeFilter,
    #[serde(default)]
    pub sort: GroupSort,
    #[serde(default)]
    pub order: SortOrder,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsDto {
    pub user_count: i64,
    pub verified_users: i64,
    pub unverified_users: i64,
    pub admin_count: i64,
    pub banned_count: i64,
    pub new_users_this_week: i64,
    pub active_users_this_week: i64,
    pub item_count: i64,
    pub new_items_this_week: i64,
    pub report_count: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyActivityDto {
    pub day: NaiveDate,
    pub new_users: i64,
    pub new_groups: i64,
    pub new_items: i64,
    pub app_opens: i64,
    pub active_users: i64,
    pub failed_logins: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminUserDto {
    pub id: Uuid,
    pub email: String,
    pub username: String,
    pub email_verified: bool,
    pub is_superadmin: bool,
    pub is_banned: bool,
    pub created_at: DateTime<Utc>,
    pub last_login_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminGroupDto {
    pub id: Uuid,
    pub name: String,
    pub group_type: String,
    pub owner_id: Uuid,
    pub owner_email: String,
    pub owner_name: String,
    pub created_at: DateTime<Utc>,
    pub member_count: i64,
    pub item_count: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserMembershipDto {
    pub group_id: Uuid,
    pub group_name: String,
    pub role: MemberRole,
    pub joined_at: DateTime<Utc>,
    pub assignable_roles: Vec<MemberRole>,
}

/// A pg_cron cleanup (or the asset worker), named as scheduled, with the rows
/// it should already have removed. Anything above zero means it is not running.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupJobDto {
    pub job: String,
    pub overdue_count: i64,
}
