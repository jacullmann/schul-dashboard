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
  | 'edit_other_content'
  | 'delete_other_content'
  | 'invite_members';

export type GlobalRole = 'superadmin' | 'admin' | 'moderator' | 'user';

/** The lowest role a permission needs; superadmins are never a requirement. */
export type PermissionRole = Exclude<GlobalRole, 'superadmin'>;

export type PermissionMatrix = Record<PermissionKey, PermissionRole>;
