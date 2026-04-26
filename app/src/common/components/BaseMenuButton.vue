<script setup lang="ts">
import { ref } from 'vue';
import { Check, ChevronDown } from '@lucide/vue';
import type { Component } from 'vue';

withDefaults(
  defineProps<{
    active?: boolean;
    isSelect?: boolean;
    isToggle?: boolean;
    isDropdown?: boolean;
    variant?: 'default' | 'danger';
    icon?: Component;
  }>(),
  {
    variant: 'default',
    isSelect: false,
    isToggle: false,
    isDropdown: false,
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
    class="flex justify-between items-center w-full text-left bg-transparent border-0 pr-3 py-2 min-h-9 gap-4 rounded-lg cursor-pointer text-sub transition-hover user-select-none"
    :class="[
      variant === 'danger'
        ? 'text-danger hover:bg-danger-hover'
        : 'text-on-ghost hover:bg-ghost-hover',
      icon ? 'pl-2.5' : 'pl-3',
      { 'font-semibold': active },
    ]"
    :role="isSelect ? 'menuitemradio' : 'menuitem'"
    :aria-checked="isSelect ? active : undefined"
  >
    <span
      class="flex items-center"
      :class="$slots.description ? 'gap-3' : 'gap-2'"
    >
      <component
        :is="icon"
        v-if="icon"
        :size="$slots.description ? 20 : 18"
        class="shrink-0"
      />
      <span class="flex flex-col">
        <span
          class="text-sm"
          :class="[
            active && !$slots.description && !isDropdown
              ? 'font-bold'
              : 'font-medium',
            $slots.description ? 'leading-5' : 'leading-4',
          ]"
          ><slot></slot
        ></span>
        <span
          v-if="$slots.description"
          class="text-xs leading-4 text-on-ghost-muted font-normal"
          ><slot name="description"></slot
        ></span>
      </span>
    </span>

    <ChevronDown
      v-if="isDropdown"
      :size="16"
      class="ml-auto shrink-0 transition duration-200 ease-in-out"
      :class="{ 'rotate-180': active }"
    />

    <span v-if="isSelect" aria-hidden="true">
      <Check v-if="active" :size="16" class="text-on-ghost shrink-0" />
      <span v-else class="w-4 shrink-0 h-4"></span>
    </span>

    <span v-if="isToggle">
      <BaseToggle :modelValue="active" />
    </span>
  </button>
</template>
