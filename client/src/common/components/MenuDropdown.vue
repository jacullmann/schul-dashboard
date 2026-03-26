<script setup lang="ts">
import { ref, computed } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { ChevronDown, Check } from '@lucide/vue';

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
  return props.options.find(o => o.value === props.modelValue);
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
    >
      <component
          v-if="selectedOption?.icon"
          :is="selectedOption.icon"
          :size="16"
      />

      <span>
        {{ prefix ? prefix + ' ' : '' }}{{ selectedOption?.label || '' }}
      </span>

      <ChevronDown :size="16" class="ml-auto shrink-0 transition duration-200 ease-in-out" :class="{ 'rotate-180': isOpen }" />
    </BaseMenuButton>

    <BaseMenu
        v-if="isOpen"
        class="top-full min-w-full max-h-80 mt-1"
    >
      <BaseMenuButton
          v-for="option in options"
          :key="option.value"
          class="disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          :class="{ active: modelValue === option.value }"
          @click="selectOption(option.value)"
          type="button"
          :disabled="disabled"
          :isSelect="true"
          :active="modelValue === option.value"
      >
        <component
            v-if="option.icon"
            :is="option.icon"
            :size="16"
        />
        {{ option.label }}
      </BaseMenuButton>
    </BaseMenu>
  </div>
</template>
