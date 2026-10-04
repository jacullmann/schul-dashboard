import deCommon from '@/i18n/locales/de/common.json';
import enCommon from '@/i18n/locales/en/common.json';
import { DALTON_SUBJECT_KEY, type CourseType } from '@/types/subjects';

type Translate = (key: string) => string;
type TranslationExists = (key: string) => boolean;

/**
 * Subjects picked from the built-in list are stored by their translation key
 * (`math`), everything else by the name the owner typed. Every place that shows
 * a subject goes through here, so both kinds read the same in every language.
 */
export function subjectLabel(
  name: string,
  t: Translate,
  te: TranslationExists,
): string {
  const key =
    name === DALTON_SUBJECT_KEY ? DALTON_SUBJECT_KEY : builtInSubjectKey(name);
  return key && te(`common.subjects.${key}`)
    ? t(`common.subjects.${key}`)
    : name;
}

/**
 * Course names are typed in freely; only a leading title is localised, unless
 * the whole name is a built-in subject (WPU courses are named after one).
 */
export function courseLabel(
  name: string,
  t: Translate,
  te: TranslationExists,
): string {
  const key = builtInSubjectKey(name);
  if (key && te(`common.subjects.${key}`)) return t(`common.subjects.${key}`);

  return name
    .replace(/^Herr\s+/, `${t('common.titles.abbr.mr')} `)
    .replace(/^Frau\s+/, `${t('common.titles.abbr.ms')} `);
}

/**
 * GK/LK/ZK belongs to the course, so two courses of the same subject stay
 * distinguishable in a list.
 */
export function courseTypeHint(
  courseType: CourseType | null | undefined,
  t: Translate,
  te: TranslationExists,
): string | undefined {
  const key = `groups.settings.subjects.course_types_short.${courseType}`;
  return courseType && te(key) ? t(key) : undefined;
}

export function formatSubjectDisplay(
  subjectName: string,
  courseName: string | null | undefined,
  t: Translate,
  te: TranslationExists,
): string {
  if (!courseName) return subjectLabel(subjectName, t, te);

  return `${subjectLabel(subjectName, t, te)} ${courseLabel(courseName, t, te)}`;
}

const BUILT_IN_SUBJECT_KEYS = (() => {
  const byLabel = new Map<string, string>();
  for (const subjects of [deCommon.subjects, enCommon.subjects]) {
    for (const [key, label] of Object.entries(subjects)) {
      if (key === DALTON_SUBJECT_KEY) continue;
      byLabel.set(key.toLowerCase(), key);
      byLabel.set(label.toLowerCase(), key);
    }
  }
  return byLabel;
})();

/**
 * The built-in key a typed name stands for, in any language: an owner typing
 * "Mathe" or "Math" means the translated `math` subject, not a second one that
 * only ever reads "Mathe".
 */
export function builtInSubjectKey(typedName: string): string | undefined {
  return BUILT_IN_SUBJECT_KEYS.get(typedName.trim().toLowerCase());
}
