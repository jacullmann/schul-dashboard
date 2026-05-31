use crate::common::role::Role;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
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
            Self::DeleteOtherContent => "delete_other_content",
            Self::InviteMembers => "invite_members",
        }
    }

    pub const ALL: [Permission; 12] = [
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
        Self::DeleteOtherContent,
        Self::InviteMembers,
    ];

    #[allow(dead_code)]
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "edit_group_general" => Some(Self::EditGroupGeneral),
            "edit_subjects_courses" => Some(Self::EditSubjectsCourses),
            "edit_schedule" => Some(Self::EditSchedule),
            "create_items" => Some(Self::CreateItems),
            "upload_images" => Some(Self::UploadImages),
            "manage_notes" => Some(Self::ManageNotes),
            "send_messages" => Some(Self::SendMessages),
            "manage_schedule_changes" => Some(Self::ManageScheduleChanges),
            "manage_announcements" => Some(Self::ManageAnnouncements),
            "moderate_members" => Some(Self::ModerateMembers),
            "delete_other_content" => Some(Self::DeleteOtherContent),
            "invite_members" => Some(Self::InviteMembers),
            _ => None,
        }
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
            Permission::DeleteOtherContent => self.delete_other_content,
            Permission::InviteMembers => self.invite_members,
        }
    }

    pub fn from_json_with_defaults(raw: &serde_json::Value) -> Self {
        let mut perms = Self::default();

        let Some(obj) = raw.as_object() else {
            return perms;
        };

        for (key, val) in obj {
            let Some(role_str) = val.as_str() else {
                continue;
            };
            if role_str == "superadmin" {
                continue;
            }
            let Some(role) = Role::from_str(role_str) else {
                continue;
            };

            match key.as_str() {
                "edit_group_general" => perms.edit_group_general = role,
                "edit_subjects_courses" => perms.edit_subjects_courses = role,
                "edit_schedule" => perms.edit_schedule = role,
                "create_items" => perms.create_items = role,
                "upload_images" => perms.upload_images = role,
                "manage_notes" => perms.manage_notes = role,
                "send_messages" => perms.send_messages = role,
                "manage_schedule_changes" => perms.manage_schedule_changes = role,
                "manage_announcements" => perms.manage_announcements = role,
                "moderate_members" => perms.moderate_members = role,
                "delete_other_content" => perms.delete_other_content = role,
                "invite_members" => perms.invite_members = role,
                _ => {}
            }
        }

        perms
    }

    pub fn to_json(&self) -> serde_json::Value {
        serde_json::json!({
            "edit_group_general": self.edit_group_general.as_str(),
            "edit_subjects_courses": self.edit_subjects_courses.as_str(),
            "edit_schedule": self.edit_schedule.as_str(),
            "create_items": self.create_items.as_str(),
            "upload_images": self.upload_images.as_str(),
            "manage_notes": self.manage_notes.as_str(),
            "send_messages": self.send_messages.as_str(),
            "manage_schedule_changes": self.manage_schedule_changes.as_str(),
            "manage_announcements": self.manage_announcements.as_str(),
            "moderate_members": self.moderate_members.as_str(),
            "delete_other_content": self.delete_other_content.as_str(),
            "invite_members": self.invite_members.as_str(),
        })
    }

    pub fn allowed_keys_for_role(&self, role: Role) -> Vec<&'static str> {
        Permission::ALL
            .iter()
            .filter(|&&p| role.dominates(self.required_role(p)))
            .map(|p| p.as_str())
            .collect()
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
        let json = original.to_json();
        let restored = GroupPermissions::from_json_with_defaults(&json);
        assert_eq!(original, restored);
    }

    #[test]
    fn allowed_keys_user_role() {
        let p = GroupPermissions::default();
        let keys = p.allowed_keys_for_role(Role::User);
        assert!(keys.contains(&"send_messages"));
        assert!(keys.contains(&"create_items"));
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
    fn permission_str_roundtrip() {
        for p in Permission::ALL {
            assert_eq!(Permission::from_str(p.as_str()), Some(p));
        }
    }
}
