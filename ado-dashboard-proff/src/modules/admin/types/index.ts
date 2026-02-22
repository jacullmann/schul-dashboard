// --- Admin Module Types ---

export type AdminTab = 'overview' | 'users' | 'reports' | 'security' | 'sorgen' | 'announcements' | 'timetable';

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
    isAdmin: boolean;
    isBanned: boolean;
    emailVerified: boolean;
    createdAt: string;
    lastLogin?: string;
    activityCount?: number;
}

export interface AdminReport {
    _id: string;
    itemId: string;
    itemTitle: string;
    category: string;
    reason: string;
    reportedBy: string;
    processed: boolean;
    processedAt: string | null;
    createdAt: string;
}

export interface AdminSorge {
    _id: string;
    content: string;
    processed: boolean;
    processedAt: string | null;
    createdAt: string;
}

export interface TimetableSubstitution {
    _id: string;
    lessonId: number;
    day?: string;
    slot?: number;
    duration?: number;
    subject?: string;
    subject_abbr?: string;
    teacher?: string | null;
    room?: string | null;
    cancelled?: boolean;
    hide?: boolean;
}