<template>
  <div class="dropdown-wrapper" ref="wrapperRef">
    <button
        :class="['btn ghost', extraClass]"
        @click="toggleMenu"
        :disabled="disabled"
        type="button"
        aria-haspopup="true"
        :aria-expanded="isOpen"
    >
      <div class="btn-content">
        <span>
          {{ options.find(o => o.value === modelValue)?.label || 'Bitte Wählen' }}
        </span>
        <ChevronDown :size="16" class="chevron" :class="{ 'chevron-open': isOpen }" />
      </div>
    </button>

    <div v-if="isOpen" class="dropdown-menu">
      <button
          v-for="option in options"
          :key="option.value"
          class="dropdown-item"
          :class="{ active: modelValue === option.value }"
          @click="selectOption(option.value)"
          type="button"
      >
        {{ option.label }}
        <Check v-if="modelValue === option.value" :size="16"  />
        <span class="spacer" v-else></span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { ChevronDown, Check } from 'lucide-vue-next';

export interface UnitOption {
  label: string;
  value: string;
}

const props = defineProps<{
  modelValue: string;
  options: UnitOption[];
  disabled?: boolean;
  extraClass?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const isOpen = ref(false);
const wrapperRef = ref<HTMLElement | null>(null);

const toggleMenu = () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value;
  }
};

const selectOption = (value: string) => {
  emit('update:modelValue', value);
  isOpen.value = false;
};

const handleClickOutside = (event: MouseEvent) => {
  if (wrapperRef.value && !wrapperRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => document.addEventListener('click', handleClickOutside));
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside));
</script>

<style scoped>
.dropdown-wrapper {
  position: relative;
}

.btn {
  width: 100%;
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1;
  width: 100%;
}

.chevron {
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
  max-height: 320px;
  margin-top: 4px;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: var(--border-5);
  padding: 4px;
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
  gap: 4px;
  z-index: 999;
  box-shadow: var(--menu-shadow);
  animation: menuFadeIn 160ms ease;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  justify-content: space-between;
  background: transparent;
  border: none;
  padding: 8px;
  color: var(--text);
  border-radius: var(--border-4);
  cursor: pointer;
  font-size: var(--font-size-sub);
  transition: background 0.2s ease;
  white-space: nowrap;
}

.dropdown-item:hover:not(:disabled) {
  background: var(--gg);
}

.dropdown-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dropdown-item.active {
  font-weight: 600;
}

.lucide-check {
  color: var(--text);
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