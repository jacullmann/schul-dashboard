<script setup lang="ts" generic="T">
import { computed } from 'vue';
import { groupByDay } from '../utils/logFormat';
import { useLogFormat } from '../composables/useLogFormat';

const props = defineProps<{
  /** Newest first, as the logs are served. */
  entries: readonly T[];
  dateOf: (entry: T) => string;
  /** A stable key per entry; entries without one are keyed by position. */
  keyOf?: (entry: T) => string;
}>();

defineSlots<{
  default(props: { entry: T }): unknown;
}>();

const { dayLabel } = useLogFormat();

const days = computed(() =>
  groupByDay(props.entries, props.dateOf).map((day) => ({
    ...day,
    label: dayLabel(day.date),
  })),
);
</script>

<template>
  <div class="flex flex-col gap-5">
    <section
      v-for="day in days"
      :key="day.key"
      class="flex flex-col gap-1.5"
      :aria-label="day.label"
    >
      <h4 class="text-sm font-semibold text-on-ghost-muted">
        <time :datetime="day.key">{{ day.label }}</time>
      </h4>
      <ol
        class="m-0 p-0 list-none rounded-xl border border-ghost-border bg-surface shadow-input divide-y divide-ghost-border"
      >
        <li
          v-for="(entry, index) in day.entries"
          :key="keyOf ? keyOf(entry) : index"
          class="px-4 py-3"
        >
          <slot :entry="entry" />
        </li>
      </ol>
    </section>
  </div>
</template>
