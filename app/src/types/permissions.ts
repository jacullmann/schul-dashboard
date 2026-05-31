export type PermissionKey =
    | 'edit_group_general'
    | 'edit_subjects_courses'
    | 'edit_schedule'
    | 'create_items'
    | 'upload_images'
    | 'manage_notes'
    | 'send_messages'
    | 'manage_schedule_changes'
    | 'manage_announcements'
    | 'moderate_members'
    | 'delete_other_content'

export type GlobalRole = 'superadmin' | 'admin' | 'moderator' | 'user'
