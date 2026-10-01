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
  memberCount: number;
}

export type MemberRole = 'owner' | 'admin' | 'moderator' | 'user';

/** The roles that can be assigned directly; ownership is only transferred. */
export type AssignableMemberRole = Exclude<MemberRole, 'owner'>;

export interface GroupMember {
  userId: string;
  generatedName: string;
  role: MemberRole;
  joinedAt: string;
  /** Roles the current user may move this member to, decided by the server. */
  assignableRoles: MemberRole[];
  /** Whether the current user may remove this member, decided by the server. */
  canRemove: boolean;
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
  /** Only present while the invite can still be used. */
  token: string | null;
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
