<script setup lang="ts">
defineProps<{
  label?: string;
  expanded?: boolean;
}>();
</script>

<template>
  <button
    class="group gap-0 items-center flex p-2 text-on-surface rounded-md bg-transparent hover:bg-surface-hover transition-hover cursor-pointer border-0 outline-none w-full"
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
</template>
