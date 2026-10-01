import { computed, ref, type Ref } from 'vue';
import type { Lesson } from '@/modules/schedule/types';
import { lessonLastSlot } from '@/modules/schedule/utils/lesson';

const addsToSelection = (event: MouseEvent) => event.ctrlKey || event.metaKey;

/** The lessons picked in an editable schedule, chosen the way files are in a file manager. */
export function useLessonSelection(lessons: Ref<Lesson[]>) {
  const selectedLessonIds = ref<string[]>([]);
  /** Where a Shift-click range starts. */
  const anchorLessonId = ref<string | null>(null);

  const singleSelectedLesson = computed(() =>
    selectedLessonIds.value.length === 1
      ? (lessons.value.find(
          (lesson) => lesson.id === selectedLessonIds.value[0],
        ) ?? null)
      : null,
  );

  function deselectAll() {
    selectedLessonIds.value = [];
    anchorLessonId.value = null;
  }

  function selectOnly(id: string) {
    selectedLessonIds.value = [id];
    anchorLessonId.value = id;
  }

  function toggle(id: string) {
    selectedLessonIds.value = selectedLessonIds.value.includes(id)
      ? selectedLessonIds.value.filter((selectedId) => selectedId !== id)
      : [...selectedLessonIds.value, id];
    anchorLessonId.value = id;
  }

  /** Every lesson in the block of days and slots spanned by the anchor and the target. */
  function selectRangeTo(targetId: string, keepSelection: boolean) {
    const anchor = lessons.value.find(
      (lesson) => lesson.id === anchorLessonId.value,
    );
    const target = lessons.value.find((lesson) => lesson.id === targetId);
    if (!anchor || !target) {
      selectOnly(targetId);
      return;
    }

    const firstDay = Math.min(anchor.day, target.day);
    const lastDay = Math.max(anchor.day, target.day);
    const firstSlot = Math.min(anchor.slot, target.slot);
    const lastSlot = Math.max(lessonLastSlot(anchor), lessonLastSlot(target));

    const rangeIds = lessons.value
      .filter(
        (lesson) =>
          lesson.day >= firstDay &&
          lesson.day <= lastDay &&
          lesson.slot <= lastSlot &&
          lessonLastSlot(lesson) >= firstSlot,
      )
      .map((lesson) => lesson.id);

    selectedLessonIds.value = keepSelection
      ? [...new Set([...selectedLessonIds.value, ...rangeIds])]
      : rangeIds;
  }

  function selectByClick(id: string, event: MouseEvent) {
    if (event.shiftKey) {
      selectRangeTo(id, addsToSelection(event));
    } else if (addsToSelection(event)) {
      toggle(id);
    } else {
      selectOnly(id);
    }
  }

  /*
   * Ctrl/Cmd adds a day's lessons or, once all are selected, removes them.
   * A plain click selects only that day, or clears a selection that is
   * exactly that day.
   */
  function selectDay(day: number, event?: MouseEvent) {
    const dayLessonIds = lessons.value
      .filter((lesson) => lesson.day === day)
      .map((lesson) => lesson.id);
    const [firstLessonId] = dayLessonIds;
    if (!firstLessonId) return;

    const selected = new Set(selectedLessonIds.value);
    const wholeDaySelected = dayLessonIds.every((id) => selected.has(id));

    if (event && addsToSelection(event)) {
      dayLessonIds.forEach((id) =>
        wholeDaySelected ? selected.delete(id) : selected.add(id),
      );
      selectedLessonIds.value = [...selected];
    } else if (wholeDaySelected && selected.size === dayLessonIds.length) {
      selectedLessonIds.value = [];
    } else {
      selectedLessonIds.value = dayLessonIds;
    }
    anchorLessonId.value = firstLessonId;
  }

  return {
    selectedLessonIds,
    singleSelectedLesson,
    deselectAll,
    selectOnly,
    selectByClick,
    selectDay,
  };
}
