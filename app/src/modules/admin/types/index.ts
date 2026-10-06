import type { StoredFile } from '@/api/files';

export type AdminTab =
  'overview' | 'users' | 'reports' | 'groups' | 'announcements';

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
  reportCount: number;
}

/** A scheduled cleanup, named as in `database/pg_cron_setup.sql`, with the
 * rows it should already have removed. */
export interface CleanupJob {
  job: string;
  overdueCount: number;
}

export interface DailyActivity {
  day: string;
  newUsers: number;
  newGroups: number;
  newItems: number;
  appOpens: number;
  activeUsers: number;
  failedLogins: number;
}

export type DailyMetric = Exclude<keyof DailyActivity, 'day'>;

export type MetricsRange = '1h' | '24h' | '7d' | '30d';

/** A sample in Unix seconds; a `null` value is a gap in the measurement. */
export type MetricPoint = [timestamp: number, value: number | null];

/** The server's load as Hetzner measures it. CPU is in percent of one vCPU,
 * so it reaches `cpuCores * 100`; bandwidths are in bytes per second. */
export interface ServerMetrics {
  start: number;
  end: number;
  cpuCores: number;
  cpu: MetricPoint[];
  networkIn: MetricPoint[];
  networkOut: MetricPoint[];
}

export type UserStatusFilter =
  'all' | 'active' | 'banned' | 'unverified' | 'superadmin';

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
  itemCourse?: string | null;
  itemDescription?: string;
  /** A snapshot taken when the task was reported. */
  itemAttachments?: StoredFile[];
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
  avatarUrl: string | null;
  groupType: 'regular' | 'abitur';
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  createdAt: string;
  memberCount: number;
  itemCount: number;
}

export type SystemAnnouncementStatus = 'active' | 'scheduled';

/** A platform announcement that runs or is scheduled; ended ones are gone. */
export interface AdminSystemAnnouncement {
  id: string;
  content: string;
  important: boolean;
  status: SystemAnnouncementStatus;
  startsAt: string;
  endsAt: string | null;
  authorEmail: string | null;
  readCount: number;
}

/** Omitting `startsAt` publishes right away; omitting `endsAt` never ends. */
export interface SaveSystemAnnouncementRequest {
  content: string;
  important: boolean;
  startsAt?: string;
  endsAt?: string;
}

export interface SuperAdminNavItem {
  id: AdminTab;
  name: string;
  label: string;
  count: number;
  danger?: boolean;
}
