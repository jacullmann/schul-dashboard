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

const props = withDefaults(
  defineProps<{
    modelValue: string;
    options: UnitOption[];
    disabled?: boolean;
    form?: boolean;
    on?: 'ghost' | 'action';
    classes?: string;
  }>(),
  {
    disabled: false,
    form: true,
    on: 'ghost',
  },
);

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

      if (floatingRef.value) {
        // floatingRef.value is a Vue component instance, so we need to access its exposed menuEl
        const menuEl = (floatingRef.value as any).menuEl as HTMLElement;

        // BaseMenuButton uses aria-checked="true" for the active state
        const selectedElement = menuEl?.querySelector(
          '[aria-checked="true"]',
        ) as HTMLElement | null;

        if (selectedElement) {
          // Use requestAnimationFrame to ensure the DOM is fully rendered before scrolling
          requestAnimationFrame(() => {
            selectedElement.scrollIntoView({
              block: 'nearest',
              behavior: 'auto',
            });
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

onClickOutside(
  wrapperRef,
  () => {
    isOpen.value = false;
  },
  { ignore: [computed(() => (floatingRef.value as any)?.menuEl)] },
);
</script>

<template>
  <div class="relative">
    <BaseButton
      ref="wrapperRef"
      @click="toggleMenu"
      :disabled="disabled"
      class="outline-none"
      :class="[
        form
          ? 'transition-focus ' +
            (isOpen ? 'border-focus shadow-focus-ring' : '')
          : isOpen
            ? `bg-${on}-hover! text-on-${on}!`
            : '',
        classes,
      ]"
      aria-haspopup="true"
      :aria-expanded="isOpen"
      :variant="form ? 'input' : 'ghost'"
      :on="props.on"
      :icon="ChevronDown"
      iconPlacement="trailing"
      :iconClasses="
        'ml-auto shrink-0 transition duration-200 ease-in-out' +
        (isOpen ? ' rotate-180' : '')
      "
    >
      <span class="truncate">
        {{
          options.find((o) => o.value === modelValue)?.label ||
          t('global.selection.placeholder')
        }}
      </span>
    </BaseButton>

    <Teleport to="body">
      <BaseMenu
        :open="isOpen"
        @close="isOpen = false"
        ref="floatingRef"
        :style="floatingStyles"
        class="max-h-80 z-[9999]"
      >
        <BaseMenuButton
          v-for="option in options"
          :key="option.value"
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
