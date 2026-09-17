use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreateGroupDto {
    #[validate(length(min = 1, max = 100))]
    pub group_name: String,
    pub avatar_url: Option<String>,
    pub group_type: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SwitchGroupDto {
    pub group_id: Uuid,
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
    pub avatar_url: Option<String>,
    pub group_type: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateScheduleConfigDto {
    pub schedule_config: serde_json::Value,
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
pub struct CreateAnnouncementDto {
    pub content: String,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSubjectDto {
    pub name: String,
    pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSubjectDto {
    pub name: Option<String>,
    pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateGroupPermissionsDto {
    pub permissions: serde_json::Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCourseDto {
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCourseDto {
    pub name: String,
}
