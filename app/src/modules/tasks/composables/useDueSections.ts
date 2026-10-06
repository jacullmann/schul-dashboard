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
import {
  taskListRows,
  type TaskSection,
} from '@/modules/tasks/utils/taskListRows';

const PINNED_SECTION_KEY = 'pinned';
/** Often enough for the sections to move on shortly after midnight. */
const NOW_INTERVAL_MS = 60_000;

/**
 * The list's rows: the tasks under a heading for each section they are due
 * in. Pinned tasks lead the list out of date order, so they are a section of
 * their own.
 */
export function useDueSections(
  items: Readonly<Ref<Task[]>>,
  isPinned: (id: string) => boolean,
) {
  const { t, locale } = useI18n();
  const now = useNow({ interval: NOW_INTERVAL_MS });
  const weekStart = computed(() => firstDayOfWeek(locale.value));

  function sectionOf(task: Task): TaskSection {
    if (isPinned(task.id)) {
      return {
        key: PINNED_SECTION_KEY,
        label: t('tasks.list.sections.pinned'),
      };
    }
    const section = dueSectionOf(
      new Date(task.dueDate),
      now.value,
      weekStart.value,
    );
    return {
      key: dueSectionKey(section),
      label:
        section.kind === 'month'
          ? formatSectionMonth(section, locale.value, now.value)
          : t(`tasks.list.sections.${section.kind}`),
    };
  }

  const rows = computed(() => taskListRows(items.value, sectionOf));

  return { rows };
}
