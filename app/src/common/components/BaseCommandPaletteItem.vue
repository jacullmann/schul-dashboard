<script setup lang="ts">
import { useWindowSize } from '@vueuse/core';
import { ChevronRight } from '@lucide/vue';

const { width: windowWidth } = useWindowSize();

defineProps<{
  active?: boolean;
  label: string;
  /** The page this item lives under, shown ahead of its label. */
  parent?: string;
  description?: string;
  icon?: any;
  id?: string;
}>();

defineEmits<{
  (e: 'click'): void;
  (e: 'mouseenter'): void;
}>();
</script>

<template>
  <button
    :id="id"
    v-wave
    class="w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer border-none text-left transition-colors"
    :class="
      windowWidth > 640
        ? active
          ? 'bg-ghost-hover'
          : 'bg-transparent hover:bg-surface-highlight'
        : active
          ? 'bg-ghost-hover'
          : 'bg-transparent'
    "
    @click="$emit('click')"
    @mouseenter="$emit('mouseenter')"
  >
    <span
      v-if="icon || $slots.icon"
      class="shrink-0 flex items-center justify-center w-8 h-8 text-on-ghost-muted"
    >
      <component :is="icon" v-if="icon" :size="20" />
      <slot v-else name="icon"></slot>
    </span>

    <span class="flex-1 min-w-0">
      <span
        class="flex items-center gap-1 text-sm/tight font-medium text-on-ghost"
      >
        <template v-if="parent">
          <span class="text-on-ghost-muted truncate">{{ parent }}</span>
          <ChevronRight :size="14" class="shrink-0 text-on-ghost-subtle" />
        </template>
        <span class="truncate">{{ label }}</span>
      </span>
      <span
        v-if="description"
        class="block text-xs text-on-ghost-muted truncate mt-1"
        >{{ description }}</span
      >
    </span>

    <slot></slot>
  </button>
</template>
