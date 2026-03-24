<script setup lang="ts">
import { computed } from 'vue';
import LoadingSpinner from './LoadingSpinner.vue';

export interface Props {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'action' | 'ghost' | 'danger' | 'default';
  loading?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'button',
  variant: 'default',
  loading: false,
  disabled: false,
});

const variantClasses: Record<NonNullable<Props['variant']>, string> = {
  default: '',
  ghost: [
    'bg-surface text-on-surface border-surface-border',
    'shadow-input',
    'hover:bg-surface-hover-subtle',
  ].join(' '),
  action: [
    'bg-action text-on-action border-action',
    'hover:bg-action-hover hover:border-action-hover',
  ].join(' '),
  danger: [
    'bg-danger text-on-danger border-danger',
    'hover:bg-danger-hover',
  ].join(' '),
};

const classes = computed(() => variantClasses[props.variant ?? 'default']);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="classes"
    class="
      inline-flex items-center gap-2
      px-3 py-2
      border rounded-md
      text-btn leading-4
      cursor-pointer select-none
      whitespace-nowrap
      transition-colors duration-hover ease-hover
      disabled:opacity-50 disabled:cursor-not-allowed
    "
  >
    <LoadingSpinner v-if="loading" size="1em" />
    <slot v-else />
  </button>
</template>
