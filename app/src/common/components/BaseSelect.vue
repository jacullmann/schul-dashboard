<script setup lang="ts">
import { ref, nextTick, computed, useAttrs } from 'vue';
import { onClickOutside, useElementBounding } from '@vueuse/core';
import { ChevronDown } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue';

const { t } = useI18n();

export interface UnitOption {
  label: string;
  value: string;
  hint?: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: string | null;
    options: UnitOption[];
    disabled?: boolean;
    form?: boolean;
    on?: 'ghost' | 'action';
    classes?: string;
    /** Mobile sheet title; defaults to the text of the select's label. */
    title?: string;
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

const attrs = useAttrs();
const sheetTitle = ref<string>();

// Text of the <label for="id"> pointing at this select, without decorations
// like BaseLabel's aria-hidden required asterisk.
function getLabelText(): string | undefined {
  const id = attrs.id;
  if (typeof id !== 'string') return undefined;

  const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
  if (!label) return undefined;

  const clone = label.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove());
  return clone.textContent?.trim() || undefined;
}

const toggleMenu = async () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value;

    if (isOpen.value) {
      sheetTitle.value = props.title ?? getLabelText();
      await nextTick();

      if (floatingRef.value) {
        const innerMenuEl = floatingRef.value.menuEl as HTMLElement;

        const selectedElement = innerMenuEl?.querySelector(
          '[aria-checked="true"]',
        );

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

const selectedOption = computed(() =>
  props.options.find((o) => o.value === props.modelValue),
);

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
      icon-placement="trailing"
      :icon-classes="
        'text-on-ghost-muted ml-auto shrink-0 transition duration-200 ease-in-out' +
        (isOpen ? ' rotate-180' : '')
      "
      @click="toggleMenu"
    >
      <span class="truncate">
        {{ selectedOption?.label || t('common.selection.placeholder') }}
        <span v-if="selectedOption?.hint" class="text-on-ghost-muted">{{
          selectedOption.hint
        }}</span>
      </span>
    </BaseButton>

    <Teleport to="body">
      <BaseMenu
        ref="floatingRef"
        :open="isOpen"
        :title="sheetTitle"
        :style="selectStyles"
        class="max-h-80 z-[9999]"
        @close="isOpen = false"
      >
        <BaseMenuButton
          v-for="option in options"
          :key="option.value"
          type="button"
          :is-select="true"
          :active="modelValue === option.value"
          @click="selectOption(option.value)"
        >
          {{ option.label }}
          <span v-if="option.hint" class="text-on-ghost-muted">{{
            option.hint
          }}</span>
        </BaseMenuButton>
      </BaseMenu>
    </Teleport>
  </div>
</template>
