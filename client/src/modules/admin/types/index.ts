// --- Admin Module Types ---

// ─── Shared Tab Types ───────────────────────────────────────────
export type SuperAdminTab = 'overview' | 'users' | 'reports' | 'sorgen' | 'doc';
export type GroupAdminTab =
  | 'overview'
  | 'members'
  | 'timetable'
  | 'announcements'
  | 'subjects';

// ─── Super Admin Stats ──────────────────────────────────────────
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

// ─── Group Admin Stats ──────────────────────────────────────────
export interface GroupStats {
  itemCount: number;
  subsCount: number;
  oldItemsCount: number;
  memberCount: number;
}

// ─── Users ──────────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  email: string;
  role: string;
  isBanned: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLogin?: string;
  activityCount?: number;
  enrKurs?: number;
  wpuKurs1?: number;
  wpuKurs2?: number;
  theater?: number;
}

// ─── Group Members ──────────────────────────────────────────────
export interface GroupMember {
  userId: string;
  generatedName: string;
  role: string;
  joinedAt: string;
}

// ─── Reports ────────────────────────────────────────────────────
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

// ─── Sorgen ─────────────────────────────────────────────────────
export interface AdminSorge {
  id: string;
  message: string;
  processed: boolean;
  processedAt: string | null;
  createdAt: string;
}

// ─── Timetable Substitutions ────────────────────────────────────
export interface TimetableSubstitution {
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

// ─── Announcements ──────────────────────────────────────────────
export interface AdminAnnouncement {
  id: string;
  content: string;
  color: string;
  showAsPopup?: boolean;
  createdAt: string;
}

// ─── Subjects ───────────────────────────────────────────────────
export interface AdminSubject {
  id: string;
  name: string;
  isActive: boolean;
}
