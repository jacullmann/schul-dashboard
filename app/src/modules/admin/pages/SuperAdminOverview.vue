<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import DailyBarChart, {
  type DailySummary,
} from '../components/DailyBarChart.vue';
import CleanupJobList from '../components/CleanupJobList.vue';
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
        { key: 'users', value: stats.value.userCount },
        { key: 'active_week', value: stats.value.activeUsersThisWeek },
        { key: 'tasks', value: stats.value.itemCount },
        {
          key: 'banned',
          value: stats.value.bannedCount,
          warn: stats.value.bannedCount > 0,
        },
      ]
    : [],
);

const userStats = computed(() =>
  stats.value
    ? [
        { key: 'verified', value: stats.value.verifiedUsers },
        { key: 'unverified', value: stats.value.unverifiedUsers },
        { key: 'admins', value: stats.value.adminCount },
        { key: 'new_users_week', value: stats.value.newUsersThisWeek },
        { key: 'new_tasks_week', value: stats.value.newItemsThisWeek },
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
    <div class="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
      <div
        v-for="s in headlineStats"
        :key="s.key"
        class="stat-card"
        :class="{ 'border-warn!': s.warn }"
      >
        <div class="text-2xl font-bold leading-none tabular-nums">
          {{ s.value }}
        </div>
        <div class="text-sm text-on-ghost-muted mt-1">
          {{ t(`admin.overview.stats.${s.key}`) }}
        </div>
      </div>
    </div>

    <section class="flex flex-col gap-3">
      <h3>{{ t('admin.overview.details_title') }}</h3>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2.5">
        <div v-for="s in userStats" :key="s.key" class="stat-card p-3!">
          <div class="text-lg font-bold tabular-nums">{{ s.value }}</div>
          <div class="text-sm text-on-ghost-muted">
            {{ t(`admin.overview.stats.${s.key}`) }}
          </div>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h3>{{ t('admin.overview.chart.title') }}</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <DailyBarChart
          v-for="chart in charts"
          :key="chart.metric"
          :title="t(`admin.overview.chart.${chart.i18nKey}`)"
          :points="chart.points"
          :summary="chart.summary"
        />
      </div>
    </section>

    <CleanupJobList />
  </div>
</template>

<style scoped>
.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-ghost-border);
  box-shadow: var(--shadow-input);
  border-radius: 12px;
  padding: 18px 16px;
  text-align: center;
}
</style>
