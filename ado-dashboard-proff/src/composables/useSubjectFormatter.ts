import { getSubjectKey } from '@/types/subjects';

export function formatSubjectDisplay(subject: string, t: (key: string) => string, te: (key: string) => boolean): string {
    if (!subject) return subject;

    const parts = subject.split(' - ');
    const mainKey = getSubjectKey(parts[0]!.trim());

    if (parts.length === 2 && ['enrichment', 'wpu1', 'wpu2'].includes(mainKey)) {
        const course = parts[1]!.trim();
        let courseDisplay = course;

        // Try to translate course if it matches a subject key (like Biologie -> biology)
        const courseKey = getSubjectKey(course);
        if (te(`global.subjects.${courseKey}`)) {
            courseDisplay = t(`global.subjects.${courseKey}`);
        } else {
            // Check for titles
            const mr = t('global.titles.abbr.mr');
            const ms = t('global.titles.abbr.ms');

            courseDisplay = course
                .replace(/^Herr\s+/, `${mr} `)
                .replace(/^Frau\s+/, `${ms} `);
        }

        if (mainKey === 'enrichment') return `ENR ${courseDisplay}`;
        if (mainKey === 'wpu1') return `WPU 1 ${courseDisplay}`;
        if (mainKey === 'wpu2') return `WPU 2 ${courseDisplay}`;
    }

    // Try translating main part
    if (te(`global.subjects.${mainKey}`)) {
        return t(`global.subjects.${mainKey}`);
    }

    return subject;
}