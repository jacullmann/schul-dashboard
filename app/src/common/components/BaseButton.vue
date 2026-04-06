<script setup lang="ts">
import type { Component } from 'vue';
import { computed, ref } from 'vue';

export interface Props {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'action' | 'ghost' | 'danger' | 'input';
  on?: 'canvas' | 'surface' | 'action';
  full?: boolean;
  icon?: Component;
  size?: 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'button',
  variant: 'ghost',
  on: 'surface',
  full: false,
  icon: undefined,
  size: 'md',
  loading: false,
  disabled: false,
});

const buttonEl = ref<HTMLButtonElement | null>(null);

const classes = computed(() => {
  const onClasses: Record<NonNullable<Props['on']>, string> = {
    canvas:
      'text-on-canvas-muted hover:bg-canvas-hover hover:border-canvas-hover hover:text-on-canvas',
    surface:
      'text-on-surface-muted hover:bg-surface-hover hover:border-surface-hover hover:text-on-surface',
    action:
      'text-on-action-muted hover:bg-action-hover hover:border-action-hover hover:text-on-action',
  };

  const variantClasses: Record<NonNullable<Props['variant']>, string> = {
    ghost: ['bg-transparent border-transparent', onClasses[props.on]].join(' '),
    input: [
      'bg-surface text-on-surface border-surface-border',
      'shadow-input rounded-md! w-full',
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

  return variantClasses[props.variant ?? 'ghost'];
});

defineExpose({
  focus: () => buttonEl.value?.focus(),
  blur: () => buttonEl.value?.blur(),
});
</script>

<template>
  <button
    ref="buttonEl"
    :type="type"
    :disabled="disabled || loading"
    :class="[
      classes,
      full
        ? 'w-full justify-center font-semibold'
        : 'w-fit' + variant === 'input' ? 'font-normal' : 'font-medium',
      size === 'lg' ? 'text-sub' : 'text-btn',
      size === 'lg' ? 'py-2.5' : 'py-2',
      size === 'lg' ? 'border-0' : 'border',
      loading
        ? size === 'lg'
          ? 'px-2.5'
          : 'px-2'
        : icon && $slots.default
          ? size === 'lg'
            ? 'pl-3 pr-5'
            : 'pl-2.5 pr-4'
          : icon
            ? size === 'lg'
              ? 'px-2.5'
              : 'px-2'
            : size === 'lg'
              ? 'px-5'
              : 'px-4',
    ]"
    class="inline-flex items-center gap-2 py-2 rounded-full leading-4 cursor-pointer select-none whitespace-nowrap transition-hover disabled:opacity-50 disabled:cursor-not-allowed"
    :aria-busy="loading"
    :aria-disabled="disabled"
  >
    <BaseSpinner
      v-if="loading"
      :on="variant"
      :size="size === 'lg' ? '1.25rem' : '1rem'"
    />
    <template v-else>
      <component v-if="icon" :is="icon" :size="size === 'lg' ? 20 : 16" />
      <slot></slot>
    </template>
  </button>
</template>
