<script setup lang="ts">
import { ChevronRight } from '@lucide/vue';

withDefaults(
  defineProps<{
    disabled?: boolean;
    separator?: boolean;
    chevron?: boolean;
    active?: boolean;
    indicator?: boolean;
    unread?: boolean;
  }>(),
  {
    disabled: false,
    separator: true,
    chevron: true,
    active: false,
    indicator: false,
    unread: false,
  },
);
</script>

<template>
  <button
    v-wave
    v-bind="$attrs"
    class="relative group flex items-center w-full gap-2 py-3 px-6 md:p-3.5 md:pr-6 md:rounded-2xl bg-transparent cursor-pointer text-left transition-hover hover:bg-ghost-hover disabled:opacity-50"
    :class="{ active, 'md:pl-6': !$slots.icon }"
    :disabled="disabled"
  >
    <span
      v-if="indicator"
      class="absolute transition-[max-height,width,top,opacity] duration-200 left-0 md:-left-4 group-[.active]:top-0 group-hover:top-[25%] top-[45%] bottom-0 w-0.5 opacity-0 group-[.active]:w-1.5 group-hover:w-1.5 group-[.active]:opacity-100 group-hover:opacity-100 group-[.active]:max-h-full group-hover:max-h-[50%] max-h-[10%] bg-action rounded-r-full"
    ></span>

    <slot name="icon"></slot>

    <span class="flex flex-col flex-1">
      <slot name="label"></slot>
    </span>

    <ChevronRight
      :size="16"
      class="max-md:hidden transition duration-150 ease-in-out opacity-0 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100 text-on-ghost-muted"
    />

    <NotificationDot v-if="unread" class="md:hidden" :size="3" />
  </button>

  <div
    v-if="separator"
    v-bind="$attrs"
    class="border-b border-canvas-border mx-6 max-md:hidden"
  ></div>
</template>
