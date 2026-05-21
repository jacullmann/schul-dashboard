<script setup lang="ts">
import type { Component } from 'vue';
import { computed, ref, useSlots } from 'vue';
import { X } from '@lucide/vue';

export interface Props {
  href?: string;
  target?: string;
  rel?: string;
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
  ripple?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  href: undefined,
  target: undefined,
  rel: undefined,
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
  ripple: true,
});

const slots = useSlots();
const buttonEl = ref<HTMLButtonElement | HTMLAnchorElement | null>(null);

const isLink = computed(() => Boolean(props.href));
const isInactive = computed(() => props.disabled || props.loading);
const iconSize = computed(() => (props.size === 'sm' ? 18 : 20));
const hasLabel = computed(() => Boolean(slots.default));

const componentTag = computed(() => (isLink.value ? 'a' : 'button'));

const linkAttrs = computed(() => ({
  href: isInactive.value ? undefined : props.href,
  target: props.target,
  rel: props.rel ?? (props.target === '_blank' ? 'noopener noreferrer' : undefined),
  role: isInactive.value ? 'link' : undefined,
  tabindex: isInactive.value ? -1 : undefined,
}));

const buttonAttrs = computed(() => ({
  type: props.type,
  disabled: isInactive.value,
}));

const tagAttrs = computed(() => (isLink.value ? linkAttrs.value : buttonAttrs.value));

const variantClasses = computed(() => {
  const onMap: Record<NonNullable<Props['on']>, string> = {
    ghost: 'text-on-ghost-muted hover:bg-ghost-hover hover:text-on-ghost',
    action: 'text-on-action-muted hover:bg-action-hover hover:text-on-action',
    danger: 'text-on-danger-muted hover:bg-danger-highlight hover:text-on-danger',
  };

  const variantMap: Record<NonNullable<Props['variant']>, string> = {
    ghost: `bg-transparent ${onMap[props.on]}`,
    input: [
      'bg-surface text-on-ghost border border-surface-border',
      'shadow-input rounded-lg! px-3! py-2! w-full',
      'hover:bg-surface-highlight',
    ].join(' '),
    action: 'bg-action text-on-action hover:bg-action-hover',
    danger: 'bg-danger text-on-danger hover:bg-danger-highlight',
  };

  return variantMap[props.variant];
});

const layoutClasses = computed(() => {
  if (props.full) return 'w-full justify-center font-semibold';
  if (props.variant === 'input') return 'font-normal w-fit';
  return 'font-medium w-fit';
});

const sizeClasses = computed(() => (props.size === 'sm' ? '' : 'min-h-10 min-w-10'));

const paddingClasses = computed(() => {
  if (props.size === 'sm') return 'px-2';
  if (props.chip) return 'px-2.5';

  const iconWithLabel = props.icon && hasLabel.value && !props.loading;
  if (iconWithLabel) {
    return props.iconPlacement === 'leading' ? 'pl-3 pr-5' : 'pl-5 pr-3';
  }

  if (props.icon || props.loading) return 'px-2';
  return 'px-5';
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
      v-bind="tagAttrs"
      v-wave="ripple && !isInactive"
      :aria-busy="loading || undefined"
      :aria-disabled="isInactive || undefined"
      :class="[
      variantClasses,
      layoutClasses,
      sizeClasses,
      paddingClasses,
      touch && 'touch-target',
      isInactive && isLink && 'pointer-events-none',
    ]"
      class="relative inline-flex items-center justify-center gap-2 py-2 rounded-full text-sm/4 cursor-pointer select-none whitespace-nowrap transition-hover disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <BaseSpinner v-if="loading" :on="variant" :size="size === 'sm' ? '18' : '20'" />

    <template v-else-if="!chip">
      <component
          :is="icon"
          v-if="icon && iconPlacement === 'leading'"
          :size="iconSize"
          :fill="fill ? 'currentColor' : 'none'"
          :class="iconClasses"
          aria-hidden="true"
      />
      <slot />
      <component
          :is="icon"
          v-if="icon && iconPlacement === 'trailing'"
          :size="iconSize"
          :fill="fill ? 'currentColor' : 'none'"
          :class="iconClasses"
          aria-hidden="true"
      />
    </template>

    <template v-else>
      <component :is="icon" v-if="icon" :size="iconSize" :class="iconClasses" aria-hidden="true" />
      <slot />
      <X :size="iconSize" aria-hidden="true" />
    </template>
  </component>
</template>
