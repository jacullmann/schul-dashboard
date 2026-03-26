<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { ChevronDown, Check } from '@lucide/vue';
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
      await nextTick();

      if (wrapperRef.value) {
        const selectedElement = wrapperRef.value.querySelector('.active') as HTMLElement | null;

        if (selectedElement) {
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
  <div class="relative" :class="extraClass" ref="wrapperRef">
    <BaseButton
        @click="toggleMenu"
        :disabled="disabled"
        type="button"
        class="w-full focus:border-focus focus:shadow-focus outline-none transition-focus"
        :class="{ 'border-focus shadow-focus': isOpen }"
        aria-haspopup="true"
        :aria-expanded="isOpen"
        variant="ghost"
    >
      <span class="truncate">
        {{ options.find(o => o.value === modelValue)?.label || t('global.selection.placeholder') }}
      </span>

      <ChevronDown :size="16" class="ml-auto shrink-0 transition duration-200 ease-in-out" :class="{ 'rotate-180': isOpen }" />
    </BaseButton>

    <BaseMenu v-if="isOpen" class="top-full min-w-full max-h-80 mt-1">
      <BaseMenuButton
          v-for="option in options"
          :key="option.value"
          :class="{ 'font-semibold': modelValue === option.value }"
          @click="selectOption(option.value)"
          type="button"
          :isSelect="true"
          :active="modelValue === option.value"
      >
        {{ option.label }}
      </BaseMenuButton>
    </BaseMenu>
  </div>
</template>
