<script setup lang="ts">
const props = withDefaults(defineProps<{
  error?: string;
}>(), {
  error: '',
});

const slots = defineSlots<{
  default(): unknown;
}>();
</script>

<template>
  <div class="flex flex-col gap-4">
    <slot></slot>

    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <span
        v-if="error"
        class="text-danger text-sub font-sans leading-[1.4] m-0"
        role="alert"
        aria-live="polite"
      >
        {{ error }}
      </span>
    </transition>
  </div>
</template>