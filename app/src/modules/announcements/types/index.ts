export type AnnouncementColor = 'info' | 'warn' | 'danger';

export interface Announcement {
  id: string;
  content: string;
  color: AnnouncementColor;
  createdBy: string | null;
  createdAt: string;
  read: boolean;
}
