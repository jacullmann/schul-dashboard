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
  <BaseSkeleton
    width="full"
    height="full"
    radius="md"
    :style="{
      gridColumn: `${col + 1} / span 1`,
      gridRow: `${row + 1} / span 1`,
    }"
  />
</template>
