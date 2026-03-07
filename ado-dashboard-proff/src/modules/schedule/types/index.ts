// --- Schedule Module Types ---

export interface Lesson {
    id: string; // uuid
    day: number;
    slot: number;
    duration: number;
    room: string | null;
    courseId?: string | null;
    persons?: {
        id: string;
    } | null;
    subjects?: {
        id: string;
        name: string;
    } | null;
    courses?: {
        id: string;
        name: string;
    } | null;
    // Backward compatibility properties from old JSON
    subjectAbbr?: string;
    subject?: string;
    courseName?: string;
    _original?: Lesson;
    cancelled?: boolean;
}

export interface Substitution {
    lessonId: string;
    day?: number;
    slot?: number;
    duration?: number;
    subject?: string;
    subjectAbbr?: string;
    room?: string | null;
    cancelled?: boolean;
    hide?: boolean;
    createdAt?: string;
}

export interface TimeSlot {
    slot: number;
    time: string;
}