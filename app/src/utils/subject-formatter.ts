import { getSubjectKey } from '@/types/subjects';
import { useSubjectStore } from '@/stores/subjectStore';

export function formatSubjectDisplay(
  subject: string,
  t: (key: string) => string,
  te: (key: string) => boolean,
): string {
  if (!subject) return subject;

  const parts = subject.split(' - ');
  const mainKey = getSubjectKey(parts[0]!.trim());

  if (parts.length === 2) {
    const subjectStore = useSubjectStore();
    const sub = subjectStore.subjects.find(
      (s) => s.id === mainKey || s.name.toLowerCase() === mainKey.toLowerCase(),
    );
    let course = parts[1]!.trim();
    const mapped = sub?.courses?.find((k) => k.id === course || k.name === course);
    if (mapped) course = mapped.name;

    let courseDisplay = course;
    const courseKey = getSubjectKey(course);
    if (te(`global.subjects.${courseKey}`)) {
      courseDisplay = t(`global.subjects.${courseKey}`);
    } else {
      const mr = t('global.titles.abbr.mr');
      const ms = t('global.titles.abbr.ms');

      courseDisplay = course
        .replace(/^Herr\s+/, `${mr} `)
        .replace(/^Frau\s+/, `${ms} `);
    }

    if (mainKey === 'enrichment') return `ENR ${courseDisplay}`;
    if (mainKey === 'wpu1') return `WPU 1 ${courseDisplay}`;
    if (mainKey === 'wpu2') return `WPU 2 ${courseDisplay}`;

    let subjectDisplay = parts[0]!.trim();
    if (te(`global.subjects.${mainKey}`)) {
      subjectDisplay = t(`global.subjects.${mainKey}`);
    }
    return `${subjectDisplay} - ${courseDisplay}`;
  }

  if (te(`global.subjects.${mainKey}`)) {
    return t(`global.subjects.${mainKey}`);
  }

  return subject;
}
