// --- Tasks Module Types ---

export interface HwItem {
    id: string;
    type: 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG';
    title: string;
    subject: string;
    description: string;
    images: ImageItem[];
    dueDate: string;
    createdBy: string;
    createdByEmail?: string;
    timeColor: string;
    editorNote: string;
}

export type ItemType = 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG' | 'PRIVATE';

export function isValidType(t: unknown): t is ItemType {
    return t === 'HAUSAUFGABE' || t === 'DALTON' || t === 'PRUEFUNG' || t === 'PRIVATE';
}

export interface ImageItem {
    url: string;
    publicId: string;
    thumbUrl?: string;
    createdBy?: string;
}

export interface Todo {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    position?: string;
    createdAt: string;
    updatedAt: string;
}