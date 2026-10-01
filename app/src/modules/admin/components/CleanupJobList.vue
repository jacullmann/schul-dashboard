<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCleanupJobs } from '../composables/useCleanupJobs';

const I18N_BASE = 'admin.overview.cleanup_jobs';

const i18n = useI18n();
const { t } = i18n;
const { jobs, loading, failed, loadJobs } = useCleanupJobs();

// A job this build has no text for still shows, under its scheduled name.
function jobLabel(job: string): string {
  const key = `${I18N_BASE}.jobs.${job}.label`;
  return i18n.te(key) ? t(key) : job;
}

function jobRule(job: string): string {
  const key = `${I18N_BASE}.jobs.${job}.rule`;
  return i18n.te(key) ? t(key) : '';
}

onMounted(loadJobs);
</script>

<template>
  <section class="flex flex-col gap-3">
    <div class="flex flex-col gap-1">
      <h3>{{ t(`${I18N_BASE}.title`) }}</h3>
      <p class="text-sm text-on-ghost-muted">
        {{ t(`${I18N_BASE}.description`) }}
      </p>
    </div>

    <div v-if="loading" class="flex justify-center p-6">
      <BaseSpinner on="ghost" size="20px" />
    </div>
    <div
      v-else-if="failed"
      class="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-ghost-border bg-surface shadow-input"
    >
      <span class="text-sm text-danger">{{ t(`${I18N_BASE}.error`) }}</span>
      <BaseButton variant="ghost" @click="loadJobs">
        {{ t(`${I18N_BASE}.retry`) }}
      </BaseButton>
    </div>
    <ul
      v-else
      class="divide-y divide-ghost-border rounded-xl border border-ghost-border bg-surface shadow-input"
    >
      <li
        v-for="job in jobs"
        :key="job.job"
        class="flex items-center justify-between gap-4 px-4 py-3"
      >
        <div class="min-w-0">
          <div class="font-semibold">{{ jobLabel(job.job) }}</div>
          <div class="text-sm text-on-ghost-muted">{{ jobRule(job.job) }}</div>
        </div>
        <span
          class="shrink-0 text-sm font-semibold tabular-nums"
          :class="job.overdueCount > 0 ? 'text-warn' : 'text-success'"
        >
          {{
            job.overdueCount > 0
              ? t(`${I18N_BASE}.overdue`, { count: job.overdueCount })
              : t(`${I18N_BASE}.ok`)
          }}
        </span>
      </li>
    </ul>
  </section>
</template>
