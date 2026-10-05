export interface Announcement {
  id: string;
  content: string;
  important: boolean;
  createdBy: string | null;
  createdAt: string;
  read: boolean;
}

/** Mirrors the backend's limit: as short as an SMS. */
export const ANNOUNCEMENT_MAX_CHARS = 160;
