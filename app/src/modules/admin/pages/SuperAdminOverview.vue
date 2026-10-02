<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ArrowUp } from '@lucide/vue';
import DailyBarChart, {
  type DailySummary,
} from '../components/DailyBarChart.vue';
import CleanupJobsCard from '../components/CleanupJobsCard.vue';
import { useSuperAdminStats } from '../composables/useSuperAdminStats';
import type { DailyMetric } from '../types';

interface DailyChart {
  metric: DailyMetric;
  i18nKey: string;
  summary?: DailySummary;
}

const { stats, dailyActivity, loadingStats, loadDailyActivity } =
  useSuperAdminStats();
const { t } = useI18n();

const headlineStats = computed(() =>
  stats.value
    ? [
        {
          key: 'users',
          value: stats.value.userCount,
          increase: stats.value.newUsersThisWeek,
        },
        {
          key: 'tasks',
          value: stats.value.itemCount,
          increase: stats.value.newItemsThisWeek,
        },
      ]
    : [],
);

// Paired for the two-column grid: usage, growth, then content and security.
const dailyCharts: readonly DailyChart[] = [
  { metric: 'appOpens', i18nKey: 'app_opens' },
  { metric: 'activeUsers', i18nKey: 'active_users', summary: 'average' },
  { metric: 'newUsers', i18nKey: 'new_users' },
  { metric: 'newGroups', i18nKey: 'new_groups' },
  { metric: 'newItems', i18nKey: 'new_tasks' },
  { metric: 'failedLogins', i18nKey: 'failed_logins' },
];

// The cleanup card spans two grid rows, so the last two charts stack beside it.
const CLEANUP_CARD_SLOT = dailyCharts.length - 2;

const charts = computed(() =>
  dailyCharts.map((chart) => ({
    ...chart,
    points: dailyActivity.value.map((d) => ({
      day: d.day,
      value: d[chart.metric],
    })),
  })),
);

// The stats themselves are loaded once by the dashboard shell.
onMounted(loadDailyActivity);
</script>

<template>
  <PageHeader>{{ t('admin.overview.title') }}</PageHeader>

  <div v-if="loadingStats && !stats" class="flex justify-center p-10">
    <BaseSpinner on="ghost" size="24px" />
  </div>
  <div v-else-if="stats" class="flex flex-col gap-7">
    <div class="grid max-md:grid-rows-2 md:grid-cols-2 px-4 gap-8">
      <div v-for="s in headlineStats" :key="s.key">
        <div class="text-base font-medium text-on-ghost-muted">
          {{ t(`admin.overview.stats.${s.key}`) }}
        </div>
        <div class="flex items-start gap-2 mt-1">
          <div class="text-3xl font-bold leading-none tabular-nums">
            {{ s.value }}
          </div>
          <div class="flex items-center text-base/5">
            <ArrowUp
              :class="s.increase > 0 ? 'text-success' : 'text-on-ghost-muted'"
              :size="20"
            />
            <span class="font-bold ml-0.5">{{ s.increase }}</span>
            <span class="text-on-ghost-muted ml-1">{{
              t('admin.overview.stats.last_week')
            }}</span>
          </div>
        </div>

        <div v-if="s.key === 'users'" class="flex mt-4">
          <div class="flex flex-1 flex-col">
            <span class="text-on-ghost-muted text-sm leading-none">{{
              t('admin.overview.stats.verified')
            }}</span>

            <span class="font-bold tabular-nums">{{
              stats.verifiedUsers
            }}</span>
          </div>
          <div class="border-r border-ghost-border mx-4"></div>
          <div class="flex flex-1 flex-col">
            <span class="text-on-ghost-muted text-sm leading-none">{{
              t('admin.overview.stats.banned')
            }}</span>
            <span class="font-bold tabular-nums">{{ stats.bannedCount }}</span>
          </div>
          <div class="border-r border-ghost-border mx-4"></div>
          <div class="flex flex-1 flex-col">
            <span class="text-on-ghost-muted text-sm leading-none">{{
              t('admin.overview.stats.active_week')
            }}</span>
            <span class="font-bold tabular-nums">{{
              stats.activeUsersThisWeek
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <section class="flex flex-col gap-3">
      <h3>{{ t('admin.overview.chart.title') }}</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <template v-for="(chart, i) in charts" :key="chart.metric">
          <!-- Out of flow on wide screens so the job list scrolls within
               the two chart rows instead of stretching them. -->
          <div v-if="i === CLEANUP_CARD_SLOT" class="md:relative md:row-span-2">
            <CleanupJobsCard class="md:absolute md:inset-0" />
          </div>
          <DailyBarChart
            :title="t(`admin.overview.chart.${chart.i18nKey}`)"
            :points="chart.points"
            :summary="chart.summary"
          />
        </template>
      </div>
    </section>
  </div>
</template>
