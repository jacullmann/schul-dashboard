<script setup lang="ts">
import { Check } from '@lucide/vue'

const props = withDefaults(defineProps<{
  active?: boolean;
  isSelect?: boolean;
  variant?: 'default' | 'danger';
}>(), {
  variant: 'default',
})
</script>

<template>
  <div
      class="flex justify-between w-full text-left bg-transparent border-0 p-2 rounded-md cursor-pointer text-sub transition-hover user-select-none"
      :class="variant === 'danger' ? 'text-danger hover:bg-danger-surface' : 'text-on-surface hover:bg-surface-hover'"
  >
    <div class="flex items-center gap-2 leading-none">
      <slot />
    </div>
    
    <div v-if="isSelect">
      <Check v-if="active" :size="16" class="text-on-surface shrink-0" />
      <span v-else class="w-4 shrink-0 h-4"></span>
    </div>
  </div>
</template>