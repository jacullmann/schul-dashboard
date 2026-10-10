<script setup lang="ts">
import { useLogFormat } from '../composables/useLogFormat';

defineProps<{
  label: string;
  at: string;
}>();

const { time } = useLogFormat();
</script>

<template>
  <div class="flex items-baseline justify-between gap-3">
    <span class="min-w-0 font-semibold break-words">
      {{ label }}
      <slot />
    </span>
    <time
      :datetime="at"
      class="shrink-0 text-xs text-on-ghost-muted tabular-nums"
      >{{ time(at) }}</time
    >
  </div>
</template>
