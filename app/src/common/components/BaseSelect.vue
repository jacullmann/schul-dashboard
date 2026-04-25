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
    size?: 'md' | 'lg';
  }>(),
  {
    disabled: false,
    form: true,
    on: 'ghost',
    size: 'md',
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
  { ignore: [floatingRef] },
);
</script>

<template>
  <div class="relative" ref="wrapperRef">
    <BaseButton
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
      ]"
      aria-haspopup="true"
      :aria-expanded="isOpen"
      :variant="form ? 'input' : 'ghost'"
      :on="props.on"
      :size="props.size"
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
        v-if="isOpen"
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
