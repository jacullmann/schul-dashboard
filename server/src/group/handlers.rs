use super::{dto::*, invite_token::InviteToken, service::GroupService};
use crate::{
    common::assets,
    common::cloudinary::{OwnImageUrl, UploadSignature},
    common::extractors::{
        AuthUser, ClientIp, OptionalAuth, TenantContext, UserAgent, ValidatedJson,
    },
    common::group_type::GroupType,
    common::names::{
        COURSE_NAME_MAX_CHARS, DisplayName, GROUP_NAME_MAX_CHARS, SUBJECT_NAME_MAX_CHARS,
    },
    common::path_params::{IdPath, MemberPath, SubjectPath},
    common::role::Role,
    error::{AppError, AppResult},
    schedule::service::ScheduleService,
    state::AppState,
};
use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use serde::Deserialize;
use serde_json::{Value, json};

use super::{admin::service::GroupAdminService, member_policy::Caller};
use crate::group::dto::CreateScheduleSubDto;

pub async fn create_invite(State(s): State<AppState>, tc: TenantContext) -> AppResult<Json<Value>> {
    crate::require_permission!(tc, crate::common::permission::Permission::InviteMembers);

    let body = GroupService::from_state(&s)
        .create_invite(tc.tenant_id, tc.user.user_id)
        .await?;

    Ok(Json(body))
}

pub async fn get_invite(
    State(s): State<AppState>,
    OptionalAuth(user): OptionalAuth,
    Path(token): Path<String>,
) -> AppResult<Json<Value>> {
    let token: InviteToken = token.parse()?;
    let body = GroupService::from_state(&s)
        .get_invite(&token, user.map(|u| u.user_id))
        .await?;

    Ok(Json(body))
}

pub async fn accept_invite(
    State(s): State<AppState>,
    user: AuthUser,
    ClientIp(ip): ClientIp,
    UserAgent(ua): UserAgent,
    Path(token): Path<String>,
) -> AppResult<Json<Value>> {
    let token: InviteToken = token.parse()?;
    let body = GroupService::from_state(&s)
        .accept_invite(crate::group::service::AcceptInviteParams {
            user_id: user.user_id,
            token: &token,
            ip: ip.as_deref(),
            ua: ua.as_deref(),
        })
        .await?;

    Ok(Json(body))
}

/// Rejects unknown group types instead of silently storing a regular group.
fn parse_group_type(raw: Option<&str>) -> AppResult<Option<GroupType>> {
    raw.map(|value| {
        GroupType::from_str(value)
            .ok_or_else(|| AppError::bad_request("Unknown group type. Use 'regular' or 'abitur'."))
    })
    .transpose()
}

/// Clients show a group picture straight from its URL, so only images this
/// deployment uploaded may become one.
fn parse_avatar_url(s: &AppState, url: &str) -> AppResult<OwnImageUrl> {
    s.cloudinary
        .own_image_url(url)
        .ok_or_else(|| AppError::Validation(vec!["avatarUrl".to_owned()]))
}

pub async fn create_group(
    State(s): State<AppState>,
    user: AuthUser,
    ClientIp(ip): ClientIp,
    UserAgent(ua): UserAgent,
    Json(dto): Json<CreateGroupDto>,
) -> AppResult<Json<Value>> {
    let group_name = DisplayName::parse(&dto.group_name, GROUP_NAME_MAX_CHARS, "groupName")?;
    let avatar_url = dto
        .avatar_url
        .as_deref()
        .map(|url| parse_avatar_url(&s, url))
        .transpose()?;
    let group_type = parse_group_type(dto.group_type.as_deref())?.unwrap_or_default();

    let body = GroupService::from_state(&s)
        .create_group(crate::group::service::CreateGroupParams {
            user_id: user.user_id,
            group_name: &group_name,
            avatar_url: avatar_url.as_ref(),
            group_type,
            dalton_enabled: dto.dalton_enabled,
            ip: ip.as_deref(),
            ua: ua.as_deref(),
        })
        .await?;

    Ok(Json(body))
}

/// A new group's avatar is uploaded before the group exists, so this is the
/// one upload signature that needs no group membership.
pub async fn sign_group_avatar_upload(
    State(s): State<AppState>,
    _user: AuthUser,
) -> AppResult<Json<UploadSignature>> {
    Ok(Json(
        assets::issue_upload(&s.db, &s.cloudinary, None).await?,
    ))
}

