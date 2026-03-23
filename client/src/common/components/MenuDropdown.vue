<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { ChevronDown, Check } from 'lucide-vue-next';

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
  <div class="menu-wrapper" ref="wrapperRef">
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

        <ChevronDown :size="16" :class="{ 'chevron-open': isOpen }" />
      </div>
    </button>

    <div
        v-if="isOpen"
        class="dropdown-menu"
    >
      <button
          v-for="option in options"
          :key="option.value"
          class="menu-btn"
          :class="{ active: modelValue === option.value }"
          @click="selectOption(option.value)"
          type="button"
          :disabled="disabled"
      >
        <div class="menu-btn-content">
          <component
              v-if="option.icon"
              :is="option.icon"
              :size="16"
          />
          {{ option.label }}
        </div>

        <Check v-if="modelValue === option.value" :size="16" class="check-icon" />
        <span class="spacer" v-else></span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.menu-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
}

.menu-btn:hover:not(:disabled) {
  background: var(--color-surface-hover);
}

.menu-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lucide-chevron-down {
  margin-left: auto;
  transition: transform 0.2s ease;
}

.chevron-open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  min-width: 100%;
  margin-top: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 12px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1100;
  box-shadow: var(--shadow-menu);
  animation: menuFadeIn 160ms ease;
}

.check-icon {
  color: var(--color-on-surface);
  flex-shrink: 0;
}

.spacer {
  width: 16px;
  flex-shrink: 0;
}

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>