<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import BaseKbd from '@/common/components/BaseKbd.vue';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    itemCount: number;
    placeholder?: string;
    title?: string;
    icon?: any;
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
  }
);

watch(
  () => props.modelValue,
  () => {
    selectedIndex.value = 0;
  }
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
    selectedIndex.value = (selectedIndex.value - 1 + props.itemCount) % props.itemCount;
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
  <div
    class="blurit"
    @click.self="$emit('cancel')"
    aria-hidden="true"
    style="z-index: 100002"
  >
    <div
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      class="command-palette-modal bg-surface border border-surface-border rounded-2xl w-[calc(100%-32px)] max-w-[560px] overflow-hidden fixed text-left"
      style="
        z-index: 100003;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      "
      @keydown="handleKeydown"
    >
      <!-- Search input -->
      <div class="flex items-center gap-3 p-4 border-b border-surface-border">
        <component
          :is="icon"
          v-if="icon"
          :size="20"
          class="text-on-surface-subtle shrink-0"
        />
        <input
          :id="`${idPrefix}input`"
          ref="inputRef"
          :value="modelValue"
          @input="onInput"
          type="text"
          :placeholder="placeholder"
          autocomplete="off"
          spellcheck="false"
          class="flex-1 w-full p-0 leading-4 rounded-none bg-transparent border-none outline-none shadow-none text-on-surface text-body placeholder:text-on-surface-subtle"
        />
        <BaseKbd class="hidden sm:inline-flex">Esc</BaseKbd>
      </div>

      <!-- Results -->
      <div class="max-h-[420px] overflow-y-auto py-2">
        <slot
          :selected-index="selectedIndex"
          :set-selected-index="setSelectedIndex"
        ></slot>
      </div>

      <!-- Footer hint -->
      <div
        class="px-4 py-2.5 border-t border-surface-border flex items-center gap-4 text-footnote text-on-surface-muted"
      >
        <span class="flex items-center gap-1">
          <BaseKbd>↑</BaseKbd>
          <BaseKbd>↓</BaseKbd>
          {{ t('search.modal.hintNavigate') }}
        </span>
        <span class="flex items-center gap-1">
          <BaseKbd>↵</BaseKbd>
          {{ t('search.modal.hintConfirm') }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.command-palette-modal {
  /* Smooth appear animation */
  animation: search-in 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes search-in {
  from {
    opacity: 0;
    transform: translate(-50%, calc(-50% - 8px)) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

/* Custom scrollbar */
.max-h-\[420px\]::-webkit-scrollbar {
  width: 4px;
}

.max-h-\[420px\]::-webkit-scrollbar-track {
  background: transparent;
}

.max-h-\[420px\]::-webkit-scrollbar-thumb {
  background: var(--color-surface-border);
  border-radius: 999px;
}
</style>
