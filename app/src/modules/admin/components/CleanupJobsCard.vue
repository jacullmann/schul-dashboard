<script setup lang="ts">
import { computed, onMounted, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCleanupJobs } from '../composables/useCleanupJobs';

const I18N_BASE = 'admin.overview.cleanup_jobs';

const i18n = useI18n();
const { t } = i18n;
const { jobs, loading, failed, loadJobs } = useCleanupJobs();
const titleId = useId();

function optionalText(key: string): string | undefined {
  return i18n.te(key) ? t(key) : undefined;
}

// A job this build has no text for still shows, under its scheduled name.
const rows = computed(() =>
  jobs.value.map(({ job, overdueCount }) => ({
    job,
    overdueCount,
    label: optionalText(`${I18N_BASE}.jobs.${job}.label`) ?? job,
    rule: optionalText(`${I18N_BASE}.jobs.${job}.rule`),
  })),
);

const overdueJobCount = computed(
  () => rows.value.filter((row) => row.overdueCount > 0).length,
);

onMounted(loadJobs);
</script>

<template>
  <section
    class="flex flex-col min-h-0 rounded-xl border border-ghost-border bg-surface shadow-input p-4"
    :aria-labelledby="titleId"
  >
    <header class="flex items-baseline justify-between gap-2">
      <h4 :id="titleId">{{ t(`${I18N_BASE}.title`) }}</h4>
      <span
        v-if="!loading && !failed && rows.length"
        class="shrink-0 text-sm font-semibold"
        :class="overdueJobCount ? 'text-warn' : 'text-success'"
      >
        {{
          overdueJobCount
            ? t(`${I18N_BASE}.jobs_overdue`, { count: overdueJobCount })
            : t(`${I18N_BASE}.all_ok`)
        }}
      </span>
    </header>

    <div v-if="loading" class="flex flex-1 items-center justify-center p-4">
      <BaseSpinner on="ghost" size="20px" />
    </div>
    <div
      v-else-if="failed"
      class="flex flex-1 flex-col items-center justify-center gap-2 p-4"
    >
      <span class="text-sm text-danger">{{ t(`${I18N_BASE}.error`) }}</span>
      <BaseButton variant="ghost" @click="loadJobs">
        {{ t(`${I18N_BASE}.retry`) }}
      </BaseButton>
    </div>
    <div v-else class="flex-1 min-h-0 overflow-y-auto mt-2">
      <ul class="divide-y divide-ghost-border">
        <li
          v-for="row in rows"
          :key="row.job"
          class="flex items-baseline justify-between gap-3 py-1 text-sm"
        >
          <span class="min-w-0 truncate" :title="row.rule">
            <span class="font-semibold">{{ row.label }}</span>
            <span v-if="row.rule" class="text-on-ghost-muted">
              · {{ row.rule }}</span
            >
          </span>
          <span
            class="shrink-0 font-semibold tabular-nums"
            :class="row.overdueCount > 0 ? 'text-warn' : 'text-success'"
          >
            {{
              row.overdueCount > 0
                ? t(`${I18N_BASE}.overdue`, { count: row.overdueCount })
                : t(`${I18N_BASE}.ok`)
            }}
          </span>
        </li>
      </ul>
      <div class="text-xs text-on-ghost-muted mt-2">
        {{ t(`${I18N_BASE}.description`) }}
      </div>
    </div>
  </section>
</template>
