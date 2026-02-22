// --- Schedule Module Types ---

export interface Lesson {
    id: number;
    day: string;
    slot: number;
    duration: number;
    subject: string;
    subject_abbr?: string;
    teacher: string | null;
    room: string | null;
    courseId?: number | null;
    _original?: Lesson;
    cancelled?: boolean;
}

export interface Substitution {
    lessonId: number;
    day?: string;
    slot?: number;
    duration?: number;
    subject?: string;
    subject_abbr?: string;
    teacher?: string | null;
    room?: string | null;
    cancelled?: boolean;
    hide?: boolean;
}

export interface TimeSlot {
    slot: number;
    time: string;
}