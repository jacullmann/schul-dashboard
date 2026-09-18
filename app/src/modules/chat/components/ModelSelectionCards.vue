<script setup lang="ts">
import { defineModel } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const modelValue = defineModel<string>({ required: true });

const options = [
  {
    value: 'instant',
    label: 'Instant',
    description: 'chat.models.instant_description',
  },
  { value: 'pro', label: 'Pro', description: 'chat.models.pro_description' },
  {
    value: 'ultra',
    label: 'Ultra',
    description: 'chat.models.ultra_description',
  },
];
</script>

<template>
  <div class="w-full mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 px-0">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="flex flex-col justify-start text-left px-4 py-3 rounded-2xl border border-ghost-border cursor-pointer transition-hover outline-none focus-visible:ring-2 focus-visible:ring-primary"
      :class="[
        modelValue === option.value
          ? 'bg-action'
          : 'bg-surface hover:bg-surface-highlight',
      ]"
      @click="modelValue = option.value"
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
        class="text-sm/4"
        :class="
          modelValue === option.value
            ? 'text-on-action-muted'
            : 'text-on-ghost-muted'
        "
      >
        {{ t(option.description) }}
      </div>
    </button>
  </div>
</template>
