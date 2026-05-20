<script setup lang="ts">
import type { Component } from 'vue';

defineOptions({
  inheritAttrs: false,
});

withDefaults(
  defineProps<{
    icon?: Component;
    label?: string;
    shortcut?: string[];
    expanded?: boolean;
    active?: boolean;
    unread?: boolean;
  }>(),
  {
    expanded: true,
    active: false,
    unread: false,
  },
);
</script>

<template>
  <BaseTooltip :content="label" :shortcut="shortcut" :disabled="!label">
    <button
      v-bind="$attrs"
      class="group relative gap-0 items-center flex px-3 py-2.5 md:p-2! min-h-9 min-w-9 text-on-ghost rounded-full bg-transparent hover:bg-surface-hover transition-hover cursor-pointer outline-none w-full touch-target-x"
      :class="{
        'bg-surface-hover! text-on-ghost!': active && (icon || expanded),
      }"
    >
      <span v-if="icon" class="shrink-0">
        <component
          :is="icon"
          :size="20"
          class="transition-all duration-150"
          :class="active ? 'stroke-3' : ''"
        />
      </span>

      <span
        v-if="label"
        class="transition-[max-width,opacity,margin-left] transition-hover text-sm/5 font-medium whitespace-nowrap overflow-hidden"
        :class="[
          expanded
            ? 'max-w-40 opacity-100 ml-3 duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
            : 'max-w-0 opacity-0 ml-0 duration-150 ease-[cubic-bezier(0.32,0,0.67,1)]',
          !icon ? 'ml-1!' : '',
          active
            ? 'text-on-ghost!'
            : 'text-on-ghost-muted group-hover:text-on-ghost',
        ]"
      >
        {{ label }}
      </span>

      <NotificationDot
        v-if="unread"
        class="transition-[max-width,opacity,margin-left]"
        :class="
          expanded
            ? 'opacity-100 ml-2 duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
            : 'max-w-0 opacity-0 ml-0 duration-150 ease-[cubic-bezier(0.32,0,0.67,1)]'
        "
      />
    </button>
  </BaseTooltip>
</template>
