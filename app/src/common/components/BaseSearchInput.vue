<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Search, X } from '@lucide/vue';

defineProps<{
  id: string;
  placeholder: string;
}>();

defineOptions({
  inheritAttrs: false,
});

const { t } = useI18n();
const query = defineModel<string>({ required: true });
const inputRef = ref<HTMLInputElement | null>(null);

function clearQuery() {
  query.value = '';
  inputRef.value?.blur();
}

function onEscape(event: KeyboardEvent) {
  if (!query.value) return;
  // Swallow the key only when it clears, so an empty field still lets Escape
  // close whatever modal or sheet surrounds it.
  event.stopPropagation();
  query.value = '';
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
});
</script>

<template>
  <label
    :for="id"
    class="flex items-center h-10 w-full rounded-full bg-ghost-hover border border-transparent transition-focus cursor-text focus-within:border-focus focus-within:shadow-focus-ring"
    v-bind="$attrs"
  >
    <span class="shrink-0 w-10 flex justify-center text-on-ghost-subtle">
      <Search :size="20" aria-hidden="true" />
    </span>
    <input
      :id="id"
      ref="inputRef"
      v-model="query"
      type="search"
      :placeholder="placeholder"
      :aria-label="placeholder"
      autocomplete="off"
      spellcheck="false"
      class="flex-1 min-w-0 h-full p-0 bg-transparent border-none outline-none shadow-none rounded-none text-on-ghost text-base/5 placeholder:text-on-ghost-subtle [&::-webkit-search-cancel-button]:appearance-none"
      :class="{ 'pr-4': !query }"
      @keydown.esc="onEscape"
    />
    <BaseButton
      v-if="query"
      class="shrink-0 mx-2"
      size="xs"
      :icon="X"
      :aria-label="t('common.buttons.clear')"
      @click="clearQuery"
    />
  </label>
</template>
