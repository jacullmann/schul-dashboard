<script setup lang="ts">
import { Check } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue?: boolean
  checked?: boolean
}>(), {
  modelValue: false,
  checked: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', event: Event): void
}>()

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
  emit('change', event)
}
</script>

<template>
  <label class="collapse-checkbox">
    <input
        type="checkbox"
        :checked="modelValue || checked"
        @change="handleChange"
    />
    <span class="vis-label">
      <Check class="check-icon" stroke-width="3" />
    </span>
  </label>
</template>

<style scoped>
.collapse-checkbox {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  /* reset global label styles */
  font: inherit;
  color: inherit;
  margin: 0;
  padding: 0;
}

.collapse-checkbox input {
  display: none;
}

.collapse-checkbox .vis-label {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-sm);
  border: 2px solid var(--color-on-surface-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  position: relative;
}

.collapse-checkbox .vis-label:hover {
  border-color: var(--color-action);
}

.collapse-checkbox input:checked + .vis-label {
  background: var(--color-action);
  border-color: var(--color-action);
}

.check-icon {
  width: 12px;
  height: 12px;
  color: var(--color-on-action);
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  transition: stroke-dashoffset 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}

.collapse-checkbox input:checked + .vis-label .check-icon {
  stroke-dashoffset: 0;
}
</style>