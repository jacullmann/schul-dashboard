<script setup lang="ts">
defineProps<{
  label?: string;
  expanded?: boolean;
}>();
</script>

<template>
  <button
    class="sidebar-btn text-on-surface rounded-md bg-transparent hover:bg-surface-hover cursor-pointer border-0 outline-none w-full"
    :class="expanded ? 'px-3 py-2' : 'p-2'"
  >
    <span class="icon-slot shrink-0">
      <slot />
    </span>

    <span
      v-if="label"
      class="label-text text-sub font-medium whitespace-nowrap overflow-hidden"
      :class="expanded ? 'label-visible' : 'label-hidden'"
    >
      {{ label }}
    </span>
  </button>
</template>

<style scoped>
.sidebar-btn {
  display: flex;
  align-items: center;
  gap: 0;
  transition:
    background-color var(--duration-hover) var(--ease-hover),
    color var(--duration-hover) var(--ease-hover),
    padding 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.label-text {
  transition:
    max-width 300ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 200ms cubic-bezier(0.4, 0, 0.2, 1),
    margin-left 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.label-visible {
  max-width: 160px;
  opacity: 1;
  margin-left: 10px;
}

.label-hidden {
  max-width: 0;
  opacity: 0;
  margin-left: 0;
}
</style>