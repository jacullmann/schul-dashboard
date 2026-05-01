<script setup lang="ts">
import BaseSkeleton from '@/common/components/BaseSkeleton.vue';

withDefaults(
  defineProps<{
    count?: number;
    imageCount?: number;
  }>(),
  {
    count: 5,
    imageCount: 2,
  },
);
</script>

<template>
  <div class="flex flex-col gap-9 p-3">
    <div
      v-for="n in count"
      :key="n"
      class="animate-fade-up"
      :style="{
        animationDelay: `${(n + 2) * 0.05}s`,
        animationFillMode: 'both',
      }"
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
