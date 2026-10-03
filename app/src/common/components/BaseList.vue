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
    <span
      v-if="$slots.icon"
      class="flex items-center justify-center"
      :class="$slots.desc ? 'size-10' : 'w-9 h-5'"
    >
      <slot name="icon"></slot>
    </span>

    <span class="flex flex-col flex-1 gap-1">
      <span
        class="text-on-ghost text-base/5 truncate"
        :class="$slots.desc ? 'font-semibold' : 'font-normal'"
      >
        <slot name="label"></slot>
      </span>
      <span
        v-if="$slots.desc"
        class="text-on-ghost-muted text-sm/4 font-normal"
      >
        <slot name="desc"></slot>
      </span>
    </span>

    <ChevronRight v-if="chevron" :size="20" class="text-on-ghost-muted" />

    <NotificationDot v-if="unread" class="md:hidden" :size="3" />
  </button>

  <div
    v-if="separator"
    v-bind="$attrs"
    class="border-b border-ghost-border mr-6"
    :class="
      $slots.icon
        ? $slots.desc
          ? 'ml-18 md:ml-15.5'
          : 'ml-17 md:ml-14.5'
        : 'ml-6'
    "
  ></div>
</template>
