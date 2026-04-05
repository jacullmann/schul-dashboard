<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
});

withDefaults(
  defineProps<{
    label?: string;
    shortcut?: string[];
    expanded?: boolean;
    active?: boolean;
  }>(),
  {
    expanded: true,
    active: false,
  },
);
</script>

<template>
  <BaseTooltip :content="label" :shortcut="shortcut" :disabled="!label">
    <button
      v-bind="$attrs"
      class="group gap-0 items-center flex px-3 py-2.5 md:p-2! text-on-surface rounded-full bg-transparent hover:bg-surface-hover transition-hover cursor-pointer border-0 outline-none w-full"
      :class="{
        'bg-surface-hover! text-on-surface!':
          active && ($slots.default || expanded),
      }"
    >
      <span class="shrink-0">
        <slot></slot>
      </span>

      <span
        v-if="label"
        class="transition-[max-width,opacity,margin-left] duration-200 ease-[cubic-bezier(0.4, 0, 0.2, 1)] transition-hover text-sub leading-5 font-regular whitespace-nowrap overflow-hidden"
        :class="[
          expanded ? 'max-w-40 opacity-100 ml-3' : 'max-w-0 opacity-0 ml-0',
          !$slots.default ? 'ml-1!' : '',
          active
            ? 'text-on-surface!'
            : 'text-on-surface-muted group-hover:text-on-surface',
        ]"
      >
        {{ label }}
      </span>
    </button>
  </BaseTooltip>
</template>
