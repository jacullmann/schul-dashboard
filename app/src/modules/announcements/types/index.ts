export interface Announcement {
  id: string;
  content: string;
  title?: string;
  color?: AnnouncementColor;
  priority?: string;
  createdBy?: string;
  authorName?: string;
  createdAt: string;
}

export type AnnouncementColor = 'ok' | 'warn' | 'danger' | 'expired' | 'info';
