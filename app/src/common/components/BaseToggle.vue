<script setup lang="ts">
import { computed } from 'vue';

const model = defineModel<boolean>({ default: false });

const props = withDefaults(
  defineProps<{
    label?: string;
    disabled?: boolean;
  }>(),
  {
    label: '',
    disabled: false,
  },
);

const toggle = () => {
  if (!props.disabled) {
    model.value = !model.value;
  }
};

const buttonClasses = computed(() => {
  return [
    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    model.value ? 'bg-accent' : 'bg-ghost',
  ];
});

const dotClasses = computed(() => {
  return [
    'pointer-events-none inline-block h-5 w-5 bg-white transform rounded-full shadow-sm ring-0 transition duration-200 ease-in-out',
    model.value ? 'translate-x-5' : 'translate-x-0',
  ];
});
</script>

<template>
  <div class="inline-flex items-center gap-3">
    <button
      type="button"
      role="switch"
      :aria-checked="model"
      :disabled="disabled"
      :class="buttonClasses"
      @click="toggle"
    >
      <span v-if="label" class="sr-only">{{ label }}</span>

      <span aria-hidden="true" :class="dotClasses"></span>
    </button>

    <span
      v-if="label"
      class="cursor-pointer select-none text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-900"
      :class="{ 'opacity-50 cursor-not-allowed': disabled }"
      @click="toggle"
    >
      {{ label }}
    </span>
  </div>
</template>
