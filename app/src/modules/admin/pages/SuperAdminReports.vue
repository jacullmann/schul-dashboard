<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import ReportCard from '../components/ReportCard.vue';
import { useSuperAdminReports } from '../composables/useSuperAdminReports';

const { reports, loadingReports, loadReports, deleteReport } =
  useSuperAdminReports();
const { t } = useI18n();

onMounted(loadReports);
</script>

<template>
  <PageHeader>
    {{ t('admin.reports.title') }}
    <template v-if="reports.length" #info>
      <span
        class="text-on-ghost-muted bg-ghost-hover rounded-full text-sm font-semibold px-2.5 py-0.5"
        >{{ reports.length }}</span
      >
    </template>
  </PageHeader>

  <div v-if="loadingReports" class="flex justify-center p-10">
    <BaseSpinner on="ghost" size="24px" />
  </div>
  <div v-else-if="!reports.length" class="text-center text-on-ghost-muted p-10">
    {{ t('admin.reports.empty') }}
  </div>
  <div
    v-else
    class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-x-8 gap-y-16"
  >
    <ReportCard
      v-for="r in reports"
      :key="r.id"
      :report="r"
      @delete="deleteReport"
    />
  </div>
</template>
