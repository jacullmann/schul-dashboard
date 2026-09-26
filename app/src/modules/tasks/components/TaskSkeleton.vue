<script setup lang="ts">
import BaseSkeleton from '@/common/components/BaseSkeleton.vue';
import { entranceDelay } from '@/modules/tasks/utils/entrance';

withDefaults(
  defineProps<{
    count?: number;
    imageCount?: number;
    /** Where the first card falls in the page's entrance order. */
    entranceOrder?: number;
  }>(),
  {
    count: 5,
    imageCount: 2,
    entranceOrder: 0,
  },
);
</script>

<template>
  <div class="flex flex-col gap-9 p-3">
    <!-- A card still waiting for its entrance stays hidden while the skeleton leaves. -->
    <div
      v-for="n in count"
      :key="n"
      class="animate-enter in-[.skeleton-leaving]:[animation-play-state:paused]"
      :style="{ '--enter-delay': entranceDelay(entranceOrder + n - 1) }"
    >
      <BaseSkeleton width="60" height="20px" class="mb-3" />

      <BaseSkeleton width="40" height="16px" class="mb-3" />

      <BaseSkeleton width="full" height="16px" class="mb-2" />
      <BaseSkeleton width="full" height="16px" class="mb-2" />
      <BaseSkeleton width="[70%]" height="16px" class="mb-2" />

      <div class="mt-2 flex gap-2">
        <BaseSkeleton
          v-for="img in imageCount"
          :key="img"
          width="[calc(max(50%-4px, 250px))]"
          height="[calc(max(50%-4px, 250px))]"
          radius="lg"
          class="aspect-square"
        />
      </div>
    </div>
  </div>
</template>
