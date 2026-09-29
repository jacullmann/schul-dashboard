<script setup lang="ts">
import { useTasks } from '@/modules/tasks/composables/useTasks';
import ReportModal from './ReportModal.vue';
import TaskInfoModal from './TaskInfoModal.vue';

const {
  user,
  infoItem,
  showReportConfirm,
  reportReason,
  doReport,
  cancelReport,
} = useTasks();
</script>

<!-- The dialogs a task card's menu opens, for the page that owns the tasks. -->
<template>
  <ReportModal
    v-model:reason="reportReason"
    :open="showReportConfirm"
    message=""
    :show-reason-input="true"
    @confirm="doReport"
    @cancel="cancelReport"
  />

  <TaskInfoModal
    :open="!!infoItem"
    :item="infoItem"
    :is-super-admin="user?.role === 'superadmin'"
    @cancel="infoItem = null"
  />
</template>
