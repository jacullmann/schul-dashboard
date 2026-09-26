<script setup lang="ts">
import BaseSkeleton from '@/common/components/BaseSkeleton.vue';
import { entranceDelay, REVEAL_PACE } from '@/modules/schedule/utils/entrance';

defineProps<{
  gridColumn: number;
  /** The row the entrance wave times this cell by. */
  gridRow: number;
  /** Placed in the row the grid names for this slot, see --slot-N-row. */
  slotNumber: number;
  radius: 'md' | 'lg';
}>();
</script>

<template>
  <div
    :style="{
      gridColumn,
      gridRow: `var(--slot-${slotNumber}-row, ${gridRow})`,
      transitionDelay: entranceDelay(gridColumn, gridRow, REVEAL_PACE),
    }"
  >
    <!--
      This box fades out when the lessons arrive, delayed like the lesson that
      takes its place, so each cell crossfades rather than blinking empty.
      A skeleton still waiting for its entrance stays hidden while it leaves.
    -->
    <div
      class="h-full animate-enter in-[.skeleton-leaving]:[animation-play-state:paused]"
      :style="{ '--enter-delay': entranceDelay(gridColumn, gridRow) }"
    >
      <BaseSkeleton
        width="full"
        height="full"
        :radius="radius"
        class="h-full min-h-[58px] min-[501px]:min-h-[54px]"
      />
    </div>
  </div>
</template>
