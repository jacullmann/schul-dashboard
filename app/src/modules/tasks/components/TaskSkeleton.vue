<script setup lang="ts">
import { entranceDelay } from '@/modules/tasks/utils/entrance';

withDefaults(
  defineProps<{
    count?: number;
    /** Where the first card falls in the page's entrance order. */
    entranceOrder?: number;
  }>(),
  {
    count: 5,
    entranceOrder: 0,
  },
);
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- A card still waiting for its entrance stays hidden while the skeleton leaves. -->
    <div
      v-for="n in count"
      :key="n"
      class="animate-enter in-[.skeleton-leaving]:[animation-play-state:paused]"
      :style="{ '--enter-delay': entranceDelay(entranceOrder + n - 1) }"
    >
      <!-- As tall as a card with its title and details. -->
      <div class="h-17 rounded-xl bg-surface-highlight animate-pulse"></div>
    </div>
  </div>
</template>
