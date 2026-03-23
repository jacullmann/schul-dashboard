<script setup lang="ts">
import { ref } from 'vue';

const model = defineModel<string | number>();
const inputRef = ref<HTMLInputElement | null>(null);

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  select: () => inputRef.value?.select(),
  get input() { return inputRef.value; }
});
</script>

<template>
  <input class="input" v-model="model" ref="inputRef" />
</template>
