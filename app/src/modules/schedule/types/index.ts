import type { StyleValue } from 'vue';

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
  /** Shown to the member although they take none of its courses. */
  outsideCourseSelection?: boolean;
}

/** Lessons that start in the same slot of the same day share one cell. */
export interface LessonGroup {
  key: string;
  day: number;
  lessons: Lesson[];
}

export interface ScheduleCourse {
  id: string;
  name: string;
}

export interface ScheduleSubject {
  id: string;
  name: string;
  courses?: ScheduleCourse[] | null;
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
  startTime: string;
}

export type ScheduleRow =
  | { kind: 'lesson'; gridRow: number; slot: number; startTime: string }
  | {
      kind: 'break';
      gridRow: number;
      afterSlot: number;
      startTime: string;
      durationMins: number;
    }
  | { kind: 'dayEnd'; gridRow: number; afterSlot: number; startTime: string };

export interface ScheduleLayout {
  rows: ScheduleRow[];
  gridRowOfSlot: (slot: number) => number;
  groupStyle: (group: Lesson[]) => Record<string, string>;
}

/** What a phone shows for one day, laid out on a grid of its own. */
export interface ScheduleDayPanel {
  gridStyle?: StyleValue;
}
