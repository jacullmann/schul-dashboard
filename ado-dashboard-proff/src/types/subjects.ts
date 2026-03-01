// export const AVAILABLE_SUBJECTS: string[]
export const AVAILABLE_SUBJECTS: string[] = [
    'german',
    'french',
    'math',
    'english',
    'enrichment',
    'wpu1',
    'wpu2',
    'theater',
    'chemistry',
    'politics',
    'history',
    'art',
    'pe',
    'classHour',
];

export function getSubjectKey(subject: string): string {
    return subject;
}

export const ENR_COURSES = [
    { id: '1', name: 'Herr Müller' },
    { id: '2', name: 'Herr Weber' },
    { id: '3', name: 'Frau Glier' },
    { id: '4', name: 'Frau Thamm' },
] as const;

export const WPU1_COURSES = [
    { id: '1', name: 'Englisch' },
    { id: '2', name: 'Deutsch' },
    { id: '3', name: 'Biologie' },
    { id: '4', name: 'Geschichte' },
    { id: '5', name: 'Informatik' },
    { id: '6', name: 'Latein' },
] as const;

export const WPU2_COURSES = [
    { id: '1', name: 'Englisch' },
    { id: '2', name: 'Biologie' },
    { id: '3', name: 'Mathe' },
    { id: '4', name: 'Geschichte' },
    { id: '5', name: 'Musik' },
] as const;