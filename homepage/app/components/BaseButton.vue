<script setup lang="ts">
import type { Component } from 'vue';

const props = withDefaults(
  defineProps<{
    href?: string;
    target?: string;
    type?: 'button' | 'submit' | 'reset';
    variant?: 'action' | 'ghost';
    size?: 'md' | 'lg';
    icon?: Component;
    iconPlacement?: 'leading' | 'trailing';
  }>(),
  {
    href: undefined,
    target: undefined,
    type: 'button',
    variant: 'ghost',
    size: 'md',
    icon: undefined,
    iconPlacement: 'trailing',
  },
);

const slots = useSlots();
const iconOnly = computed(() => Boolean(props.icon) && !slots.default);

const variantClasses = {
  action: 'bg-action text-on-action hover:bg-action-hover',
  ghost: 'text-on-ghost hover:bg-ghost-hover',
} as const;

const sizeClasses = computed(() => {
  if (iconOnly.value) return 'size-10';
  return props.size === 'lg' ? 'h-12 px-6 text-[0.9375rem]' : 'h-10 px-4.5 text-sm';
});

const tagAttrs = computed(() =>
  props.href
    ? {
        href: props.href,
        target: props.target,
        rel: props.target === '_blank' ? 'noopener noreferrer' : undefined,
      }
    : { type: props.type },
);
</script>

<template>
  <component
    :is="href ? 'a' : 'button'"
    v-bind="tagAttrs"
    :class="[variantClasses[variant], sizeClasses]"
    class="group/button touch-target relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none transition-colors duration-(--duration-hover)"
  >
    <component
      :is="icon"
      v-if="icon && iconPlacement === 'leading'"
      :size="18"
      :stroke-width="1.75"
      aria-hidden="true"
    />
    <slot />
    <component
      :is="icon"
      v-if="icon && iconPlacement === 'trailing'"
      :size="18"
      :stroke-width="1.75"
      :class="
        !iconOnly &&
        'transition-transform duration-200 ease-out-quint group-hover/button:translate-x-0.5'
      "
      aria-hidden="true"
    />
  </component>
</template>
