export type SuperAdminTab = 'overview' | 'users' | 'reports' | 'sorgen' | 'doc';
export type GroupAdminTab =
  | 'overview'
  | 'members'
  | 'schedule'
  | 'announcements'
  | 'subjects';

export interface AdminStats {
  userCount: number;
  itemCount: number;
  reportCount: number;
  reportCountTotal: number;
  reportCountProcessed: number;
  bannedCount: number;
  sorgeCount: number;
  sorgeCountTotal: number;
  sorgeCountProcessed: number;
  itemsByType: { _id: string; count: number }[];
  verifiedUsers: number;
  unverifiedUsers: number;
  adminCount: number;
  oldItemsCount: number;
  newUsersThisWeek: number;
  newItemsThisWeek: number;
  topCreators: { _id: string; count: number; email?: string }[];
}

export interface GroupStats {
  itemCount: number;
  subsCount: number;
  oldItemsCount: number;
  memberCount: number;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  isBanned: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLogin?: string;
  activityCount?: number;
}

export interface GroupMember {
  userId: string;
  generatedName: string;
  role: string;
  joinedAt: string;
}

export interface AdminReport {
  id: string;
  itemId: string;
  itemTitle: string;
  category: string;
  reason: string;
  reportedBy: string;
  reporterEmail?: string;
  processed: boolean;
  processedAt: string | null;
  reportedAt: string;
}

export interface AdminSorge {
  id: string;
  message: string;
  processed: boolean;
  processedAt: string | null;
  createdAt: string;
}

export interface ScheduleSubstitution {
  id: string;
  lessonId: string;
  day?: string;
  slot?: number;
  duration?: number;
  subject?: string;
  teacher?: string | null;
  room?: string | null;
  cancelled?: boolean;
  hide?: boolean;
  createdAt?: string;
}

export interface AdminAnnouncement {
  id: string;
  content: string;
  color: string;
  createdAt: string;
}

export interface AdminSubject {
  id: string;
  name: string;
  isActive: boolean;
}
