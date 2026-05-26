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
    const mapped = sub?.courses?.find(
      (k) => k.id === course || k.name === course,
    );
    if (mapped) course = mapped.name;

    let courseDisplay = course;
    const courseKey = getSubjectKey(course);
    if (te(`common.subjects.${courseKey}`)) {
      courseDisplay = t(`common.subjects.${courseKey}`);
    } else {
      const mr = t('common.titles.abbr.mr');
      const ms = t('common.titles.abbr.ms');

      courseDisplay = course
        .replace(/^Herr\s+/, `${mr} `)
        .replace(/^Frau\s+/, `${ms} `);
    }

    if (mainKey === 'enrichment') return `ENR ${courseDisplay}`;
    if (mainKey === 'wpu1') return `WPU 1 ${courseDisplay}`;
    if (mainKey === 'wpu2') return `WPU 2 ${courseDisplay}`;

    let subjectDisplay = parts[0]!.trim();
    if (te(`common.subjects.${mainKey}`)) {
      subjectDisplay = t(`common.subjects.${mainKey}`);
    }
    return `${subjectDisplay} - ${courseDisplay}`;
  }

  if (te(`common.subjects.${mainKey}`)) {
    return t(`common.subjects.${mainKey}`);
  }

  return subject;
}
