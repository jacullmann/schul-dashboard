<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Search } from '@lucide/vue';
import {
  commandPaletteDefaults,
  useCommandPalette,
  type CommandPaletteProps,
} from '@/common/composables/useCommandPalette';

const props = withDefaults(
  defineProps<CommandPaletteProps>(),
  commandPaletteDefaults,
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'select', index: number): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();
const inputRef = ref<HTMLInputElement | null>(null);

const { selectedIndex, handleKeydown, setSelectedIndex } = useCommandPalette(
  props,
  {
    select: (index) => emit('select', index),
    cancel: () => emit('cancel'),
  },
);

onMounted(() => {
  setTimeout(() => inputRef.value?.focus(), 50);
});

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value);
}
</script>

<template>
  <BaseBackdrop class="z-(--z-modal-overlay)" @cancel="$emit('cancel')">
    <div
      role="dialog"
      aria-modal="true"
      :aria-label="title ?? t('common.sidebar.search')"
      class="bg-surface border border-ghost-border rounded-2xl w-[calc(100%-32px)] max-w-140 overflow-hidden fixed text-left z-100001"
      @keydown="handleKeydown"
    >
      <div class="flex items-center gap-3 p-4 border-b border-ghost-border">
        <Search :size="20" class="text-on-ghost-subtle shrink-0" />
        <input
          :id="`${idPrefix}input`"
          ref="inputRef"
          :value="modelValue"
          type="text"
          :placeholder="placeholder"
          autocomplete="off"
          spellcheck="false"
          class="flex-1 w-full p-0 rounded-none bg-transparent border-none outline-none shadow-none text-on-ghost text-base/4 placeholder:text-on-ghost-subtle"
          @input="onInput"
        />
        <BaseKbd class="hidden! sm:inline-flex!">Esc</BaseKbd>
      </div>

      <div class="max-h-105 overflow-y-auto">
        <slot
          :selected-index="selectedIndex"
          :set-selected-index="setSelectedIndex"
        ></slot>
      </div>

      <div
        class="hidden sm:flex px-4 py-2.5 border-t border-ghost-border items-center gap-4 text-xs text-on-ghost-muted"
      >
        <BaseRow>
          <BaseKbd>↑</BaseKbd>
          <BaseKbd>↓</BaseKbd>
          {{ t('search.modal.hint_navigate') }}
        </BaseRow>
        <BaseRow>
          <BaseKbd>↵</BaseKbd>
          {{ t('search.modal.hint_confirm') }}
        </BaseRow>
      </div>
    </div>
  </BaseBackdrop>
</template>
