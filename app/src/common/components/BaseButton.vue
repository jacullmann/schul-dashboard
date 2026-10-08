<script setup lang="ts">
import type { Component } from 'vue';
import { computed, ref } from 'vue';
import { X } from '@lucide/vue';

export interface Props {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'action' | 'ghost' | 'danger' | 'success' | 'input';
  on?: 'ghost' | 'action' | 'danger';
  full?: boolean;
  form?: boolean;
  formId?: string;
  icon?: Component;
  iconPlacement?: 'leading' | 'trailing';
  iconClasses?: string;
  fill?: boolean;
  size?: 'xs' | 'sm' | 'md';
  chip?: boolean;
  loading?: boolean;
  disabled?: boolean;
  touch?: boolean;
  ripple?: boolean;
  surface?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'button',
  variant: 'ghost',
  on: 'ghost',
  full: false,
  form: false,
  formId: undefined,
  icon: undefined,
  iconPlacement: 'leading',
  iconClasses: '',
  fill: false,
  size: 'md',
  chip: false,
  loading: false,
  disabled: false,
  touch: true,
  ripple: true,
  surface: false,
});

const buttonEl = ref<HTMLButtonElement | null>(null);

const iconSize = computed(() => ({ xs: 16, sm: 18, md: 20 })[props.size]);

const classes = computed(() => {
  const onClasses: Record<NonNullable<Props['on']>, string> = {
    ghost: props.surface
      ? 'bg-ghost-hover hover-overlay text-on-ghost'
      : 'bg-transparent text-on-ghost hover:bg-ghost-hover active:bg-ghost-hover',
    action:
      'bg-transparent text-on-action-muted hover:bg-action-hover hover:text-on-action active:bg-action-hover active:text-on-action',
    danger:
      'bg-transparent text-on-danger-muted hover:bg-danger-highlight hover:text-on-danger active:bg-danger-highlight active:text-on-danger',
  };

  const variantClasses: Record<NonNullable<Props['variant']>, string> = {
    ghost: onClasses[props.on],
    input: [
      'bg-surface text-on-ghost border border-ghost-border',
      'shadow-input rounded-lg! px-3! py-2! w-full',
      'hover:bg-surface-highlight active:bg-surface-highlight',
    ].join(' '),
    action: [
      'bg-action text-on-action',
      'hover:bg-action-hover active:bg-action-hover',
    ].join(' '),
    danger: [
      'bg-danger text-on-danger',
      'hover:bg-danger-highlight active:bg-danger-highlight',
    ].join(' '),
    success: [
      'bg-success text-on-success',
      'hover:bg-success-hover active:bg-success-hover',
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
    v-wave="ripple && !(disabled || loading)"
    :type="type"
    :form="formId"
    :disabled="disabled || loading"
    :class="[
      classes,
      full
        ? 'w-full justify-center font-semibold'
        : [
            variant === 'input' ? 'font-normal' : 'font-medium',
            form ? 'max-md:w-full max-md:justify-center md:w-fit' : 'w-fit',
          ],
      size === 'md' ? 'min-h-10 min-w-10' : '',
      touch ? 'touch-target after:min-w-12 after:min-h-12' : '',
      size === 'xs'
        ? 'p-1'
        : size === 'sm'
          ? 'px-2 py-2'
          : !chip && !loading && icon && $slots.default
            ? iconPlacement === 'leading'
              ? 'pl-3 pr-5 py-2'
              : 'pl-5 pr-3 py-2'
            : chip
              ? 'px-2.5 py-2'
              : loading || icon
                ? 'px-2 py-2'
                : 'px-5 py-2',
    ]"
    class="relative inline-flex items-center justify-center gap-2 rounded-full text-sm/4 cursor-pointer select-none whitespace-nowrap transition-hover disabled:opacity-50 disabled:cursor-not-allowed"
    :aria-busy="loading"
    :aria-disabled="disabled"
  >
    <BaseSpinner v-if="loading" :on="variant" :size="`${iconSize}`" />
    <template v-else-if="!chip">
      <component
        :is="icon"
        v-if="icon && iconPlacement === 'leading'"
        :size="iconSize"
        :fill="fill ? 'currentColor' : 'none'"
        :class="iconClasses"
      />
      <slot></slot>
      <component
        :is="icon"
        v-if="icon && iconPlacement === 'trailing'"
        :size="iconSize"
        :fill="fill ? 'currentColor' : 'none'"
        :class="iconClasses"
      />
    </template>

    <template v-else>
      <component :is="icon" v-if="icon" :size="iconSize" :class="iconClasses" />
      <slot></slot>
      <X :size="iconSize" />
    </template>
  </button>
</template>
