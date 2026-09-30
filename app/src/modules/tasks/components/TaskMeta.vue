<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatSubjectDisplay } from '@/utils/subject-formatter';
import type { HwItem } from '@/modules/tasks/types';

const props = defineProps<{
  item: HwItem;
  /** Redundant under a tab that holds a single type. */
  showType: boolean;
  /**
   * Left to the task's own page, so list rows stay short, and to members who
   * moderate the group. The email only arrives for superadmins.
   */
  showCreator: boolean;
  /** Pushes the due date to the far end of the row. */
  spread?: boolean;
}>();

const i18n = useI18n();
const t = i18n.t.bind(i18n);
const te = i18n.te.bind(i18n);

const leadingParts = computed(() => [
  formatSubjectDisplay(props.item.subjectName, props.item.courseName, t, te),
  ...(props.showType ? [t(`tasks.list.types.${props.item.type}`)] : []),
]);
const dueDate = computed(() =>
  new Date(props.item.dueDate).toLocaleDateString(),
);
const parts = computed(() => [
  ...leadingParts.value,
  dueDate.value,
  ...(props.showCreator
    ? [props.item.createdByName || t('common.selection.unknown')]
    : []),
]);
</script>

<template>
  <div
    v-if="spread"
    class="text-on-ghost-muted flex justify-between gap-2 text-base"
  >
    <span class="min-w-0 truncate">{{ leadingParts.join(' • ') }}</span>
    <span class="shrink-0">{{ dueDate }}</span>
  </div>
  <div v-else class="text-on-ghost-muted text-base">
    {{ parts.join(' • ') }}
  </div>
  <div
    v-if="showCreator && item.createdByEmail"
    class="text-on-ghost-subtle text-base"
  >
    ({{ item.createdByEmail }})
  </div>
</template>
