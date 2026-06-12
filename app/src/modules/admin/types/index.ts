export type AdminTab = 'overview' | 'users' | 'reports' | 'groups';

export interface SuperAdminStats {
  userCount?: number;
  itemCount?: number;
  reportCount?: number;
  reportCountTotal?: number;
  reportCountProcessed?: number;
  bannedCount?: number;
  verifiedUsers?: number;
  unverifiedUsers?: number;
  adminCount?: number;
  oldItemsCount?: number;
  newUsersThisWeek?: number;
  newItemsThisWeek?: number;
}

export interface SuperAdminUser {
  id: string;
  email: string;
  role: string;
  isBanned: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLogin?: string;
  activityCount?: number;
}

export interface SuperAdminUserActivity {
  at: string;
  type: string;
  meta: Record<string, unknown>;
}

export interface SuperAdminReportImage {
  publicId: string;
  metadata?: { thumbnailId?: string };
}

export interface SuperAdminReport {
  id: string;
  reportedAt: string;
  processed: boolean;
  processedAt?: string | null;
  reason?: string;
  reporterEmail?: string;
  itemId?: string;
  itemTitle?: string;
  itemType?: string;
  itemSubject?: string;
  itemDescription?: string;
  itemImages?: AdminReportImage[];
  itemDueDate?: string;
  itemEditorNote?: string;
  itemTenantId?: string;
  creatorEmail?: string;
  reportType?: 'task' | 'message';
  messageId?: string;
  messageContent?: string;
  messageSenderEmail?: string;
  messageTenantId?: string;
}

export interface SuperAdminGroup {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string | null;
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
