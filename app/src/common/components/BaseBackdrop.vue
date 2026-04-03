<script setup lang="ts">
const emit = defineEmits<{ (e: 'cancel'): void }>();
</script>

<template>
  <div
    class="fixed inset-0 z-9999 flex items-center justify-center backdrop-blur-[5px] bg-black/40 p-4"
    @click.self="emit('cancel')"
    aria-hidden="true"
  >
    <slot></slot>
  </div>
</template>
