use crate::common::role::Role;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Permission {
    EditGroupGeneral,
    EditSubjectsCourses,
    EditSchedule,
    CreateItems,
    UploadImages,
    ManageNotes,
    SendMessages,
    ManageScheduleChanges,
    ManageAnnouncements,
    ModerateMembers,
    EditOtherContent,
    DeleteOtherContent,
    InviteMembers,
}

impl Permission {
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::EditGroupGeneral => "edit_group_general",
            Self::EditSubjectsCourses => "edit_subjects_courses",
            Self::EditSchedule => "edit_schedule",
            Self::CreateItems => "create_items",
            Self::UploadImages => "upload_images",
            Self::ManageNotes => "manage_notes",
            Self::SendMessages => "send_messages",
            Self::ManageScheduleChanges => "manage_schedule_changes",
            Self::ManageAnnouncements => "manage_announcements",
            Self::ModerateMembers => "moderate_members",
            Self::EditOtherContent => "edit_other_content",
            Self::DeleteOtherContent => "delete_other_content",
            Self::InviteMembers => "invite_members",
        }
    }

    pub const ALL: [Permission; 13] = [
        Self::EditGroupGeneral,
        Self::EditSubjectsCourses,
        Self::EditSchedule,
        Self::CreateItems,
        Self::UploadImages,
        Self::ManageNotes,
        Self::SendMessages,
        Self::ManageScheduleChanges,
        Self::ManageAnnouncements,
        Self::ModerateMembers,
        Self::EditOtherContent,
        Self::DeleteOtherContent,
        Self::InviteMembers,
    ];

    pub fn from_str(s: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|p| p.as_str() == s)
    }

    /// Moderation-grade permissions are never granted to every member.
    pub const fn lowest_role(self) -> Role {
        match self {
            Self::EditSubjectsCourses
            | Self::EditSchedule
            | Self::ManageAnnouncements
            | Self::ModerateMembers
            | Self::EditOtherContent
            | Self::DeleteOtherContent => Role::Moderator,
            Self::EditGroupGeneral
            | Self::CreateItems
            | Self::UploadImages
            | Self::ManageNotes
            | Self::SendMessages
            | Self::ManageScheduleChanges
            | Self::InviteMembers => Role::User,
        }
    }

    /// Superadmin is never a requirement: it would lock the group's own owner out.
    pub fn accepts(self, required: Role) -> bool {
        required != Role::Superadmin && required.dominates(self.lowest_role())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GroupPermissions {
    pub edit_group_general: Role,
    pub edit_subjects_courses: Role,
    pub edit_schedule: Role,
    pub create_items: Role,
    pub upload_images: Role,
    pub manage_notes: Role,
    pub send_messages: Role,
    pub manage_schedule_changes: Role,
    pub manage_announcements: Role,
    pub moderate_members: Role,
    pub edit_other_content: Role,
    pub delete_other_content: Role,
    pub invite_members: Role,
}

impl Default for GroupPermissions {
    fn default() -> Self {
        Self {
            edit_group_general: Role::Moderator,
            edit_subjects_courses: Role::Admin,
            edit_schedule: Role::Admin,
            create_items: Role::User,
            upload_images: Role::User,
            manage_notes: Role::Moderator,
            send_messages: Role::User,
            manage_schedule_changes: Role::Moderator,
            manage_announcements: Role::Moderator,
            moderate_members: Role::Moderator,
            edit_other_content: Role::Moderator,
            delete_other_content: Role::Moderator,
            invite_members: Role::User,
        }
    }
}

impl GroupPermissions {
    pub fn required_role(&self, permission: Permission) -> Role {
        match permission {
            Permission::EditGroupGeneral => self.edit_group_general,
            Permission::EditSubjectsCourses => self.edit_subjects_courses,
            Permission::EditSchedule => self.edit_schedule,
            Permission::CreateItems => self.create_items,
            Permission::UploadImages => self.upload_images,
            Permission::ManageNotes => self.manage_notes,
            Permission::SendMessages => self.send_messages,
            Permission::ManageScheduleChanges => self.manage_schedule_changes,
            Permission::ManageAnnouncements => self.manage_announcements,
            Permission::ModerateMembers => self.moderate_members,
            Permission::EditOtherContent => self.edit_other_content,
            Permission::DeleteOtherContent => self.delete_other_content,
            Permission::InviteMembers => self.invite_members,
        }
    }

    fn required_role_mut(&mut self, permission: Permission) -> &mut Role {
        match permission {
            Permission::EditGroupGeneral => &mut self.edit_group_general,
            Permission::EditSubjectsCourses => &mut self.edit_subjects_courses,
            Permission::EditSchedule => &mut self.edit_schedule,
            Permission::CreateItems => &mut self.create_items,
            Permission::UploadImages => &mut self.upload_images,
            Permission::ManageNotes => &mut self.manage_notes,
            Permission::SendMessages => &mut self.send_messages,
            Permission::ManageScheduleChanges => &mut self.manage_schedule_changes,
            Permission::ManageAnnouncements => &mut self.manage_announcements,
            Permission::ModerateMembers => &mut self.moderate_members,
            Permission::EditOtherContent => &mut self.edit_other_content,
            Permission::DeleteOtherContent => &mut self.delete_other_content,
            Permission::InviteMembers => &mut self.invite_members,
        }
    }

    /// Groups store only what they changed, so every permission missing from
    /// `raw` keeps its default. That also covers permissions added later.
    pub fn from_json_with_defaults(raw: &serde_json::Value) -> Self {
        let mut perms = Self::default();
        perms.apply_overrides(raw);
        perms
    }

    /// Stored overrides are read leniently: unknown keys and roles a
    /// permission does not accept keep the default.
    fn apply_overrides(&mut self, raw: &serde_json::Value) {
        let Some(obj) = raw.as_object() else {
            return;
        };

        let overrides = obj.iter().filter_map(|(key, val)| {
            Some((Permission::from_str(key)?, Role::from_str(val.as_str()?)?))
        });
        for (permission, role) in overrides {
            if permission.accepts(role) {
                *self.required_role_mut(permission) = role;
            }
        }
    }

    /// Callers validate the roles first (see [`Permission::accepts`]).
    pub fn set_required_role(&mut self, permission: Permission, role: Role) {
        *self.required_role_mut(permission) = role;
    }

    pub fn allowed_keys_for_role(&self, role: Role) -> Vec<&'static str> {
        Permission::ALL
            .iter()
            .filter(|&&p| role.dominates(self.required_role(p)))
            .map(Permission::as_str)
            .collect()
    }

    /// Owners and superadmins hold every permission regardless of the matrix.
    pub fn effective_keys(&self, role: Role, has_owner_rights: bool) -> Vec<&'static str> {
        if has_owner_rights {
            return Permission::ALL.iter().map(Permission::as_str).collect();
        }
        self.allowed_keys_for_role(role)
    }
}

