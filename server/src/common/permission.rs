pub fn check_role_permission(user_role: &str, required_role: &str) -> bool {
    match user_role {
        "superadmin" | "admin" => true,
        "moderator" => !matches!(required_role, "superadmin" | "admin"),
        "user" => required_role == "user",
        _ => false,
    }
}
