import { ref, computed, onMounted } from 'vue';
import hw from '@/api/hwApi';
import {
  normalize,
  similarity,
  editDistance,
} from '@/modules/tools/utils/kuerzelHelper';
import { useI18n } from 'vue-i18n';

interface Person {
  id: number;
  short: string;
  title: string;
  name: string;
}

/** Minimum fuzzy-similarity score for a suggestion to be shown. */
const SUGGESTION_THRESHOLD = 0.6;

export function useKuerzel() {
  const { t } = useI18n();

  function getTitleAliases(titleKey: string): string[] {
    if (!titleKey) return [''];
    const aliases = new Set<string>();
    aliases.add(normalize(titleKey));

    const normalTitle = t(`global.titles.${titleKey}`);
    if (!normalTitle.includes('global.titles.'))
      aliases.add(normalize(normalTitle));

    const abbrTitle = t(`global.titles.abbr.${titleKey}`);
    if (!abbrTitle.includes('global.titles.'))
      aliases.add(normalize(abbrTitle));

    // Always check for german hr, fr, herr, frau regardless of current language
    if (titleKey === 'mr') {
      aliases.add(normalize('herr'));
      aliases.add(normalize('hr'));
      aliases.add(normalize('hr.'));
      aliases.add(normalize('mr'));
      aliases.add(normalize('mr.'));
    } else if (titleKey === 'ms') {
      aliases.add(normalize('frau'));
      aliases.add(normalize('fr'));
      aliases.add(normalize('fr.'));
      aliases.add(normalize('ms'));
      aliases.add(normalize('ms.'));
    }

    return Array.from(aliases).filter(Boolean);
  }

  // ─── Constants ───────────────────────────────────────────────────────────

  const SHORT_EXAMPLES = ['HA', 'FS', 'AY', 'SM', 'AN'] as const;
  const NAME_EXAMPLES = [
    t('global.titles.ms') + ' Haupt',
    t('global.titles.mr') + ' Fischer',
    t('global.titles.ms') + ' Aydem',
    t('global.titles.ms') + ' Simsek',
    t('global.titles.mr') + ' Al-Najjar',
  ] as const;

  // ─── State ───────────────────────────────────────────────────────────────

  const persons = ref<Person[]>([]);
  const mode = ref<'shortToName' | 'nameToShort'>('shortToName');
  const inputValue = ref('');
  const isRotated = ref(false);

  const currentPlaceholder = ref('');
  const otherPlaceholder = ref('');

  // ─── Data loading ────────────────────────────────────────────────────────

  async function loadPeople() {
    try {
      const response = await hw.get<Person[]>('/api/timetable/persons');
      persons.value = response.data;
    } catch (error) {
      console.error('Failed to load persons:', error);
    }
  }

  // ─── Placeholder ─────────────────────────────────────────────────────────

  function setRandomPlaceholder() {
    const idx = Math.floor(Math.random() * SHORT_EXAMPLES.length);
    const short = SHORT_EXAMPLES[idx] ?? '';
    const name = NAME_EXAMPLES[idx] ?? '';

    if (mode.value === 'shortToName') {
      currentPlaceholder.value = `${short}...`;
      otherPlaceholder.value = name;
    } else {
      currentPlaceholder.value = `${name}...`;
      otherPlaceholder.value = short;
    }
  }

  // ─── Computed output + suggestions ───────────────────────────────────────

  /**
   * Reactive list of fuzzy-matched suggestions (only populated when there is
   * no exact match in name→short mode).  Sorted by descending similarity so
   * the best match comes first.
   */
  const suggestions = computed<Person[]>(() => {
    if (mode.value !== 'nameToShort') return [];

    const q = normalize(inputValue.value);
    if (!q) return [];

    // Exact full-name match → no suggestions needed
    if (
      persons.value.some((p: Person) => {
        const normName = normalize(p.name);
        const aliases = getTitleAliases(p.title);
        return aliases.some((alias) => alias + normName === q);
      })
    ) {
      return [];
    }

    // Multiple last-name-only matches → surface them all, no fuzzy needed
    const byName = persons.value.filter((p: Person) => normalize(p.name) === q);
    if (byName.length > 1) return byName;

    // Fuzzy: collect candidates above threshold and sort best-first
    return persons.value
      .map((p: Person) => {
        const normName = normalize(p.name);
        const aliases = getTitleAliases(p.title);

        // Base score: evaluate the name alone assuming no title was provided in the input
        let maxScore = similarity(q, normName);

        // Give one additional "false character" that is allowed for the suggestion to go through for the title
        // Try to match a title alias at the beginning of q with <= 1 error
        for (const alias of aliases) {
          if (!alias) continue;
          for (
            let len = Math.max(0, alias.length - 1);
            len <= Math.min(q.length, alias.length + 1);
            len++
          ) {
            const prefix = q.slice(0, len);
            if (editDistance(alias, prefix) <= 1) {
              const qName = q.slice(len);
              const nameScore = similarity(qName, normName);
              if (nameScore > maxScore) {
                maxScore = nameScore;
              }
            }
          }
        }

        return { person: p, score: maxScore };
      })
      .filter(({ score }: { score: number }) => score > SUGGESTION_THRESHOLD)
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .map(({ person }: { person: Person }) => person);
  });

  /** The resolved value shown in the read-only output field. */
  const outputValue = computed<string>(() => {
    const q = normalize(inputValue.value);
    if (!q) return '';

    if (mode.value === 'shortToName') {
      const match = persons.value.find((p: Person) => normalize(p.short) === q);
      if (!match) return '';
      const titleStr = match.title
        ? t(`global.titles.${match.title}`) + ' '
        : '';
      return `${titleStr}${match.name}`;
    }

    // Exact full-name match (title + name)
    const fullMatch = persons.value.find((p: Person) => {
      const normName = normalize(p.name);
      const aliases = getTitleAliases(p.title);
      return aliases.some((alias) => alias + normName === q);
    });
    if (fullMatch) return fullMatch.short.toUpperCase();

    // Single last-name match
    const byName = persons.value.filter((p: Person) => normalize(p.name) === q);
    if (byName.length === 1) return byName[0]!.short.toUpperCase();

    return '';
  });

  // ─── Actions ─────────────────────────────────────────────────────────────

  function applySuggestion(person: Person) {
    const titleStr = person.title
      ? t(`global.titles.${person.title}`) + ' '
      : '';
    inputValue.value = `${titleStr}${person.name}`;
  }

  function toggleMode() {
    isRotated.value = !isRotated.value;
    mode.value = mode.value === 'shortToName' ? 'nameToShort' : 'shortToName';
    inputValue.value = '';
    setRandomPlaceholder();
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  onMounted(() => {
    loadPeople();
    setRandomPlaceholder();
  });

  // ─── Public API ──────────────────────────────────────────────────────────

  return {
    persons,
    mode,
    inputValue,
    outputValue,
    suggestions,
    isRotated,
    currentPlaceholder,
    otherPlaceholder,
    applySuggestion,
    toggleMode,
  };
}
