<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ChartCard from './ChartCard.vue';
import { averageOf } from '../utils/metricFormat';
import type { MetricPoint } from '../types';

export interface ChartSeries {
  label: string;
  points: MetricPoint[];
}

const props = defineProps<{
  title: string;
  /** Up to two series that share the time axis, e.g. received and sent. */
  series: ChartSeries[];
  /** The window in Unix seconds, so the axis spans it even where data is missing. */
  start: number;
  end: number;
  /** A fixed top of the scale, e.g. 200 % for two vCPUs, marked on the chart; scaled to the data otherwise. */
  max?: number;
  format: (value: number) => string;
}>();

const { t, locale } = useI18n();

const SERIES_COLORS = ['text-accent', 'text-on-ghost-muted'] as const;
// The SVG draws in its own coordinates and is stretched to the plot's size;
// strokes keep their width through `vector-effect`.
const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 100;
/** Room above the highest value on a data-scaled chart, so the line never grazes the top. */
const AUTO_SCALE_HEADROOM = 1.15;
const HOUR_SECONDS = 60 * 60;
const DAY_SECONDS = 24 * HOUR_SECONDS;
const CLOCK_TIME = { hour: '2-digit', minute: '2-digit' } as const;

const plotRef = ref<HTMLElement | null>(null);
const hoveredIndex = ref<number | null>(null);

const scaleMax = computed(() => {
  if (props.max) return props.max;
  let highest = 0;
  for (const { points } of props.series) {
    for (const [, value] of points) {
      if (value !== null && value > highest) highest = value;
    }
  }
  return highest > 0 ? highest * AUTO_SCALE_HEADROOM : 1;
});

const toX = (timestamp: number) =>
  ((timestamp - props.start) / (props.end - props.start)) * VIEW_WIDTH;
const toY = (value: number) =>
  VIEW_HEIGHT - Math.min(value / scaleMax.value, 1) * VIEW_HEIGHT;

/** The unbroken runs of a series; a gap ends one and the next value starts another. */
function segmentsOf(points: readonly MetricPoint[]) {
  const segments: [number, number][][] = [];
  let current: [number, number][] = [];
  for (const [timestamp, value] of points) {
    if (value === null) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push([toX(timestamp), toY(value)]);
    }
  }
  if (current.length) segments.push(current);
  return segments;
}

const coordinates = (run: [number, number][]) =>
  run.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L');

// Drawn in reverse so the first series, the one in the accent colour, stays on top.
const paths = computed(() =>
  props.series
    .map(({ points }, i) => {
      const segments = segmentsOf(points);
      return {
        color: SERIES_COLORS[i % SERIES_COLORS.length],
        line: segments.map((run) => `M${coordinates(run)}`).join(''),
        area: segments
          .map(
            (run) =>
              `M${run[0]![0].toFixed(1)},${VIEW_HEIGHT}L${coordinates(run)}` +
              `L${run.at(-1)![0].toFixed(1)},${VIEW_HEIGHT}Z`,
          )
          .join(''),
      };
    })
    .reverse(),
);

// Hetzner samples every series at the same instants, so the longest one
// carries the time axis the pointer snaps to, and an index into it finds the
// matching sample in every series.
const timeline = computed(() =>
  props.series
    .reduce<MetricPoint[]>(
      (longest, { points }) =>
        points.length > longest.length ? points : longest,
      [],
    )
    .map(([timestamp]) => timestamp),
);

function nearestIndex(timestamp: number) {
  const times = timeline.value;
  let low = 0;
  let high = times.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (times[mid]! < timestamp) low = mid + 1;
    else high = mid;
  }
  const previous = low - 1;
  return previous >= 0 && timestamp - times[previous]! < times[low]! - timestamp
    ? previous
    : low;
}

function onPointerMove(event: PointerEvent) {
  const plot = plotRef.value;
  if (!plot || !timeline.value.length) return;
  const { left, width } = plot.getBoundingClientRect();
  const fraction = Math.min(Math.max((event.clientX - left) / width, 0), 1);
  hoveredIndex.value = nearestIndex(
    props.start + fraction * (props.end - props.start),
  );
}

