<script setup lang="ts">
import { computed } from 'vue';
import type { ScheduleLayout } from '@/modules/schedule/types';
import type { ScheduleDayPager } from '@/modules/schedule/composables/useScheduleDayPager';
import { useIsPhoneViewport } from '@/common/composables/useViewport';
import { useScheduleDisplay } from '@/modules/schedule/composables/useScheduleDisplay';

import BaseTableWrapper from '@/common/components/BaseTableWrapper.vue';
import ScheduleDayTrack from './ScheduleDayTrack.vue';
import ScheduleStartTimeColumn from './ScheduleStartTimeColumn.vue';
import ScheduleDayHeader from './ScheduleDayHeader.vue';

const props = withDefaults(
  defineProps<{
    pager: ScheduleDayPager;
    /** The whole week side by side, sharing its rows. */
    layout: ScheduleLayout;
    /** A day on its own, as a phone shows it; the week's rows by default. */
    dayLayout?: (day: number) => ScheduleLayout;
    /** The rows a phone labels for a day; every row by default. */
    labelledRows?: (day: number) => ReadonlySet<number> | undefined;
    /** A template for every week carries no date, so the short weekday by default. */
    tabLabel?: (day: number) => string;
    tabCaption?: (day: number) => string;
    /** The heading above a phone's single day; the weekday by default. */
    dayHeading?: (day: number) => string;
    /** The heading above each day of the week side by side; the weekday by default. */
    columnHeading?: (day: number) => readonly Intl.DateTimeFormatPart[];
    panelKey?: (dayIndex: number) => PropertyKey;
    currentDay?: number | null;
    clickableDays?: boolean;
    animated?: boolean;
    bleedClass?: string;
  }>(),
  {
    dayLayout: undefined,
    labelledRows: undefined,
    tabLabel: undefined,
    tabCaption: undefined,
    dayHeading: undefined,
    columnHeading: undefined,
    panelKey: undefined,
    currentDay: null,
    clickableDays: false,
    animated: true,
    bleedClass: undefined,
  },
);

const emit = defineEmits<{
  (e: 'select-day', day: number, event: MouseEvent): void;
}>();

defineSlots<{
  /** A day's cells, placed in its column on the given layout. */
  default(slotProps: {
    day: number;
    column: number;
    layout: ScheduleLayout;
    animated: boolean;
  }): unknown;
}>();

const { days, formatDayName } = useScheduleDisplay();
const isPhone = useIsPhoneViewport();

// The parent creates the pager once and never swaps it.
const { hasPaged } = props.pager;

// A day paged to slides in whole instead of replaying the entrance.
const phoneAnimated = computed(() => props.animated && !hasPaged.value);

const tabLabelOf = (day: number) =>
  props.tabLabel?.(day) ?? formatDayName(day, 'short');

const phonePanelOf = (day: number) => {
  const layout = props.dayLayout?.(day) ?? props.layout;
  return { layout, gridStyle: layout.gridStyle };
};

function onDayClick(day: number, event: MouseEvent) {
  if (props.clickableDays) emit('select-day', day, event);
}
</script>

<template>
  <ScheduleDayTrack
    v-if="isPhone"
    :pager="pager"
    :days="days"
    :tab-label="tabLabelOf"
    :tab-caption="tabCaption"
    :panel-of="phonePanelOf"
    :panel-key="panelKey"
    :current-day="currentDay"
    :animated="animated"
    :bleed-class="bleedClass"
  >
    <template #default="{ day, panel }">
      <ScheduleStartTimeColumn
        :rows="panel.layout.rows"
        :labelled-rows="labelledRows?.(day)"
        :animated="phoneAnimated"
      />

      <ScheduleDayHeader
        :key="day"
        :grid-column="2"
        standalone
        :label="dayHeading?.(day) ?? formatDayName(day)"
        :is-current="day === currentDay"
        :is-clickable="clickableDays"
        :animated="phoneAnimated"
        @click.stop="onDayClick(day, $event)"
      />

      <slot
        :day="day"
        :column="2"
        :layout="panel.layout"
        :animated="phoneAnimated"
      />
    </template>
  </ScheduleDayTrack>

  <BaseTableWrapper v-else>
    <div
      class="grid grid-cols-[2.5rem_repeat(5,minmax(9rem,1fr))] gap-2 items-stretch"
      :style="layout.gridStyle"
    >
      <ScheduleStartTimeColumn :rows="layout.rows" :animated="animated" />

      <template v-for="(day, dayIndex) in days" :key="day">
        <ScheduleDayHeader
          :grid-column="dayIndex + 2"
          :label="columnHeading?.(day) ?? formatDayName(day)"
          :is-current="day === currentDay"
          :is-clickable="clickableDays"
          :animated="animated"
          @click.stop="onDayClick(day, $event)"
        />

        <slot
          :day="day"
          :column="dayIndex + 2"
          :layout="layout"
          :animated="animated"
        />
      </template>
    </div>
  </BaseTableWrapper>
</template>
