<script setup lang="ts">
import { ChevronRight } from '@lucide/vue';

withDefaults(
  defineProps<{
    disabled?: boolean;
    separator?: boolean;
    chevron?: boolean;
    unread?: boolean;
  }>(),
  {
    disabled: false,
    separator: true,
    chevron: true,
    unread: false,
  },
);
</script>

<template>
  <button
    v-wave
    v-bind="$attrs"
    class="relative group flex items-center w-full gap-2 py-3 px-6 md:p-3.5 md:pr-6 md:rounded-2xl bg-transparent cursor-pointer text-left transition-hover hover:bg-ghost-hover active:bg-ghost-hover disabled:opacity-50"
    :class="$slots.icon ? '' : 'md:pl-6'"
    :disabled="disabled"
  >
    <slot name="icon"></slot>

    <span class="flex flex-col flex-1">
      <slot name="label"></slot>
    </span>

    <ChevronRight v-if="chevron" :size="20" class="text-on-ghost-muted" />

    <NotificationDot v-if="unread" class="md:hidden" :size="3" />
  </button>

  <div
    v-if="separator"
    v-bind="$attrs"
    class="border-b border-ghost-border"
    :class="$slots.icon ? 'ml-18 md:ml-15 mr-6' : 'mx-6'"
  ></div>
</template>