const hoveredTimestamp = computed(() =>
  hoveredIndex.value === null
    ? null
    : (timeline.value[hoveredIndex.value] ?? null),
);
const hoverLeft = computed(() =>
  hoveredTimestamp.value === null
    ? null
    : `${(toX(hoveredTimestamp.value) / VIEW_WIDTH) * 100}%`,
);

// Precise enough to tell the axis ends apart: a day's window starts and ends
// at the same clock time, a longer one needs no clock time at all.
const axisTime = computed(() => {
  const span = props.end - props.start;
  const options: Intl.DateTimeFormatOptions =
    span <= HOUR_SECONDS
      ? CLOCK_TIME
      : span <= DAY_SECONDS
        ? { weekday: 'short', ...CLOCK_TIME }
        : { day: '2-digit', month: 'short' };
  return new Intl.DateTimeFormat(locale.value, options);
});
const hoverTime = computed(() =>
  props.end - props.start <= DAY_SECONDS
    ? axisTime.value
    : new Intl.DateTimeFormat(locale.value, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        ...CLOCK_TIME,
      }),
);
const formatTime = (format: Intl.DateTimeFormat, timestamp: number) =>
  format.format(timestamp * 1000);

const readout = computed(() =>
  hoveredTimestamp.value === null
    ? t('admin.overview.server.average')
    : formatTime(hoverTime.value, hoveredTimestamp.value),
);

const formatOrDash = (value: number | null) =>
  value === null ? '–' : props.format(value);

const legend = computed(() =>
  props.series.map(({ label, points }, i) => {
    const hovered =
      hoveredIndex.value === null ? undefined : points[hoveredIndex.value];
    return {
      label,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
      value: formatOrDash(
        hovered ? hovered[1] : averageOf(points.map(([, value]) => value)),
      ),
      hoveredValue: hovered?.[1] ?? null,
    };
  }),
);
</script>

<template>
  <ChartCard :title="title" :readout="readout">
    <div
      ref="plotRef"
      class="relative h-24 border-b border-ghost-border touch-pan-y"
      :class="{ 'border-t border-dashed': max }"
      aria-hidden="true"
      @pointermove="onPointerMove"
      @pointerdown="onPointerMove"
      @pointerleave="hoveredIndex = null"
    >
      <svg
        class="absolute inset-0 size-full overflow-visible"
        :viewBox="`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`"
        preserveAspectRatio="none"
      >
        <g v-for="path in paths" :key="path.color" :class="path.color">
          <path :d="path.area" class="fill-current/10" />
          <path
            :d="path.line"
            class="fill-none stroke-current stroke-[1.5]"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </g>
      </svg>

      <span
        v-if="max"
        class="absolute top-0.5 left-0 text-2xs text-on-ghost-subtle"
      >
        {{ format(max) }}
      </span>

      <template v-if="hoverLeft !== null">
        <div
          class="absolute inset-y-0 w-px bg-ghost-border"
          :style="{ left: hoverLeft }"
        />
        <template v-for="item in legend" :key="item.label">
          <div
            v-if="item.hoveredValue !== null"
            class="absolute size-2 -translate-1/2 rounded-full bg-current"
            :class="item.color"
            :style="{
              left: hoverLeft,
              top: `${(toY(item.hoveredValue) / VIEW_HEIGHT) * 100}%`,
            }"
          />
        </template>
      </template>
    </div>

    <div class="flex justify-between text-xs text-on-ghost-muted mt-1">
      <span>{{ formatTime(axisTime, start) }}</span>
      <span>{{ formatTime(axisTime, end) }}</span>
    </div>

    <ul class="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
      <li
        v-for="item in legend"
        :key="item.label"
        class="flex items-center gap-1.5"
      >
        <span
          class="size-2 rounded-full bg-current"
          :class="item.color"
          aria-hidden="true"
        />
        <span class="text-on-ghost-muted">{{ item.label }}</span>
        <span class="font-medium tabular-nums">{{ item.value }}</span>
      </li>
    </ul>
  </ChartCard>
</template>