pub async fn get_status(
    State(s): State<AppState>,
    OptionalAuth(user): OptionalAuth,
) -> AppResult<Json<GroupStatusDto>> {
    Ok(Json(
        GroupService::from_state(&s)
            .get_status(user.map(|u| u.user_id))
            .await?,
    ))
}

pub async fn get_group(
    State(s): State<AppState>,
    tc: TenantContext,
) -> AppResult<Json<GroupSummaryDto>> {
    Ok(Json(GroupService::from_state(&s).get_group(&tc).await?))
}

pub async fn record_visit(State(s): State<AppState>, tc: TenantContext) -> AppResult<StatusCode> {
    GroupService::from_state(&s)
        .record_visit(tc.user.user_id, tc.tenant_id)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn leave_group(State(s): State<AppState>, tc: TenantContext) -> AppResult<Json<Value>> {
    GroupService::from_state(&s)
        .leave_group(tc.user.user_id, tc.tenant_id)
        .await?;
    s.message_bus.membership_changed(tc.tenant_id).await;

    Ok(Json(json!({ "ok": true })))
}

pub async fn get_stats(State(s): State<AppState>, tc: TenantContext) -> AppResult<Json<Value>> {
    crate::require_permission!(tc, crate::common::permission::Permission::EditGroupGeneral);

    Ok(Json(
        GroupAdminService::from_state(&s)
            .get_stats(tc.tenant_id)
            .await?,
    ))
}

/// Every member may see who else is in the group; only the pseudonyms are
/// exposed, never emails.
pub async fn get_members(
    State(s): State<AppState>,
    tc: TenantContext,
) -> AppResult<Json<Vec<GroupMemberDto>>> {
    Ok(Json(
        GroupService::from_state(&s)
            .list_members(tc.tenant_id, Caller::from_tenant(&tc))
            .await?,
    ))
}

pub async fn get_banned_users(
    State(s): State<AppState>,
    tc: TenantContext,
) -> AppResult<Json<Value>> {
    crate::require_permission!(tc, crate::common::permission::Permission::ModerateMembers);

    Ok(Json(
        GroupAdminService::from_state(&s)
            .get_banned_users(tc.tenant_id)
            .await?,
    ))
}

pub async fn revert_ban(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(MemberPath { user_id: target }): Path<MemberPath>,
) -> AppResult<Json<Value>> {
    crate::require_permission!(tc, crate::common::permission::Permission::ModerateMembers);

    Ok(Json(
        GroupAdminService::from_state(&s)
            .revert_ban(tc.tenant_id, tc.user.user_id, target)
            .await?,
    ))
}

pub async fn change_member_role(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(MemberPath { user_id: target }): Path<MemberPath>,
    Json(dto): Json<ChangeMemberRoleDto>,
) -> AppResult<Json<Value>> {
    let role = Role::from_str(&dto.role).ok_or_else(|| AppError::bad_request("Invalid role"))?;

    Ok(Json(
        GroupAdminService::from_state(&s)
            .change_member_role(tc.tenant_id, Caller::from_tenant(&tc), target, role)
            .await?,
    ))
}

pub async fn transfer_ownership(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<TransferOwnershipDto>,
) -> AppResult<Json<Value>> {
    Ok(Json(
        GroupAdminService::from_state(&s)
            .transfer_ownership(tc.tenant_id, Caller::from_tenant(&tc), dto.target_user_id)
            .await?,
    ))
}

#[derive(Deserialize)]
pub struct BanQuery {
    pub ban: Option<String>,
}

pub async fn remove_member(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(MemberPath { user_id: target }): Path<MemberPath>,
    Query(q): Query<BanQuery>,
) -> AppResult<Json<Value>> {
    let body = GroupAdminService::from_state(&s)
        .remove_member(
            tc.tenant_id,
            Caller::from_tenant(&tc),
            target,
            q.ban.as_deref() == Some("true"),
        )
        .await?;
    s.message_bus.membership_changed(tc.tenant_id).await;

    Ok(Json(body))
}

pub async fn rename_group(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<RenameGroupDto>,
) -> AppResult<Json<Value>> {
    crate::require_permission!(tc, crate::common::permission::Permission::EditGroupGeneral);

    let name = dto
        .name
        .as_deref()
        .map(|name| DisplayName::parse(name, GROUP_NAME_MAX_CHARS, "name"))
        .transpose()?;
    let avatar_url = match dto.avatar_url {
        None => None,
        Some(None) => Some(None),
        Some(Some(url)) => Some(Some(parse_avatar_url(&s, &url)?)),
    };
    let group_type = parse_group_type(dto.group_type.as_deref())?;

    // The group type decides which subject categories exist and whether the
    // schedule is kept per course, and Dalton adds a pseudo-subject to both, so
    // changing either needs both of those rights.
    if group_type.is_some() || dto.dalton_enabled.is_some() {
        crate::require_permission!(
            tc,
            crate::common::permission::Permission::EditSubjectsCourses
        );
        crate::require_permission!(tc, crate::common::permission::Permission::EditSchedule);
    }

    Ok(Json(
        GroupAdminService::from_state(&s)
            .rename_group(
                tc.tenant_id,
                tc.user.user_id,
                name.as_ref(),
                avatar_url.as_ref().map(Option::as_ref),
                group_type,
                dto.dalton_enabled,
            )
            .await?,
    ))
}

pub async fn get_permissions(
    State(s): State<AppState>,
    tc: TenantContext,
) -> AppResult<Json<Value>> {
    if !tc.has_owner_rights() {
        return Err(AppError::forbidden(
            "Only the group owner or superadmin can view permissions.",
        ));
    }
    Ok(Json(
        GroupAdminService::from_state(&s)
            .get_permissions(tc.tenant_id)
            .await?,
    ))
}

pub async fn update_permissions(
    State(s): State<AppState>,
    tc: TenantContext,
    ValidatedJson(dto): ValidatedJson<UpdateGroupPermissionsDto>,
) -> AppResult<Json<Value>> {
    if !tc.has_owner_rights() {
        return Err(AppError::forbidden(
            "Only the group owner or superadmin can change permissions.",
        ));
    }
    Ok(Json(
        GroupAdminService::from_state(&s)
            .update_permissions(tc.tenant_id, tc.user.user_id, &dto.permissions)
            .await?,
    ))
}

pub async fn delete_group(State(s): State<AppState>, tc: TenantContext) -> AppResult<Json<Value>> {
    if !tc.has_owner_rights() {
        return Err(AppError::forbidden(
            "Only the group owner or superadmin can delete this group.",
        ));
    }

    let body = GroupAdminService::from_state(&s)
        .delete_group(tc.tenant_id, tc.user.user_id)
        .await?;
    s.message_bus.membership_changed(tc.tenant_id).await;

    Ok(Json(body))
}

pub async fn get_subjects_admin(
    State(s): State<AppState>,
    tc: TenantContext,
) -> AppResult<Json<Value>> {
    crate::require_permission!(
        tc,
        crate::common::permission::Permission::EditSubjectsCourses
    );

    Ok(Json(
        GroupAdminService::from_state(&s)
            .get_subjects(tc.tenant_id)
            .await?,
    ))
}

pub async fn create_subject(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<CreateSubjectDto>,
) -> AppResult<Json<Value>> {
    crate::require_permission!(
        tc,
        crate::common::permission::Permission::EditSubjectsCourses
    );
    let name = DisplayName::parse(&dto.name, SUBJECT_NAME_MAX_CHARS, "name")?;
    Ok(Json(
        GroupAdminService::from_state(&s)
            .create_subject(
                tc.tenant_id,
                tc.user.user_id,
                &name,
                dto.category.as_deref(),
                dto.is_dalton,
            )
            .await?,
    ))
}

pub async fn update_subject(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(IdPath { id }): Path<IdPath>,
    Json(dto): Json<UpdateSubjectDto>,
) -> AppResult<Json<Value>> {
    crate::require_permission!(
        tc,
        crate::common::permission::Permission::EditSubjectsCourses
    );
    let name = dto
        .name
        .as_deref()
        .map(|n| DisplayName::parse(n, SUBJECT_NAME_MAX_CHARS, "name"))
        .transpose()?;
    Ok(Json(
        GroupAdminService::from_state(&s)
            .update_subject(
                tc.tenant_id,
                tc.user.user_id,
                id,
                name.as_ref(),
                dto.category.as_deref(),
                dto.is_dalton,
            )
            .await?,
    ))
}

pub async fn delete_subject(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(IdPath { id }): Path<IdPath>,
) -> AppResult<Json<Value>> {
    crate::require_permission!(
        tc,
        crate::common::permission::Permission::EditSubjectsCourses
    );
    Ok(Json(
        GroupAdminService::from_state(&s)
            .delete_subject(tc.tenant_id, tc.user.user_id, id)
            .await?,
    ))
}

pub async fn create_course(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(SubjectPath { subject_id }): Path<SubjectPath>,
    Json(dto): Json<CreateCourseDto>,
) -> AppResult<Json<Value>> {
    crate::require_permission!(
        tc,
        crate::common::permission::Permission::EditSubjectsCourses
    );
    let name = DisplayName::parse(&dto.name, COURSE_NAME_MAX_CHARS, "name")?;
    Ok(Json(
        GroupAdminService::from_state(&s)
            .create_course(
                tc.tenant_id,
                tc.user.user_id,
                subject_id,
                &name,
                dto.course_type.as_deref(),
            )
            .await?,
    ))
}

pub async fn update_course(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(IdPath { id }): Path<IdPath>,
    Json(dto): Json<UpdateCourseDto>,
) -> AppResult<Json<Value>> {
    crate::require_permission!(
        tc,
        crate::common::permission::Permission::EditSubjectsCourses
    );
    let name = DisplayName::parse(&dto.name, COURSE_NAME_MAX_CHARS, "name")?;
    Ok(Json(
        GroupAdminService::from_state(&s)
            .update_course(
                tc.tenant_id,
                tc.user.user_id,
                id,
                &name,
                dto.course_type.as_deref(),
            )
            .await?,
    ))
}

pub async fn delete_course(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(IdPath { id }): Path<IdPath>,
) -> AppResult<Json<Value>> {
    crate::require_permission!(
        tc,
        crate::common::permission::Permission::EditSubjectsCourses
    );
    Ok(Json(
        GroupAdminService::from_state(&s)
            .delete_course(tc.tenant_id, tc.user.user_id, id)
            .await?,
    ))
}

pub async fn get_schedule_admin(
    State(s): State<AppState>,
    tc: TenantContext,
) -> AppResult<Json<Value>> {
    // Read-only for every member: /schedule already returns the whole
    // timetable to members without course personalization.
    Ok(Json(
        ScheduleService::from_state(&s)
            .get_schedule(tc.tenant_id, None)
            .await?
            .lessons,
    ))
}

pub async fn replace_schedule_admin(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<ReplaceScheduleDto>,
) -> AppResult<Json<Value>> {
    crate::require_permission!(tc, crate::common::permission::Permission::EditSchedule);

    Ok(Json(
        GroupAdminService::from_state(&s)
            .replace_schedule(tc.tenant_id, tc.user.user_id, dto)
            .await?,
    ))
}

pub async fn get_schedule_subs_admin(
    State(s): State<AppState>,
    tc: TenantContext,
) -> AppResult<Json<Value>> {
    // Read-only for every member, like /schedule/subs.
    Ok(Json(
        ScheduleService::from_state(&s)
            .get_subs(tc.tenant_id)
            .await?,
    ))
}

pub async fn create_schedule_sub(
    State(s): State<AppState>,
    tc: TenantContext,
    Json(dto): Json<CreateScheduleSubDto>,
) -> AppResult<Json<Value>> {
    crate::require_permission!(
        tc,
        crate::common::permission::Permission::ManageScheduleChanges
    );

    Ok(Json(
        GroupAdminService::from_state(&s)
            .create_schedule_sub(tc.tenant_id, tc.user.user_id, dto)
            .await?,
    ))
}

pub async fn delete_schedule_sub(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(IdPath { id }): Path<IdPath>,
) -> AppResult<Json<Value>> {
    crate::require_permission!(
        tc,
        crate::common::permission::Permission::ManageScheduleChanges
    );

    Ok(Json(
        GroupAdminService::from_state(&s)
            .delete_schedule_sub(tc.tenant_id, id)
            .await?,
    ))
}

pub async fn get_invites(State(s): State<AppState>, tc: TenantContext) -> AppResult<Json<Value>> {
    crate::require_permission!(tc, crate::common::permission::Permission::ModerateMembers);
    Ok(Json(
        GroupAdminService::from_state(&s)
            .get_invites(tc.tenant_id)
            .await?,
    ))
}

pub async fn revoke_invite(
    State(s): State<AppState>,
    tc: TenantContext,
    Path(IdPath { id: invite_id }): Path<IdPath>,
) -> AppResult<Json<Value>> {
    crate::require_permission!(tc, crate::common::permission::Permission::ModerateMembers);
    Ok(Json(
        GroupAdminService::from_state(&s)
            .revoke_invite(tc.tenant_id, tc.user.user_id, invite_id)
            .await?,
    ))
}
