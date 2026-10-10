/** Permissions a group can reassign on its permissions page. */
export type ConfigurablePermissionKey =
  | 'edit_group_profile'
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

/** `edit_group_configuration` is fixed to admins in every group. */
export type PermissionKey =
  ConfigurablePermissionKey | 'edit_group_configuration';

export type GlobalRole = 'superadmin' | 'admin' | 'moderator' | 'user';

/** The lowest role a permission needs; superadmins are never a requirement. */
export type PermissionRole = Exclude<GlobalRole, 'superadmin'>;

export type PermissionMatrix = Record<
  ConfigurablePermissionKey,
  PermissionRole
>;
