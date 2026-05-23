<script setup lang="ts">
import { ref, nextTick, computed } from 'vue';
import { onClickOutside, useElementBounding } from '@vueuse/core';
import { ChevronDown } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue';

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
const wrapperRef = ref<any>(null);
const floatingRef = ref<any>(null);

const triggerEl = computed(() => wrapperRef.value?.$el || null);
const menuEl = computed(() => floatingRef.value?.menuEl || null);

const { floatingStyles, isPositioned } = useFloating(triggerEl, menuEl, {
  placement: 'bottom-start',
  whileElementsMounted: autoUpdate,
  transform: false,
  middleware: [offset(4), flip(), shift({ padding: 8 })],
});

const { width } = useElementBounding(triggerEl);

const selectStyles = computed(() => ({
  ...floatingStyles.value,
  width: `${width.value}px`,
  zIndex: 100002,
  opacity: isPositioned.value ? undefined : 0,
}));

const toggleMenu = async () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value;

    if (isOpen.value) {
      await nextTick();

      if (floatingRef.value) {
        const innerMenuEl = floatingRef.value.menuEl as HTMLElement;

        const selectedElement = innerMenuEl?.querySelector(
          '[aria-checked="true"]',
        ) as HTMLElement | null;

        if (selectedElement) {
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
  { ignore: [menuEl] },
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
            (isOpen ? 'border-focus! shadow-focus-ring!' : '')
          : isOpen
            ? props.on === 'ghost'
              ? 'bg-ghost-hover! text-on-ghost!'
              : 'bg-action-hover! text-on-action!'
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
        :style="selectStyles"
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
