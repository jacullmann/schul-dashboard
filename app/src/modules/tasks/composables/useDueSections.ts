import { computed, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNow } from '@vueuse/core';
import type { Task } from '@/modules/tasks/types';
import {
  dueSectionKey,
  dueSectionOf,
  firstDayOfWeek,
  formatSectionMonth,
} from '@/modules/tasks/utils/dueSection';

const PINNED_SECTION_KEY = 'pinned';
/** Often enough for the sections to move on shortly after midnight. */
const NOW_INTERVAL_MS = 60_000;

/**
 * The heading each task opens the list's section with, by id. Pinned tasks
 * lead the list out of date order, so they are a section of their own.
 */
export function useDueSections(
  items: Readonly<Ref<Task[]>>,
  isPinned: (id: string) => boolean,
) {
  const { t, locale } = useI18n();
  const now = useNow({ interval: NOW_INTERVAL_MS });
  const weekStart = computed(() => firstDayOfWeek(locale.value));

  const headingsById = computed(() => {
    const headings = new Map<string, string>();
    let previousKey: string | null = null;
    for (const task of items.value) {
      if (isPinned(task.id)) {
        if (previousKey !== PINNED_SECTION_KEY) {
          headings.set(task.id, t('tasks.list.sections.pinned'));
        }
        previousKey = PINNED_SECTION_KEY;
        continue;
      }
      const section = dueSectionOf(
        new Date(task.dueDate),
        now.value,
        weekStart.value,
      );
      const key = dueSectionKey(section);
      if (key !== previousKey) {
        headings.set(
          task.id,
          section.kind === 'month'
            ? formatSectionMonth(section, locale.value, now.value)
            : t(`tasks.list.sections.${section.kind}`),
        );
      }
      previousKey = key;
    }
    return headings;
  });

  function sectionHeadingOf(id: string): string | undefined {
    return headingsById.value.get(id);
  }

  return { sectionHeadingOf };
}
