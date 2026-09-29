<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import { formatSubjectDisplay } from '@/utils/subject-formatter';
import type { HwItem } from '@/modules/tasks/types';

const props = defineProps<{
  item: HwItem;
  /** Redundant under a tab that holds a single type. */
  showType: boolean;
  /** Left to the task's own page, so list rows stay short. */
  showCreator: boolean;
}>();

const i18n = useI18n();
const t = i18n.t.bind(i18n);
const te = i18n.te.bind(i18n);
const { isGroupAdmin, isSuperadmin } = storeToRefs(useUserStore());

const parts = computed(() => [
  ...(props.showType ? [t(`tasks.list.types.${props.item.type}`)] : []),
  formatSubjectDisplay(props.item.subjectName, props.item.courseName, t, te),
  new Date(props.item.dueDate).toLocaleDateString(),
  ...(props.showCreator && isGroupAdmin.value
    ? [props.item.createdByName || t('common.selection.unknown')]
    : []),
]);
</script>

<template>
  <div class="text-on-ghost-muted text-base">{{ parts.join(' • ') }}</div>
  <div
    v-if="showCreator && isSuperadmin"
    class="text-on-ghost-subtle text-base"
  >
    ({{ item.createdByEmail }})
  </div>
</template>
