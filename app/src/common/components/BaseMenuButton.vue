<script setup lang="ts">
import { ref } from 'vue';
import { Check } from '@lucide/vue';
import type { Component } from 'vue';

withDefaults(
  defineProps<{
    active?: boolean;
    isSelect?: boolean;
    isToggle?: boolean;
    variant?: 'default' | 'danger';
    icon?: Component;
  }>(),
  {
    variant: 'default',
    isSelect: false,
    isToggle: false,
  },
);

const buttonEl = ref<HTMLButtonElement | null>(null);

defineExpose({
  focus: () => buttonEl.value?.focus(),
});
</script>

<template>
  <button
    ref="buttonEl"
    type="button"
    class="flex justify-between items-center w-full text-left bg-transparent border-0 p-2 gap-4 rounded-lg cursor-pointer text-sub transition-hover user-select-none"
    :class="[
      variant === 'danger'
        ? 'text-danger hover:bg-danger-surface'
        : 'text-on-surface hover:bg-surface-hover',
      { 'font-semibold': active },
    ]"
    :role="isSelect ? 'menuitemradio' : 'menuitem'"
    :aria-checked="isSelect ? active : undefined"
  >
    <span class="flex items-center gap-2 leading-none">
      <component :is="icon" v-if="icon" :size="16" class="shrink-0" />
      <slot></slot>
    </span>

    <span v-if="isSelect" aria-hidden="true">
      <Check v-if="active" :size="16" class="text-on-surface shrink-0" />
      <span v-else class="w-4 shrink-0 h-4"></span>
    </span>

    <span v-if="isToggle">
      <BaseToggle :modelValue="active" />
    </span>
  </button>
</template>