#[macro_export]
macro_rules! require_permission {
    ($tc:expr, $perm:expr) => {
        if !$tc.can($perm) {
            return Err($crate::error::AppError::Forbidden(
                "Insufficient permissions.".into(),
            ));
        }
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_match_original_hardcodes() {
        let p = GroupPermissions::default();
        assert_eq!(p.send_messages, Role::User);
        assert_eq!(p.create_items, Role::User);
        assert_eq!(p.upload_images, Role::User);
        assert_eq!(p.edit_group_general, Role::Moderator);
        assert_eq!(p.manage_notes, Role::Moderator);
        assert_eq!(p.manage_schedule_changes, Role::Moderator);
        assert_eq!(p.manage_announcements, Role::Moderator);
        assert_eq!(p.moderate_members, Role::Moderator);
        assert_eq!(p.edit_other_content, Role::Moderator);
        assert_eq!(p.delete_other_content, Role::Moderator);
        assert_eq!(p.edit_subjects_courses, Role::Admin);
        assert_eq!(p.edit_schedule, Role::Admin);
    }

    #[test]
    fn json_merge_overrides_and_ignores_superadmin() {
        let raw = serde_json::json!({
            "send_messages": "moderator",
            "send_messages_typo": "user",
            "create_items": "superadmin",
        });
        let p = GroupPermissions::from_json_with_defaults(&raw);
        assert_eq!(p.send_messages, Role::Moderator);
        assert_eq!(p.create_items, Role::User); // default
    }

    #[test]
    fn json_roundtrip() {
        let original = GroupPermissions::default();
        let json = serde_json::json!(original);
        let restored = GroupPermissions::from_json_with_defaults(&json);
        assert_eq!(original, restored);
    }

    #[test]
    fn stored_overrides_skip_roles_a_permission_does_not_accept() {
        let p = GroupPermissions::from_json_with_defaults(&serde_json::json!({
            "edit_other_content": "admin",
            "delete_other_content": "user",
            "manage_notes": "user",
        }));
        assert_eq!(p.edit_other_content, Role::Admin);
        assert_eq!(p.delete_other_content, Role::Moderator);
        assert_eq!(p.manage_notes, Role::User);
    }

    #[test]
    fn defaults_are_accepted_by_their_permissions() {
        let p = GroupPermissions::default();
        for permission in Permission::ALL {
            assert!(
                permission.accepts(p.required_role(permission)),
                "{permission:?}"
            );
        }
    }

    #[test]
    fn allowed_keys_user_role() {
        let p = GroupPermissions::default();
        let keys = p.allowed_keys_for_role(Role::User);
        assert!(keys.contains(&"send_messages"));
        assert!(keys.contains(&"create_items"));
        assert!(!keys.contains(&"edit_other_content"));
        assert!(!keys.contains(&"delete_other_content"));
        assert!(!keys.contains(&"edit_subjects_courses"));
    }

    #[test]
    fn allowed_keys_admin_gets_everything_except_superadmin_level() {
        let p = GroupPermissions::default();
        let keys = p.allowed_keys_for_role(Role::Admin);
        assert_eq!(keys.len(), Permission::ALL.len());
    }

    #[test]
    fn effective_keys_owner_rights_override_matrix() {
        let p = GroupPermissions::default();
        assert_eq!(
            p.effective_keys(Role::User, true).len(),
            Permission::ALL.len()
        );
        assert_eq!(
            p.effective_keys(Role::User, false),
            p.allowed_keys_for_role(Role::User)
        );
    }

    #[test]
    fn permission_str_roundtrip() {
        for p in Permission::ALL {
            assert_eq!(Permission::from_str(p.as_str()), Some(p));
        }
    }
}
