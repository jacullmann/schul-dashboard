export interface Announcement {
  id: string;
  content: string;
  title?: string;
  color?: AnnouncementColor;
  priority?: string;
  createdBy?: string;
  authorName?: string;
  createdAt: string;
  read: boolean;
}

export type AnnouncementColor = 'info' | 'warn' | 'danger';
