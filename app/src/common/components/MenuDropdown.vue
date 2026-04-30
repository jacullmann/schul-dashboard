<script setup lang="ts">
import { ref, computed } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { ChevronDown } from '@lucide/vue';

export interface MenuOption {
  value: string;
  label: string;
  icon?: any;
}

const props = defineProps<{
  modelValue: string;
  options: MenuOption[];
  prefix?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const isOpen = ref(false);
const wrapperRef = ref<HTMLElement | null>(null);

const selectedOption = computed(() => {
  return props.options.find((o) => o.value === props.modelValue);
});

function toggleMenu() {
  if (!props.disabled) {
    isOpen.value = !isOpen.value;
  }
}

function selectOption(value: string) {
  emit('update:modelValue', value);
  isOpen.value = false;
}

onClickOutside(wrapperRef, () => {
  isOpen.value = false;
});
</script>

<template>
  <div class="relative w-full" ref="wrapperRef">
    <BaseMenuButton
      @click="toggleMenu"
      :disabled="disabled"
      type="button"
      aria-haspopup="true"
      :aria-expanded="isOpen"
      :icon="selectedOption?.icon"
      :isDropdown="true"
      :active="isOpen"
    >
      <span>
        {{ prefix ? prefix + ' ' : '' }}{{ selectedOption?.label || '' }}
      </span>
    </BaseMenuButton>

    <Transition name="fade-dropdown">
      <BaseMenu v-if="isOpen" class="top-full min-w-full max-h-80 mt-1">
        <BaseMenuButton
          v-for="option in options"
          :key="option.value"
          class="disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          :icon="option.icon"
          @click="selectOption(option.value)"
          type="button"
          :disabled="disabled"
          :isSelect="true"
          :active="modelValue === option.value"
        >
          {{ option.label }}
        </BaseMenuButton>
      </BaseMenu>
    </Transition>
  </div>
</template>
