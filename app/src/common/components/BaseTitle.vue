<script setup lang="ts">
withDefaults(defineProps<{
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}>(), {
  level: 2
});
</script>

<template>
  <div class="flex items-center gap-1.5">
    <BaseHeading :level="level">
      <slot></slot>
    </BaseHeading>

    <slot name="info"></slot>
  </div>
</template>