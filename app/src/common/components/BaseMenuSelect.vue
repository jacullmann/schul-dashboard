<script setup lang="ts">
import { computed } from 'vue';
import BaseSubmenu from '@/common/components/BaseSubmenu.vue';
import BaseMenuButton from '@/common/components/BaseMenuButton.vue';

export interface MenuOption {
  value: string;
  label: string;
  icon?: any;
}

const props = defineProps<{
  modelValue: string;
  options: MenuOption[];
  prefix?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const selectedOption = computed(() => {
  return props.options.find((o) => o.value === props.modelValue);
});

const labelText = computed(() => {
  return `${props.prefix ? props.prefix + ' ' : ''}${selectedOption.value?.label || ''}`;
});

function selectOption(value: string) {
  emit('update:modelValue', value);
}
</script>

<template>
  <BaseSubmenu
    :label="labelText"
    :icon="selectedOption?.icon"
    :disabled="disabled"
  >
    <BaseMenuButton
      v-for="option in options"
      :key="option.value"
      class="disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed"
      :icon="option.icon"
      @click="selectOption(option.value)"
      type="button"
      :disabled="disabled"
      :isSelect="true"
      :active="modelValue === option.value"
    >
      {{ option.label }}
    </BaseMenuButton>
  </BaseSubmenu>
</template>
