export interface HwItem {
  id: string;
  type: 'homework' | 'dalton' | 'exam';
  title: string;
  /** Null when the subject was typed in by hand instead of picked. */
  subjectId: string | null;
  courseId: string | null;
  /** A `common.subjects.*` key or the name the group owner typed. */
  subjectName: string;
  courseName: string | null;
  description: string;
  images: ImageItem[];
  dueDate: string;
  createdBy: string;
  createdByEmail?: string;
  createdByName?: string;
  timeColor: string;
  editorNote: string;
  createdAt?: string;
  updatedAt?: string;
}

/** How a task names its subject when it is created or edited. */
export type ItemSubjectPayload =
  | { subjectId: string; courseId: string | null }
  | { customName: string };

export type ItemType = 'homework' | 'dalton' | 'exam' | 'all';

export function isValidType(t: unknown): t is ItemType {
  return t === 'homework' || t === 'dalton' || t === 'exam' || t === 'all';
}

export type TaskMenuAction =
  | 'images'
  | 'edit'
  | 'addNote'
  | 'pin'
  | 'archive'
  | 'share'
  | 'info'
  | 'report'
  | 'delete';

export interface ImageItem {
  publicId: string;
  url?: string;
  thumbUrl?: string;
  createdBy?: string;
  metadata?: {
    version?: number;
    format?: string;
    width?: number;
    height?: number;
    name?: string;
    thumbnailId?: string | null;
  };
}

export interface PrivateTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  position?: string;
  createdAt: string;
  updatedAt: string;
}
