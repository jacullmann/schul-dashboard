<script setup lang="ts">
import { ref, nextTick, computed } from 'vue';
import {
  useWindowSize,
  onClickOutside,
  useElementBounding,
} from '@vueuse/core';
import { ChevronDown } from '@lucide/vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const modelValue = defineModel<string>({ required: true });

// --- NEW: Added Props and Emits for Lock-in functionality ---
const props = defineProps<{
  isLocked?: boolean;
}>();

const emit = defineEmits(['require-reset']);

const options = [
  {
    value: 'instant',
    label: 'Instant',
    description: 'Swift answers for simple tasks',
  },
  { value: 'pro', label: 'Pro', description: 'Thinking for everyday tasks' },
  {
    value: 'ultra',
    label: 'Ultra',
    description: 'Deep reasoning for complex tasks',
  },
];

const isOpen = ref(false);
const wrapperRef = ref<HTMLElement | null>(null);
const floatingRef = ref<HTMLElement | null>(null);

const {
  left,
  right,
  bottom,
  top: triggerTop,
  width: buttonWidth,
} = useElementBounding(wrapperRef);
const { width: windowWidth, height: windowHeight } = useWindowSize();
const { height: menuActualHeight } = useElementBounding(floatingRef);

const floatingStyles = computed(() => {
  const menuMinWidth = 256;
  const menuWidth = Math.max(buttonWidth.value, menuMinWidth);
  const h = menuActualHeight.value || 280;

  const shouldFlipHorizontally = left.value + menuWidth > windowWidth.value;
  const shouldFlipVertically = bottom.value + h > windowHeight.value;

  return {
    position: 'fixed' as const,
    top: shouldFlipVertically
      ? `${triggerTop.value - h - 4}px`
      : `${bottom.value + 4}px`,
    left: shouldFlipHorizontally
      ? `${right.value - menuWidth}px`
      : `${left.value}px`,
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
  if (value === modelValue.value) {
    isOpen.value = false;
    return;
  }

  // --- NEW: Intercept lock logic ---
  if (props.isLocked) {
    emit('require-reset', value);
  } else {
    modelValue.value = value;
  }

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
      :class="{ 'bg-surface-hover! text-on-ghost!': isOpen }"
      aria-haspopup="true"
      :aria-expanded="isOpen"
      variant="ghost"
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
      <Transition name="fade-dropdown">
        <BaseMenu
          v-if="isOpen"
          ref="floatingRef"
          :style="floatingStyles"
          class="max-h-80 z-[9999] min-w-68!"
        >
          <BaseMenuButton
            v-for="option in options"
            :key="option.value"
            @click="selectOption(option.value)"
            :isSelect="true"
            :active="modelValue === option.value"
          >
            {{ option.label }}
            <template #description>{{ option.description }}</template>
          </BaseMenuButton>
        </BaseMenu>
      </Transition>
    </Teleport>
  </div>
</template>
