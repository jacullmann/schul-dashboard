<script setup lang="ts">
import BaseSkeleton from '@/common/components/BaseSkeleton.vue';
import { useWindowSize } from '@vueuse/core';

const { width: windowWidth } = useWindowSize();

defineProps<{
  col: number;
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
    }"
  >
    <BaseSkeleton
      width="full"
      height="full"
      :radius="windowWidth < 501 ? 'lg' : 'md'"
      class="h-full min-h-[58px] min-[501px]:min-h-[54px]"
    />
  </div>
</template>
