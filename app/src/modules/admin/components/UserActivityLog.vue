<script setup lang="ts">
import { computed } from 'vue';
import type { SuperAdminUserActivity } from '../types';
import { useLogFormat } from '../composables/useLogFormat';
import AdminLogTimeline from './AdminLogTimeline.vue';
import AdminLogEntryHeader from './AdminLogEntryHeader.vue';
import AdminLogFields from './AdminLogFields.vue';

const props = defineProps<{
  activity: SuperAdminUserActivity[];
}>();

const { activityLabel, fields } = useLogFormat();

// Formatted once per load rather than on every render of the list.
const entries = computed(() =>
  props.activity.map((entry) => ({
    at: entry.at,
    label: activityLabel(entry.type),
    fields: fields(entry.meta),
  })),
);
</script>

<template>
  <AdminLogTimeline
    v-slot="{ entry }"
    :entries="entries"
    :date-of="(entry) => entry.at"
  >
    <AdminLogEntryHeader :label="entry.label" :at="entry.at" />
    <AdminLogFields :fields="entry.fields" />
  </AdminLogTimeline>
</template>
