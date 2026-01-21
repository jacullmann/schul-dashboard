/**
 * "Enrichment - Herr Weber" -> "ENR Hr. Weber"
 * "Enrichment - Frau Müller" -> "ENR Fr. Müller"
 * "WPU (Di) - Latein" -> "WPU 1 Latein"
 * "WPU (Do) - Englisch" -> "WPU 2 Englisch"
 */
export function formatSubjectDisplay(subject: string): string {
    if (!subject) return subject;
    // Enrichment
    if (subject.startsWith('Enrichment - ')) {
        const coursePart = subject.replace('Enrichment - ', '');
        // "Herr Weber" -> "Hr. Weber", "Frau Yatkin" -> "Fr. Yatkin"
        const abbreviated = coursePart
            .replace(/^Herr\s+/, 'Hr. ')
            .replace(/^Frau\s+/, 'Fr. ');
        return `ENR ${abbreviated}`;
    }
    // WPU (Di) -> WPU 1
    if (subject.startsWith('WPU (Di) - ')) {
        const coursePart = subject.replace('WPU (Di) - ', '');
        return `WPU 1 ${coursePart}`;
    }
    // WPU (Do) -> WPU 2
    if (subject.startsWith('WPU (Do) - ')) {
        const coursePart = subject.replace('WPU (Do) - ', '');
        return `WPU 2 ${coursePart}`;
    }
    return subject;
}