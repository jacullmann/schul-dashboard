export type AdminTab = 'overview' | 'users' | 'reports' | 'groups';

export type SortOrder = 'asc' | 'desc';

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface SuperAdminStats {
  userCount: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  adminCount: number;
  bannedCount: number;
  newUsersThisWeek: number;
  activeUsersThisWeek: number;
  itemCount: number;
  newItemsThisWeek: number;
  oldItemsCount: number;
  oldActivityCount: number;
  reportCount: number;
}

export interface DailyActivity {
  day: string;
  newUsers: number;
  newItems: number;
}

export type UserStatusFilter =
  | 'all'
  | 'active'
  | 'banned'
  | 'unverified'
  | 'superadmin';

export type UserSort = 'createdAt' | 'lastLoginAt' | 'email';

export interface SuperAdminUser {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  isSuperadmin: boolean;
  isBanned: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface SuperAdminUserActivity {
  at: string;
  type: string;
  meta: Record<string, unknown> | null;
}

export type MemberRole = 'owner' | 'admin' | 'moderator' | 'user';

export interface SuperAdminMembership {
  groupId: string;
  groupName: string;
  role: MemberRole;
  joinedAt: string;
  assignableRoles: MemberRole[];
}

export interface SuperAdminReportImage {
  publicId: string;
  metadata?: { thumbnailId?: string };
}

export interface SuperAdminReport {
  id: string;
  reportedAt: string;
  contentDeleted: boolean;
  reason?: string | null;
  reporterEmail?: string;
  reportType: 'task' | 'message';
  itemId?: string;
  itemTitle?: string;
  itemType?: string;
  itemSubject?: string;
  itemDescription?: string;
  itemImages?: SuperAdminReportImage[];
  itemDueDate?: string;
  itemEditorNote?: string;
  creatorEmail?: string;
  messageId?: string;
  messageContent?: string;
  messageSenderEmail?: string | null;
}

export type GroupTypeFilter = 'all' | 'regular' | 'abitur';

export type GroupSort = 'createdAt' | 'name' | 'memberCount' | 'itemCount';

export interface SuperAdminGroup {
  id: string;
  name: string;
  groupType: 'regular' | 'abitur';
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  createdAt: string;
  memberCount: number;
  itemCount: number;
}

export interface SuperAdminNavItem {
  id: AdminTab;
  name: string;
  label: string;
  count: number;
  danger?: boolean;
}
