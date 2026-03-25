<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
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

function handleClickOutside(event: MouseEvent) {
  if (!isOpen.value) return;

  if (wrapperRef.value && !wrapperRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="relative w-full" ref="wrapperRef">
    <button
        class="menu-btn"
        @click="toggleMenu"
        :disabled="disabled"
        type="button"
        aria-haspopup="true"
        :aria-expanded="isOpen"
    >
      <div class="menu-btn-content">
        <component
            v-if="selectedOption?.icon"
            :is="selectedOption.icon"
            :size="16"
        />

        <span>
          {{ prefix ? prefix + ' ' : '' }}{{ selectedOption?.label || '' }}
        </span>

        <ChevronDown :size="16" class="ml-auto shrink-0 transition duration-200 ease-in-out" :class="{ 'rotate-180': isOpen }" />
      </div>
    </button>

    <BaseMenu
        v-if="isOpen"
        class="top-full max-h-80 mt-1"
    >
      <BaseMenuButton
          v-for="option in options"
          :key="option.value"
          class="menu-btn"
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

<style scoped>
.menu-btn:hover:not(:disabled) {
  background: var(--color-surface-hover);
}

.menu-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>