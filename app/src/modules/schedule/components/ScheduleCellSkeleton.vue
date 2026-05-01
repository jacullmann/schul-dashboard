<script setup lang="ts">
import BaseSkeleton from '@/common/components/BaseSkeleton.vue';

defineProps<{
  /** Column index (1–5) so the skeleton is placed in the correct day column. */
  col: number;
  /** Row index (1–7) so the skeleton sits in the correct time-slot row. */
  row: number;
}>();
</script>

<template>
  <div
    class="max-[500px]:![grid-column:var(--col-mobile)] animate-fade-up"
    :style="{
      '--col-desktop': `${col + 1} / span 1`,
      '--col-mobile': `${col} / span 1`,
      gridColumn: 'var(--col-desktop)',
      gridRow: `${row + 1} / span 1`,
      animationDelay: `${(col + row) * 0.05}s`,
      animationFillMode: 'both',
    }"
  >
    <BaseSkeleton
      width="full"
      height="full"
      radius="md"
      class="h-full min-h-[35px]"
    />
  </div>
</template>
