<script setup lang="ts">
import { ref, inject, computed } from 'vue';
import { Check, ChevronRight } from '@lucide/vue';
import type { Component } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { MENU_SHEET_KEY } from '@/common/composables/useMenuContext';

const sheetCtx = inject(MENU_SHEET_KEY, undefined);
const { width: vw } = useWindowSize();
const isMobile = computed(() => vw.value < 768 && !!sheetCtx);

withDefaults(
  defineProps<{
    active?: boolean;
    isSelect?: boolean;
    isToggle?: boolean;
    isSubmenu?: boolean;
    forceHover?: boolean;
    variant?: 'default' | 'danger';
    icon?: Component;
  }>(),
  {
    variant: 'default',
    isSelect: false,
    isToggle: false,
    isSubmenu: false,
    forceHover: false,
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
    class="group flex justify-between items-center w-full text-left border-0 py-2 gap-4 cursor-pointer transition-hover user-select-none"
    :class="[
      variant === 'danger'
        ? 'text-danger hover:bg-danger-hover'
        : 'text-on-ghost hover:bg-ghost-hover',
      isMobile ? (icon ? 'pl-4' : 'pl-4.5') : icon ? 'pl-2.5' : 'pl-3',
      { 'font-semibold': active },
      isMobile ? 'rounded-xl pr-4 min-h-12' : 'rounded-lg pr-3 min-h-9',
    ]"
    :style="
      forceHover
        ? {
            backgroundColor:
              variant === 'danger'
                ? 'var(--color-danger-hover)'
                : 'var(--color-ghost-hover)',
          }
        : {}
    "
    :role="isSelect ? 'menuitemradio' : 'menuitem'"
    :aria-checked="isSelect ? active : undefined"
  >
    <span
      class="flex items-center"
      :class="isMobile || $slots.description ? 'gap-3' : 'gap-2'"
    >
      <component
        :is="icon"
        v-if="icon"
        :size="isMobile ? 20 : $slots.description ? 20 : 18"
        class="shrink-0"
      />
      <span class="flex flex-col">
        <span
          :class="[
            active && !$slots.description ? 'font-bold' : 'font-medium',
            isMobile
              ? 'text-sm/6'
              : $slots.description
                ? 'text-sm/5'
                : 'text-sm/4',
          ]"
          ><slot></slot
        ></span>
        <span
          v-if="$slots.description"
          class="text-xs/4 text-on-ghost-muted font-normal"
          ><slot name="description"></slot
        ></span>
      </span>
    </span>

    <ChevronRight
      v-if="isSubmenu"
      :size="18"
      class="ml-auto shrink-0 transition-hover"
      :class="
        forceHover
          ? 'text-on-ghost '
          : 'text-on-ghost-muted group-hover:text-on-ghost'
      "
    />

    <span v-if="isSelect" aria-hidden="true">
      <Check v-if="active" :size="18" class="text-on-ghost shrink-0" />
      <span v-else class="w-4 shrink-0 h-4"></span>
    </span>

    <span v-if="isToggle">
      <BaseToggle :modelValue="active" />
    </span>
  </button>
</template>
