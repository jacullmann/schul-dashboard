<script setup lang="ts">
import { defineModel } from 'vue';

const modelValue = defineModel<string>({ required: true });

const options = [
  {
    value: 'instant',
    label: 'Instant',
    description: 'Swift answers for simple tasks',
  },
  { value: 'pro', label: 'Pro', description: 'Thinking for everyday tasks' },
  {
    value: 'ultra',
    label: 'Ultra',
    description: 'Deep reasoning for complex tasks',
  },
];
</script>

<template>
  <div
    class="w-full max-w-3xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 px-4"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      @click="modelValue = option.value"
      class="text-left p-5 rounded-2xl border transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary"
      :class="[
        modelValue === option.value
          ? 'bg-surface-hover border-on-surface/30 shadow-sm'
          : 'bg-surface border-surface-border hover:border-surface-border-hover',
      ]"
    >
      <div class="font-medium text-lg text-on-surface mb-1">
        {{ option.label }}
      </div>
      <div class="text-sm text-on-surface-subtle">{{ option.description }}</div>
    </button>
  </div>
</template>
