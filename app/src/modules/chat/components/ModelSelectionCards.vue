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
  <div class="w-full mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 px-0">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      @click="modelValue = option.value"
      class="flex flex-col justify-start text-left px-4 py-3 rounded-2xl border border-surface-border cursor-pointer transition-hover outline-none focus-visible:ring-2 focus-visible:ring-primary"
      :class="[
        modelValue === option.value
          ? 'bg-action'
          : 'bg-surface hover:bg-surface-highlight',
      ]"
    >
      <h3
        class="mb-1"
        :class="
          modelValue === option.value ? 'text-on-action!' : 'text-on-ghost!'
        "
      >
        {{ option.label }}
      </h3>
      <div
        class="text-sm leading-4"
        :class="
          modelValue === option.value
            ? 'text-on-action-muted'
            : 'text-on-ghost-muted'
        "
      >
        {{ option.description }}
      </div>
    </button>
  </div>
</template>
