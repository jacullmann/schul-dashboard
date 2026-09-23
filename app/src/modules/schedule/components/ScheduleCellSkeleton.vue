<script setup lang="ts">
import BaseSkeleton from '@/common/components/BaseSkeleton.vue';

defineProps<{
  gridColumn: number;
  gridRow: number;
  radius: 'md' | 'lg';
}>();
</script>

<template>
  <div class="animate-fade-up" :style="{ gridColumn, gridRow }">
    <BaseSkeleton
      width="full"
      height="full"
      :radius="radius"
      class="h-full min-h-[58px] min-[501px]:min-h-[54px]"
    />
  </div>
</template>
