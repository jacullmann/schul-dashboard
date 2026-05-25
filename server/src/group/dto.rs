use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct JoinGroupDto {
    #[validate(length(min = 1, max = 100))]
    pub group_name: String,
    pub password: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateGroupDto {
    #[validate(length(min = 1, max = 100))]
    pub group_name: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct SwitchGroupDto {
    pub group_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct ChangeMemberRoleDto {
    pub role: String,
}

#[derive(Debug, Deserialize)]
pub struct RenameGroupDto {
    pub name: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGroupPasswordDto {
    pub old_password: String,
    pub new_password: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateScheduleConfigDto {
    pub schedule_config: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct CreateScheduleSubDto {
    pub lesson_id: Uuid,
    pub day: Option<i32>,
    pub slot: Option<i32>,
    pub duration: Option<i32>,
    pub subject: Option<String>,
    pub room: Option<String>,
    pub cancelled: Option<bool>,
    pub hide: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAnnouncementDto {
    pub content: String,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSubjectDto {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSubjectDto {
    pub name: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGroupPermissionsDto {
    pub permissions: serde_json::Value,
}
