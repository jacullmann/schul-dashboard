import type { CourseType } from '@/types/subjects';

export type GroupAdminTab =
  | 'overview'
  | 'members'
  | 'schedule'
  | 'announcements'
  | 'subjects';

export interface GroupStats {
  itemCount: number;
  subsCount: number;
  oldItemsCount: number;
  memberCount: number;
}

export interface GroupMember {
  userId: string;
  generatedName: string;
  role: string;
  joinedAt: string;
}

export interface ScheduleSubstitution {
  id: string;
  lessonId: string;
  courseId?: string | null;
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

export interface AdminCourse {
  id: string;
  name: string;
  /** GK/LK/ZK in an Abitur group, absent everywhere else. */
  courseType?: CourseType | null;
}

export interface AdminSubject {
  id: string;
  name: string;
  category?: string;
  /** Offered for Dalton tasks; always set on the whole subject. */
  isDalton?: boolean;
  courses?: AdminCourse[];
  coursesCount?: number;
}

export interface GroupInviteLog {
  id: string;
  token: string;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedBy: string | null;
  usedByName: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revokedByName: string | null;
}
