<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { ChevronDown, Check } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

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

const toggleMenu = async () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value;

    if (isOpen.value) {
      // 1. Wait for the v-if to render the dropdown list
      await nextTick();

      if (wrapperRef.value) {
        // 2. Find the active item using the class you already set up
        const selectedElement = wrapperRef.value.querySelector('.active') as HTMLElement | null;

        if (selectedElement) {
          // 3. Scroll it into view
          selectedElement.scrollIntoView({
            block: 'nearest',
            behavior: 'auto'
          });
        }
      }
    }
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

<template>
  <div :class="['menu-wrapper', extraClass]" ref="wrapperRef">
    <BaseButton @click="toggleMenu" :disabled="disabled" type="button" aria-haspopup="true" :aria-expanded="isOpen" variant="ghost">
      <span class="btn-content">
        <span>
          {{ options.find(o => o.value === modelValue)?.label || t('global.selection.placeholder') }}
        </span>
        <ChevronDown :size="16" class="chevron" :class="{ 'chevron-open': isOpen }" />
      </span>
    </BaseButton>

    <div v-if="isOpen" class="select-menu">
      <button
          v-for="option in options"
          :key="option.value"
          class="menu-btn"
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

<style scoped>
.menu-wrapper {
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

.select-menu {
  position: absolute;
  top: 100%;
  min-width: 100%;
  max-height: 320px;
  margin-top: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: var(--radius-lg);
  padding: 4px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  gap: 4px;
  z-index: 999;
  box-shadow: var(--shadow-menu);
  animation: menuFadeIn 160ms ease;
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