<script setup lang="ts">
import { Check } from '@lucide/vue'

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

function handleLabelClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('a')) {
    event.stopPropagation()
  }
}
</script>

<template>
  <label class="collapse-checkbox">
    <input
        type="checkbox"
        class="sr-only"
        :checked="modelValue || checked"
        @change="handleChange"
    />
    <span class="vis-label" aria-hidden="true">
      <Check class="check-icon" stroke-width="3" />
    </span>
    <span
        v-if="$slots.default"
        class="text-sub leading-[18px] flex-1"
        @click="handleLabelClick"
    >
      <slot></slot>
    </span>
  </label>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.collapse-checkbox {
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  /* reset global label styles */
  font: inherit;
  color: inherit;
  margin: 0;
  padding: 0;
  position: relative;
  z-index: 0;
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

.collapse-checkbox .vis-label::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 34px; 
  height: 34px;
  border-radius: var(--radius-full);
  background-color: transparent;
  transition: var(--transition-hover);
  z-index: -1;
}

.collapse-checkbox:hover .vis-label::before {
  background-color: var(--color-surface-hover); 
}

.check-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  max-width: none;
  flex-shrink: 0;
  color: var(--color-on-action);
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  transition: stroke-dashoffset 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}

.collapse-checkbox input:checked + .vis-label .check-icon {
  stroke-dashoffset: 48;
}
</style>