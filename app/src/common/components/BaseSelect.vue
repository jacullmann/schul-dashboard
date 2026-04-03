<script setup lang="ts">
import { ref, nextTick, computed } from 'vue';
import { onClickOutside, useElementBounding } from '@vueuse/core';
import { ChevronDown } from '@lucide/vue';
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
const floatingRef = ref<HTMLElement | null>(null);

const { left, bottom, width } = useElementBounding(wrapperRef);

const floatingStyles = computed(() => ({
  position: 'fixed' as const,
  top: `${bottom.value + 4}px`,
  left: `${left.value}px`,
  width: `${width.value}px`,
  // Modal is 100001, so we go slightly higher
  zIndex: 100002,
}));

const toggleMenu = async () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value;

    if (isOpen.value) {
      await nextTick();

      // 4. Update querySelector to look inside the teleported floatingRef
      if (floatingRef.value) {
        const selectedElement = floatingRef.value.querySelector('.active') as HTMLElement | null;

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

// 5. Ignore clicks inside the teleported menu so it doesn't immediately close
onClickOutside(wrapperRef, () => {
  isOpen.value = false;
}, { ignore: [floatingRef] });
</script>

<template>
  <div class="relative" :class="extraClass" ref="wrapperRef">
    <BaseButton
        @click="toggleMenu"
        :disabled="disabled"
        type="button"
        class="w-full focus:border-focus focus:shadow-focus-ring outline-none transition-focus"
        :class="{ 'border-focus shadow-focus-ring': isOpen }"
        aria-haspopup="true"
        :aria-expanded="isOpen"
        variant="ghost"
    >
      <span class="truncate">
        {{ options.find(o => o.value === modelValue)?.label || t('global.selection.placeholder') }}
      </span>

      <ChevronDown :size="16" class="ml-auto shrink-0 transition duration-200 ease-in-out" :class="{ 'rotate-180': isOpen }" />
    </BaseButton>

    <Teleport to="body">
      <BaseMenu 
        v-if="isOpen" 
        ref="floatingRef"
        :style="floatingStyles"
        class="max-h-80 z-[9999]" 
      >
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
    </Teleport>
  </div>
</template>