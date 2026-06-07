export type SuperAdminTab = 'overview' | 'users' | 'reports' | 'sorgen' | 'doc';

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
