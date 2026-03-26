<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(defineProps<{
  as?: 'input' | 'textarea';
}>(), {
  as: 'input'
});

const model = defineModel<string | number | null>();
const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);

const baseClasses= "w-full px-3 py-2 rounded-md bg-surface text-on-surface border border-surface-border text-btn leading-4 outline-none shadow-input transition-focus focus:border-focus focus:shadow-focus placeholder:text-on-surface-subtle";

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  select: () => inputRef.value?.select(),
});
</script>

<template>
  <textarea
    v-if="as === 'textarea'"
    :class="baseClasses"
    v-model="model"
    ref="inputRef"
  ></textarea>
  <input
    v-else
    :class="baseClasses"
    v-model="model"
    ref="inputRef"
  />
</template>
