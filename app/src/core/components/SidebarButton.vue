<script setup lang="ts">
defineOptions({
  inheritAttrs: false
});

defineProps<{
  label?: string;
  shortcut?: string[];
  expanded?: boolean;
}>();
</script>

<template>
  <BaseTooltip 
    :content="label" 
    :shortcut="shortcut"
    :disabled="expanded || !label"
  >
    <button
      v-bind="$attrs"
      class="group gap-0 items-center flex p-3 md:p-2 text-on-surface rounded-full bg-transparent hover:bg-surface-hover transition-hover cursor-pointer border-0 outline-none w-full"
    >
      <span class="shrink-0">
        <slot />
      </span>

      <span
        v-if="label"
        class="transition-[max-width,opacity,margin-left] duration-200 ease-[cubic-bezier(0.4, 0, 0.2, 1)] text-on-surface-muted group-hover:text-on-surface transition-hover text-sub leading-5 font-regular whitespace-nowrap overflow-hidden"
        :class="expanded ? 'max-w-40 opacity-100 ml-3' : 'max-w-0 opacity-0 ml-0'"
      >
        {{ label }}
      </span>
    </button>
  </BaseTooltip>
</template>
