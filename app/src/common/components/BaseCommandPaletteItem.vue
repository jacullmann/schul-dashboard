<script setup lang="ts">
defineProps<{
  active?: boolean;
  label: string;
  description?: string;
  icon?: any;
  avatarText?: string;
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
    class="command-palette-item w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer border-none text-left transition-colors"
    :class="
      active
        ? 'bg-surface-hover'
        : 'bg-transparent hover:bg-surface-hover-subtle'
    "
    @click="$emit('click')"
    @mouseenter="$emit('mouseenter')"
  >
    <span
      v-if="icon || avatarText"
      class="shrink-0 flex items-center justify-center w-8 h-8 text-on-ghost-muted"
      :class="{ 'rounded-full bg-surface-hover': avatarText }"
    >
      <component v-if="icon" :is="icon" :size="20" />
      <span v-else-if="avatarText">{{ avatarText }}</span>
    </span>

    <span class="flex-1 min-w-0">
      <span class="block text-sub font-medium text-on-ghost leading-tight">{{
        label
      }}</span>
      <span
        v-if="description"
        class="block text-footnote text-on-ghost-muted truncate mt-0.5"
        >{{ description }}</span
      >
    </span>

    <!-- Slot for unread dot, shortcut keys, or arrows -->
    <slot></slot>
  </button>
</template>
