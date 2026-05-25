pub fn check_role_permission(user_role: &str, required_role: &str) -> bool {
    match user_role {
        "superadmin" | "admin" => true,
        "moderator" => !matches!(required_role, "superadmin" | "admin"),
        "user" => required_role == "user",
        _ => false,
    }
}

pub fn default_required_role(permission_key: &str) -> &'static str {
    match permission_key {
        "edit_group_general" => "moderator",
        "edit_subjects_courses" => "admin",
        "edit_schedule" => "admin",
        "create_items" => "user",
        "upload_images" => "user",
        "manage_notes" => "moderator",
        "send_messages" => "user",
        "manage_schedule_changes" => "moderator",
        "manage_announcements" => "moderator",
        "moderate_members" => "moderator",
        "delete_other_content" => "moderator",
        _ => "admin",
    }
}