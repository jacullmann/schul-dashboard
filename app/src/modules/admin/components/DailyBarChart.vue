<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

export interface DailyPoint {
  day: string;
  value: number;
}

const props = defineProps<{
  title: string;
  points: DailyPoint[];
}>();

const { t, locale } = useI18n();

const hoveredIndex = ref<number | null>(null);
const maxValue = computed(() =>
  Math.max(1, ...props.points.map((p) => p.value)),
);
const total = computed(() => props.points.reduce((sum, p) => sum + p.value, 0));

// `day` is a calendar date without a time zone; parsing it as UTC and
// formatting in UTC keeps it from shifting a day in western time zones.
function formatDay(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(locale.value, {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
}

const readout = computed(() => {
  const point =
    hoveredIndex.value === null ? null : props.points[hoveredIndex.value];
  return point
    ? `${formatDay(point.day)}: ${point.value}`
    : t('admin.overview.chart.total', { count: total.value });
});
</script>

<template>
  <figure
    class="m-0 rounded-xl border border-ghost-border bg-surface shadow-input p-4"
  >
    <figcaption class="flex items-baseline justify-between gap-2 mb-3">
      <span class="font-semibold">{{ title }}</span>
      <span class="text-sm text-on-ghost-muted tabular-nums" aria-live="polite">
        {{ readout }}
      </span>
    </figcaption>

    <div
      class="flex items-end gap-0.5 h-24 border-b border-ghost-border"
      aria-hidden="true"
      @mouseleave="hoveredIndex = null"
    >
      <div
        v-for="(point, i) in points"
        :key="point.day"
        class="flex-1 h-full flex items-end"
        @mouseenter="hoveredIndex = i"
      >
        <div
          class="w-full rounded-t bg-accent transition-opacity"
          :class="
            hoveredIndex === null || hoveredIndex === i
              ? 'opacity-100'
              : 'opacity-40'
          "
          :style="{
            height: point.value ? `${(point.value / maxValue) * 100}%` : '1px',
          }"
        />
      </div>
    </div>

    <div class="flex justify-between text-xs text-on-ghost-muted mt-1">
      <span>{{ points.length ? formatDay(points[0]!.day) : '' }}</span>
      <span>{{ points.length ? formatDay(points.at(-1)!.day) : '' }}</span>
    </div>

    <table class="sr-only">
      <caption>
        {{
          title
        }}
      </caption>
      <tbody>
        <tr v-for="point in points" :key="point.day">
          <th scope="row">{{ formatDay(point.day) }}</th>
          <td>{{ point.value }}</td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>
