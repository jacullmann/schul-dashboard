<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import TimeSeriesChart, { type ChartSeries } from './TimeSeriesChart.vue';
import {
  METRICS_RANGES,
  isMetricsRange,
  useServerMetrics,
} from '../composables/useServerMetrics';
import { formatByteRate, formatPercent } from '../utils/metricFormat';

const I18N_BASE = 'admin.overview.server';

interface MetricChart {
  key: string;
  title: string;
  series: ChartSeries[];
  max?: number;
  format: (value: number) => string;
}

const { t, locale } = useI18n();
const { range, metrics, loading, failure, setRange, load } = useServerMetrics();

const rangeItems = computed(() =>
  METRICS_RANGES.map((id) => ({ id, label: t(`${I18N_BASE}.ranges.${id}`) })),
);

function onRangeChange(id: string) {
  if (isMetricsRange(id)) void setRange(id);
}

const formatRate = (value: number) => formatByteRate(value, locale.value);
const formatIops = (value: number) =>
  t(`${I18N_BASE}.iops_value`, {
    value: value.toLocaleString(locale.value, { maximumFractionDigits: 1 }),
  });

const charts = computed<MetricChart[]>(() => {
  const m = metrics.value;
  if (!m) return [];

  return [
    {
      key: 'cpu',
      title: t(`${I18N_BASE}.cpu`),
      series: [{ label: t(`${I18N_BASE}.usage`), points: m.cpu }],
      max: m.cpuCores * 100,
      format: (value) => formatPercent(value, locale.value),
    },
    {
      key: 'network',
      title: t(`${I18N_BASE}.network`),
      series: [
        { label: t(`${I18N_BASE}.received`), points: m.networkIn },
        { label: t(`${I18N_BASE}.sent`), points: m.networkOut },
      ],
      format: formatRate,
    },
    {
      key: 'disk-bandwidth',
      title: t(`${I18N_BASE}.disk_bandwidth`),
      series: [
        { label: t(`${I18N_BASE}.read`), points: m.diskReadBandwidth },
        { label: t(`${I18N_BASE}.write`), points: m.diskWriteBandwidth },
      ],
      format: formatRate,
    },
    {
      key: 'disk-iops',
      title: t(`${I18N_BASE}.disk_iops`),
      series: [
        { label: t(`${I18N_BASE}.read`), points: m.diskReadIops },
        { label: t(`${I18N_BASE}.write`), points: m.diskWriteIops },
      ],
      format: formatIops,
    },
  ];
});
</script>

<template>
  <section class="flex flex-col gap-3">
    <h3>{{ t(`${I18N_BASE}.title`) }}</h3>
    <BaseTabs :items="rangeItems" :active-id="range" @change="onRangeChange" />

    <div
      v-if="failure"
      class="flex flex-col items-center gap-2 rounded-xl border border-ghost-border bg-surface p-6 text-center text-sm text-on-ghost-muted"
      role="alert"
    >
      {{ t(`${I18N_BASE}.errors.${failure}`) }}
      <BaseButton variant="ghost" @click="load">
        {{ t(`${I18N_BASE}.retry`) }}
      </BaseButton>
    </div>
    <div v-else-if="!metrics" class="flex justify-center p-10">
      <BaseSpinner on="ghost" size="24px" />
    </div>
    <div
      v-else
      class="flex flex-col gap-3 transition-opacity"
      :class="{ 'opacity-60': loading }"
      :aria-busy="loading"
    >
      <TimeSeriesChart
        v-for="chart in charts"
        :key="chart.key"
        :title="chart.title"
        :series="chart.series"
        :start="metrics.start"
        :end="metrics.end"
        :max="chart.max"
        :format="chart.format"
      />
    </div>
  </section>
</template>
