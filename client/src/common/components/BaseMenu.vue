<script setup lang="ts">
import { ref } from 'vue';

const rootEl = ref<HTMLDivElement | null>(null);

defineExpose({
  el: rootEl,
});
</script>

<template>
  <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-2 scale-95"
  >
    <div
        ref="rootEl"
        role="menu"
        class="absolute flex flex-col items-stretch p-1 bg-surface border border-surface-border rounded-lg min-w-[180px] shadow-menu overflow-y-auto gap-1 z-[1000]"
        aria-orientation="vertical"
        tabindex="-1"
    >
      <slot />
    </div>
  </transition>
</template>
