// Keep the list empty for now but here is an example of how subjects can be added:
// export const AVAILABLE_SUBJECTS: string[] = [
//   'english',
//   'pe'
// ];
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

export const REVERSE_SUBJECT_MAP: Record<string, string> = {
    'Deutsch': 'german',
    'Französisch': 'french',
    'Mathe': 'math',
    'Englisch': 'english',
    'Enrichment': 'enrichment',
    'WPU 1': 'wpu1',
    'WPU (Di)': 'wpu1',
    'WPU 2': 'wpu2',
    'WPU (Do)': 'wpu2',
    'Theater': 'theater',
    'Informatik': 'cs',
    'Latein': 'latin',
    'Chemie': 'chemistry',
    'Politik': 'politics',
    'Geschichte': 'history',
    'Kunst': 'art',
    'Sport': 'pe',
    'Klassenstunde': 'classHour',
    'Ethik': 'ethics',
    'Erdkunde': 'geography',
    'Physik': 'physics',
    'Musik': 'music',
    'Biologie': 'biology',
    'Philosophie': 'philosophy',
    'Religion': 'religion'
};

export function getSubjectKey(subject: string): string {
    return REVERSE_SUBJECT_MAP[subject] || subject;
}