export interface Lesson {
  id: string;
  day: number;
  slot: number;
  duration: number;
  room: string | null;
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
}

export interface Substitution {
  id: string;
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
