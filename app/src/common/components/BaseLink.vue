<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

const props = defineProps<{
  to?: RouteLocationRaw;
}>();

const isExternal = computed(() => {
  if (typeof props.to !== 'string') return false;
  return /^(https?:|mailto:|tel:)/.test(props.to);
});

const href = computed(() => {
  return typeof props.to === 'string' ? props.to : undefined;
});

const sharedClasses =
  'relative underline underline-offset-2 decoration-1.5 decoration-skip-ink font-medium text-on-surface-muted hover:text-on-surface transition-hover cursor-pointer touch-target';
</script>

<template>
  <a
    v-if="isExternal"
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    :class="sharedClasses"
  >
    <slot></slot>
  </a>

  <router-link v-else :to="to" :class="sharedClasses">
    <slot></slot>
  </router-link>
</template>
