<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

const props = defineProps<{
  to: RouteLocationRaw;
  inline?: boolean;
}>();

const isExternal = computed(() => {
  if (typeof props.to !== 'string') return false;
  return /^(https?:|mailto:|tel:)/.test(props.to);
});

const href = computed(() => {
  return typeof props.to === 'string' ? props.to : undefined;
});

// Links inside wrapped text skip the enlarged target so it can't overlap neighbouring lines and links.
const classes = computed(() => [
  'relative underline underline-offset-2 decoration-1.5 decoration-skip-ink font-medium text-on-ghost-muted hover:text-on-ghost transition-hover cursor-pointer',
  { 'touch-target after:min-w-12 after:min-h-12': !props.inline },
]);
</script>

<template>
  <a
    v-if="isExternal"
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    :class="classes"
  >
    <slot></slot>
  </a>

  <router-link v-else :to="to" :class="classes">
    <slot></slot>
  </router-link>
</template>
