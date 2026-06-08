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
  category?: string;
  courses?: { id: string; name: string }[];
  coursesCount?: number;
}
