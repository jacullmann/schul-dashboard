<script setup lang="ts">
import { Check } from '@lucide/vue';

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    checked?: boolean;
  }>(),
  {
    modelValue: false,
    checked: false,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'change', event: Event): void;
}>();

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.checked);
  emit('change', event);
}

function handleLabelClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (target.closest('a')) {
    event.stopPropagation();
  }
}
</script>

<template>
  <label
    class="group inline-flex items-start gap-2 cursor-pointer select-none relative z-0"
    :class="{ 'checkbox-checked': modelValue || checked }"
  >
    <input
      type="checkbox"
      class="peer sr-only"
      :checked="modelValue || checked"
      @change="handleChange"
    />
    <span
      class="w-[18px] h-[18px] rounded-sm border-2 border-on-ghost-muted inline-flex items-center justify-center bg-transparent relative group-hover:border-action peer-checked:bg-action peer-checked:border-action"
      aria-hidden="true"
    >
      <span
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34px] h-[34px] rounded-full bg-transparent transition-hover z-[-1] group-hover:bg-surface-hover"
      ></span>
      <Check class="w-4 h-4 text-on-action check-animate" stroke-width="3" />
    </span>
    <span
      v-if="$slots.default"
      class="text-sub leading-[18px] flex-1"
      @click="handleLabelClick"
    >
      <slot></slot>
    </span>
  </label>
</template>
