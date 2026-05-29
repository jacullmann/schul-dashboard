export interface HwItem {
  id: string;
  type: 'homework' | 'dalton' | 'exam';
  title: string;
  subject: string;
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

export type ItemType = 'homework' | 'dalton' | 'exam' | 'all';

export function isValidType(t: unknown): t is ItemType {
  return t === 'homework' || t === 'dalton' || t === 'exam' || t === 'all';
}

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
