<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  disabled?: boolean;
}>();

const enabled = defineModel<boolean>({ required: true });
</script>

<template>
  <!-- The label names the switch and makes the whole card toggle it. -->
  <label
    class="flex items-center justify-between gap-4 rounded-2xl border border-ghost-border bg-surface p-4 select-none transition-[background-color,opacity] duration-200 ease-out"
    :class="
      disabled
        ? 'cursor-not-allowed opacity-60'
        : 'cursor-pointer hover:bg-surface-highlight'
    "
  >
    <span class="flex flex-col gap-0.5">
      <span class="text-sm/[1.2] font-semibold text-on-ghost">
        {{ title }}
      </span>
      <span class="text-xs/[1.35] text-on-ghost-muted">
        {{ description }}
      </span>
    </span>
    <BaseToggle v-model="enabled" :disabled="disabled" />
  </label>
</template>
