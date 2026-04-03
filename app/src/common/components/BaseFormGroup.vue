<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  id: string;
  error?: string;
}>(), {
  error: '',
});

const slots = defineSlots<{
  default(): unknown;
}>();

const errorId = computed(() => `${props.id}-error`);
</script>

<template>
  <div class="flex flex-col w-full gap-1.5">
    <div>
      <slot></slot>
    </div>

    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <p
        v-if="error"
        :id="errorId"
        class="text-sub font-sans leading-[1.4] m-0 text-danger"
        role="alert"
        aria-live="polite"
      >
        {{ error }}
      </p>
    </transition>
  </div>
</template>
