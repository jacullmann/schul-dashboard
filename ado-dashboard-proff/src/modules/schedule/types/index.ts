// --- Schedule Module Types ---

export interface Lesson {
    id: string; // uuid
    day: string;
    slot: number;
    duration: number;
    room: string | null;
    course_id?: string | null;
    persons?: {
        id: string;
        name: string;
        title: string | null;
        short: string | null;
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
    subject_abbr?: string;
    teacher?: string | null;
    subject?: string;
    courseName?: string;
    _original?: Lesson;
    cancelled?: boolean;
}

export interface Substitution {
    lessonId: string;
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