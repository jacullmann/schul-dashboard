<script setup lang="ts">
import { onMounted, useTemplateRef, type InputHTMLAttributes } from 'vue';
import { useI18n } from 'vue-i18n';
import { Search } from '@lucide/vue';

/** The search on wider screens: a dialog centred over the shaded page. */
defineProps<{
  label: string;
  placeholder: string;
  /** Wires the input up as the combobox controlling the results. */
  inputAttrs: InputHTMLAttributes;
}>();

defineEmits<{ cancel: [] }>();

const query = defineModel<string>({ required: true });

const { t } = useI18n();
const input = useTemplateRef('input');

function focus() {
  input.value?.focus({ preventScroll: true });
}

onMounted(focus);

defineExpose({ focus });
</script>

<template>
  <BaseBackdrop class="z-(--z-modal-overlay)" @cancel="$emit('cancel')">
    <div
      role="dialog"
      aria-modal="true"
      :aria-label="label"
      class="bg-surface border border-ghost-border rounded-2xl w-[calc(100%-32px)] max-w-140 overflow-hidden fixed text-left z-100001"
    >
      <div class="flex items-center gap-3 p-4 border-b border-ghost-border">
        <Search :size="20" class="text-on-ghost-subtle shrink-0" />
        <input
          ref="input"
          v-model="query"
          v-bind="inputAttrs"
          type="text"
          :aria-label="label"
          :placeholder="placeholder"
          autocomplete="off"
          spellcheck="false"
          class="flex-1 w-full p-0 rounded-none bg-transparent border-none outline-none shadow-none text-on-ghost text-base/4 placeholder:text-on-ghost-subtle"
        />
        <BaseKbd>Esc</BaseKbd>
      </div>

      <div class="max-h-105 overflow-y-auto">
        <slot></slot>
      </div>

      <div
        class="flex px-4 py-2.5 border-t border-ghost-border items-center gap-4 text-xs text-on-ghost-muted"
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
