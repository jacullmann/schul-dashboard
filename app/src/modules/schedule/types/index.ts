export interface Lesson {
  id: string;
  _originalId?: string;
  day: number;
  slot: number;
  duration: number;
  room: string | null;
  subjectId?: string | null;
  courseId?: string | null;
  subjects?: {
    id: string;
    name: string;
  } | null;
  courses?: {
    id: string;
    name: string;
  } | null;
  subjectAbbr?: string;
  subject?: string;
  courseName?: string;
  _original?: Lesson;
  cancelled?: boolean;
  isSubstitutedSubject?: boolean;
  /** A Dalton lesson stands in for a subject and never carries one. */
  isDalton?: boolean;
}

export interface ScheduleConfig {
  startTime: string;
  totalSlots: number;
  lessonDurationMins: number;
  breaks: Record<number, number>;
}

export interface Substitution {
  id: string;
  lessonId: string;
  courseId?: string | null;
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

export type ScheduleRow =
  | { kind: 'lesson'; gridRow: number; slot: number; startTime: string }
  | {
      kind: 'break';
      gridRow: number;
      afterSlot: number;
      startTime: string;
      durationMins: number;
    };
