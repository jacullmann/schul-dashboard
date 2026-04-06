<script setup lang="ts">
import { ref, nextTick, computed } from 'vue';
import { useWindowSize, onClickOutside, useElementBounding } from '@vueuse/core';
import { ChevronDown } from '@lucide/vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { width: windowWidth } = useWindowSize();

const modelValue = defineModel<string>({ required: true });

const options = [
  { value: 'instant', label: 'Instant', description: 'Swift answers for simple tasks' },
  { value: 'pro', label: 'Pro', description: 'Thinking for everyday tasks' },
  { value: 'ultra', label: 'Ultra', description: 'Deep reasoning for complex tasks' },
];

const isOpen = ref(false);
const wrapperRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);

const { left, right, bottom, width: buttonWidth } = useElementBounding(wrapperRef);

const floatingStyles = computed(() => {
  const menuMinWidth = 256; // 64 * 4px = 256px from min-w-64
  const menuWidth = Math.max(buttonWidth.value, menuMinWidth);
  const shouldFlip = left.value + menuWidth > windowWidth.value;

  return {
    position: 'fixed' as const,
    top: `${bottom.value + 4}px`,
    left: shouldFlip ? `${right.value - menuWidth}px` : `${left.value}px`,
    width: `${buttonWidth.value}px`,
    zIndex: 100002,
  };
});

const toggleMenu = async () => {
  isOpen.value = !isOpen.value;

  if (isOpen.value) {
    await nextTick();

    if (floatingRef.value) {
      const selectedElement = floatingRef.value.querySelector(
        '.active',
      ) as HTMLElement | null;

      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'auto',
        });
      }
    }
  }
};

const selectOption = (value: string) => {
  modelValue.value = value;
  isOpen.value = false;
};

onClickOutside(
  wrapperRef,
  () => {
    isOpen.value = false;
  },
  { ignore: [floatingRef] },
);
</script>

<template>
  <div class="relative" ref="wrapperRef">
    <BaseButton
      @click="toggleMenu"
      class="outline-none"
      :class="{ 'bg-surface-hover! text-on-surface!': isOpen }"
      aria-haspopup="true"
      :aria-expanded="isOpen"
      :variant="'ghost'"
      size="lg"
    >
      <span class="truncate">
        {{
          options.find((o) => o.value === modelValue)?.label ||
          t('global.selection.placeholder')
        }}
      </span>

      <ChevronDown
        :size="20"
        class="ml-auto shrink-0 transition duration-200 ease-in-out"
        :class="{ 'rotate-180': isOpen }"
      />
    </BaseButton>

    <Teleport to="body">
      <BaseMenu
        v-if="isOpen"
        ref="floatingRef"
        :style="floatingStyles"
        class="max-h-80 z-[9999] min-w-68!"
      >
        <BaseMenuButton
          v-for="option in options"
          :key="option.value"
          class="px-3!"
          @click="selectOption(option.value)"
          type="button"
          :isSelect="true"
          :active="modelValue === option.value"
        >
          <div class="flex flex-col">
            <span class="text-sm leading-5 text-on-surface font-medium">{{ option.label }}</span>
            <span class="text-xs leading-4 text-on-surface-muted font-normal">{{ option.description }}</span>
          </div>
        </BaseMenuButton>
      </BaseMenu>
    </Teleport>
  </div>
</template>
