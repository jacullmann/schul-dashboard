// --- Announcements Module Types ---

export interface Announcement {
  id: string;
  content: string;
  color: AnnouncementColor;
  createdBy: string;
  createdAt: string;
}

export type AnnouncementColor = 'ok' | 'warn' | 'danger' | 'expired' | 'info';
