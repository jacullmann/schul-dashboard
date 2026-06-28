<script setup lang="ts">
import { ref, nextTick, computed } from 'vue';
import {
  onClickOutside,
  useElementBounding,
  useWindowSize,
} from '@vueuse/core';
import { ChevronDown } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue';

const { width: windowWidth } = useWindowSize();
const isMobile = computed(() => windowWidth.value < 768);

const { t } = useI18n();

const modelValue = defineModel<string>({ required: true });

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
const floatingComponentRef = ref<any>(null);
const floatingRef = computed(() => floatingComponentRef.value?.menuEl || null);

const { width: buttonWidth } = useElementBounding(wrapperRef);

const { floatingStyles, isPositioned } = useFloating(wrapperRef, floatingRef, {
  placement: 'bottom-start',
  whileElementsMounted: autoUpdate,
  transform: false,
  middleware: [offset(4), flip(), shift({ padding: 8 })],
});

const selectStyles = computed(() => {
  const menuMinWidth = 256;
  const menuWidth = Math.max(buttonWidth.value, menuMinWidth);
  return {
    ...floatingStyles.value,
    width: `${menuWidth}px`,
    zIndex: 100002,
    opacity: isPositioned.value ? undefined : 0,
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
  <div ref="wrapperRef" class="relative">
    <BaseButton
      class="outline-none"
      :class="{ 'bg-surface-hover! text-on-ghost!': isOpen }"
      aria-haspopup="true"
      :aria-expanded="isOpen"
      variant="ghost"
      :icon="ChevronDown"
      icon-placement="trailing"
      :icon-classes="
        'ml-auto shrink-0 transition duration-200 ease-in-out' +
        (isOpen ? ' rotate-180' : '')
      "
      @click="toggleMenu"
    >
      <span class="truncate">
        {{
          options.find((o) => o.value === modelValue)?.label ||
          t('common.selection.placeholder')
        }}
      </span>
    </BaseButton>

    <Teleport to="body" :disabled="isMobile">
      <BaseMenu
        ref="floatingComponentRef"
        :open="isOpen"
        :style="!isMobile ? selectStyles : undefined"
        class="max-h-80 z-[9999] min-w-68!"
        @close="isOpen = false"
      >
        <BaseMenuButton
          v-for="option in options"
          :key="option.value"
          :is-select="true"
          :active="modelValue === option.value"
          :class="
            option.value === 'ultra'
              ? 'opacity-60 bg-transparent! cursor-not-allowed!'
              : ''
          "
          @click="option.value !== 'ultra' ? selectOption(option.value) : null"
        >
          {{ option.label }}
          <template #description>{{ option.description }}</template>
        </BaseMenuButton>
      </BaseMenu>
    </Teleport>
  </div>
</template>
