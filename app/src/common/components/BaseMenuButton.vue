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
  <button
      type="button"
      class="flex justify-between items-center w-full text-left bg-transparent border-0 p-2 rounded-md cursor-pointer text-sub transition-hover user-select-none"
      :class="[
        variant === 'danger' ? 'text-danger hover:bg-danger-surface' : 'text-on-surface hover:bg-surface-hover',
        { 'font-semibold': active }
      ]"
      :role="isSelect ? 'menuitemradio' : 'menuitem'"
      :aria-checked="isSelect ? active : undefined"
  >
    <span class="flex items-center gap-2 leading-none">
      <slot />
    </span>

    <span v-if="isSelect" aria-hidden="true">
      <Check v-if="active" :size="16" class="text-on-surface shrink-0" />
      <span v-else class="w-4 shrink-0 h-4"></span>
    </span>
  </button>
</template>
