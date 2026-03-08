// --- Announcements Module Types ---

export interface Announcement {
    id: string;
    content: string;
    color: AnnouncementColor;
    createdBy: string;
    createdAt: string;
    showAsPopup?: boolean;
}

export type AnnouncementColor = 'ok' | 'warn' | 'danger' | 'expired' | 'info';