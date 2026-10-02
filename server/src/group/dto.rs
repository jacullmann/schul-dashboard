use std::collections::BTreeMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::common::{
    patch,
    permission::{GroupPermissions, Permission},
    role::{MemberRole, Role},
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateGroupDto {
    pub group_name: String,
    /// An upload from `/uploads/group-avatar`.
    pub avatar_id: Option<Uuid>,
    pub group_type: Option<String>,
    #[serde(default)]
    pub dalton_enabled: bool,
}

/// A group as the client sees it, including what the caller may do in it, so
/// the UI never has to re-derive permissions from the raw matrix.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupSummaryDto {
    pub id: Uuid,
    pub name: String,
    pub owner_id: Uuid,
    pub role: &'static str,
    pub schedule_config: serde_json::Value,
    pub avatar_url: Option<String>,
    /// Resolved against the defaults, so clients never need to know them.
    pub permissions: GroupPermissions,
    pub group_type: &'static str,
    pub dalton_enabled: bool,
    pub effective_permissions: Vec<&'static str>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupStatusDto {
    pub authenticated: bool,
    pub groups: Vec<GroupSummaryDto>,
    /// Where the app opens after sign-in; never used to scope a request.
    pub landing_group_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupMemberDto {
    pub user_id: Uuid,
    pub generated_name: String,
    pub role: MemberRole,
    pub joined_at: DateTime<Utc>,
    /// What the requesting user may change this member's role to.
    pub assignable_roles: Vec<MemberRole>,
    /// Whether the requesting user may remove this member.
    pub can_remove: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferOwnershipDto {
    pub target_user_id: Uuid,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangeMemberRoleDto {
    pub role: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameGroupDto {
    pub name: Option<String>,
    /// An upload from `/uploads/group-avatar`; `null` removes the picture.
    #[serde(default, deserialize_with = "patch::nullable")]
    pub avatar_id: Option<Option<Uuid>>,
    pub group_type: Option<String>,
    pub dalton_enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplaceScheduleDto {
    pub lessons: Vec<ScheduleLessonDto>,
    pub schedule_config: ScheduleConfigDto,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleLessonDto {
    pub id: Option<Uuid>,
    pub day: i32,
    pub slot: i32,
    pub duration: i32,
    pub room: Option<String>,
    pub subject_id: Option<Uuid>,
    pub course_id: Option<Uuid>,
    #[serde(default)]
    pub is_dalton: bool,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleConfigDto {
    pub start_time: String,
    pub total_slots: i32,
    pub lesson_duration_mins: i32,
    #[serde(default)]
    pub breaks: BTreeMap<i32, i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateScheduleSubDto {
    pub lesson_id: Uuid,
    pub course_id: Option<Uuid>,
    pub day: Option<i32>,
    pub slot: Option<i32>,
    pub duration: Option<i32>,
    pub subject: Option<String>,
    pub room: Option<String>,
    pub cancelled: Option<bool>,
    pub hide: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSubjectDto {
    pub name: String,
    pub category: Option<String>,
    #[serde(default)]
    pub is_dalton: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSubjectDto {
    pub name: Option<String>,
    pub category: Option<String>,
    pub is_dalton: Option<bool>,
}

/// Only the permissions to change; the others keep their current role.
#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct UpdateGroupPermissionsDto {
    #[validate(custom(function = "validate_required_roles"))]
    pub permissions: BTreeMap<Permission, Role>,
}

fn validate_required_roles(
    permissions: &BTreeMap<Permission, Role>,
) -> Result<(), validator::ValidationError> {
    if permissions
        .iter()
        .all(|(permission, role)| permission.accepts(*role))
    {
        Ok(())
    } else {
        Err(validator::ValidationError::new("role_not_accepted"))
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCourseDto {
    pub name: String,
    pub course_type: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCourseDto {
    pub name: String,
    pub course_type: Option<String>,
}
