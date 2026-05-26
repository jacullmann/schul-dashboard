<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import { Search } from '@lucide/vue';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    itemCount: number;
    placeholder?: string;
    title?: string;
    idPrefix?: string;
  }>(),
  {
    placeholder: '',
    title: 'Search',
    idPrefix: 'command-result-',
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'select', index: number): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();
const inputRef = ref<HTMLInputElement | null>(null);
const selectedIndex = ref(0);

watch(
  () => props.itemCount,
  () => {
    selectedIndex.value = 0;
  },
);

watch(
  () => props.modelValue,
  () => {
    selectedIndex.value = 0;
  },
);

async function scrollToSelected() {
  await nextTick();
  const el = document.getElementById(`${props.idPrefix}${selectedIndex.value}`);
  if (el) {
    el.scrollIntoView({ behavior: 'auto', block: 'nearest' });
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (!props.itemCount) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex.value = (selectedIndex.value + 1) % props.itemCount;
    scrollToSelected();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex.value =
      (selectedIndex.value - 1 + props.itemCount) % props.itemCount;
    scrollToSelected();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    emit('select', selectedIndex.value);
  }
}

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('cancel');
});

onMounted(() => {
  setTimeout(() => inputRef.value?.focus(), 50);
});

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value);
}

function setSelectedIndex(idx: number) {
  selectedIndex.value = idx;
}
</script>

<template>
  <BaseBackdrop class="z-(--z-modal-overlay)" @cancel="$emit('cancel')">
    <div
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      class="search-in bg-surface border border-surface-border rounded-2xl w-[calc(100%-32px)] max-w-140 overflow-hidden fixed text-left"
      style="
        z-index: 100003;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      "
      @keydown="handleKeydown"
    >
      <div class="flex items-center gap-3 p-4 border-b border-surface-border">
        <Search :size="20" class="text-on-ghost-subtle shrink-0" />
        <input
          :id="`${idPrefix}input`"
          ref="inputRef"
          :value="modelValue"
          @input="onInput"
          type="text"
          :placeholder="placeholder"
          autocomplete="off"
          spellcheck="false"
          class="flex-1 w-full p-0 rounded-none bg-transparent border-none outline-none shadow-none text-on-ghost text-base/4 placeholder:text-on-ghost-subtle"
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
        class="hidden sm:flex px-4 py-2.5 border-t border-surface-border items-center gap-4 text-xs text-on-ghost-muted"
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
