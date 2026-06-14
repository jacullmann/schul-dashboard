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
    class="group inline-flex items-start gap-2 cursor-pointer select-none relative z-0 touch-target after:min-w-12 after:min-h-12"
    :class="{ 'checkbox-checked': modelValue || checked }"
  >
    <input
      type="checkbox"
      class="peer sr-only"
      :checked="modelValue || checked"
      @change="handleChange"
    />
    <span
      class="relative size-4.5 rounded-sm border-2 border-on-ghost-muted inline-flex items-center justify-center bg-transparent group-hover:border-action peer-checked:border-action transition-colors duration-300 ease-out"
      aria-hidden="true"
    >
      <span
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[34px] rounded-full bg-transparent scale-50 group-hover:bg-surface-hover group-hover:scale-100 transition duration-150 ease-in-out z-[-1]"
      ></span>
      <span
        class="absolute inset-0 bg-action flex items-center justify-center rounded-[1px] checkbox-bg-clip"
      >
        <Check class="size-4 text-on-action check-animate" stroke-width="3" />
      </span>
    </span>
    <span
      v-if="$slots.default"
      class="text-sm/[18px] flex-1"
      @click="handleLabelClick"
    >
      <slot></slot>
    </span>
  </label>
</template>
