<script setup lang="ts">
import type { Component } from 'vue';
import { computed, ref } from 'vue';
import { X } from '@lucide/vue';

export interface Props {
  href?: string;
  target?: string;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'action' | 'ghost' | 'danger' | 'input';
  on?: 'ghost' | 'action' | 'danger';
  full?: boolean;
  icon?: Component;
  iconPlacement?: 'leading' | 'trailing';
  iconClasses?: string;
  fill?: boolean;
  size?: 'sm' | 'md';
  chip?: boolean;
  loading?: boolean;
  disabled?: boolean;
  touch?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  target: undefined,
  type: 'button',
  variant: 'ghost',
  on: 'ghost',
  full: false,
  icon: undefined,
  iconPlacement: 'leading',
  iconClasses: '',
  fill: false,
  size: 'md',
  chip: false,
  loading: false,
  disabled: false,
  touch: true,
});

const buttonEl = ref<HTMLButtonElement | HTMLAnchorElement | null>(null);

const componentTag = computed(() => {
  return props.href ? 'a' : 'button';
});

const classes = computed(() => {
  const onClasses: Record<NonNullable<Props['on']>, string> = {
    ghost: 'text-on-ghost-muted hover:bg-ghost-hover hover:text-on-ghost',
    action: 'text-on-action-muted hover:bg-action-hover hover:text-on-action',
    danger: 'text-on-danger-muted hover:bg-danger-highlight hover:text-on-danger',
  };

  const variantClasses: Record<NonNullable<Props['variant']>, string> = {
    ghost: ['bg-transparent', onClasses[props.on]].join(' '),
    input: [
      'bg-surface text-on-ghost border border-surface-border',
      'shadow-input rounded-lg! px-3! py-2! w-full',
      'hover:bg-surface-highlight',
    ].join(' '),
    action: ['bg-action text-on-action', 'hover:bg-action-hover'].join(' '),
    danger: ['bg-danger text-on-danger', 'hover:bg-danger-highlight'].join(' '),
  };

  return variantClasses[props.variant ?? 'ghost'];
});

defineExpose({
  focus: () => buttonEl.value?.focus(),
  blur: () => buttonEl.value?.blur(),
});
</script>

<template>
  <component
    :is="componentTag"
    ref="buttonEl"
    :href="disabled || loading ? undefined : href"
    :target="target"
    :type="type"
    :disabled="disabled || loading"
    :class="[
      classes,
      full
        ? 'w-full justify-center font-semibold'
        : variant === 'input'
          ? 'font-normal w-fit'
          : 'font-medium w-fit',
      size === 'sm' ? '' : ' min-h-10 min-w-10',
      touch ? 'touch-target' : '',
      size === 'sm'
        ? 'px-2'
        : !chip && !loading && icon && $slots.default
          ? iconPlacement === 'leading'
            ? 'pl-4 pr-6'
            : 'pl-6 pr-4'
          : chip
            ? 'px-2.5'
            : loading || icon
              ? 'px-2'
              : 'px-6',
    ]"
    class="relative inline-flex items-center justify-center gap-2 py-2 rounded-full text-sm/4 cursor-pointer select-none whitespace-nowrap transition-hover disabled:opacity-50 disabled:cursor-not-allowed"
    :aria-busy="loading"
    :aria-disabled="disabled"
  >
    <BaseSpinner v-if="loading" :on="variant" :size="size === 'sm' ? '18' : '20'" />
    <template v-else-if="!chip">
      <component
        v-if="icon && iconPlacement === 'leading'"
        :is="icon"
        :size="size === 'sm' ? 18 : 20"
        :fill="fill ? 'currentColor' : 'none'"
        :class="iconClasses"
      />
      <slot></slot>
      <component
        v-if="icon && iconPlacement === 'trailing'"
        :is="icon"
        :size="size === 'sm' ? 18 : 20"
        :fill="fill ? 'currentColor' : 'none'"
        :class="iconClasses"
      />
    </template>

    <template v-else>
      <component v-if="icon" :is="icon" :size="size === 'sm' ? 18 : 20" :class="iconClasses" />
      <slot></slot>
      <X :size="size === 'sm' ? 18 : 20" />
    </template>
  </component>
</template>
