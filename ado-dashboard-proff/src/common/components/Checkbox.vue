<template>
  <div class="collapse-checkbox">
    <input
        type="checkbox"
        :checked="modelValue || checked"
        @change="handleChange"
    />
    <span class="vis-label"></span>
  </div>
</template>

<script setup lang="ts">
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

<style scoped>
.collapse-checkbox {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.collapse-checkbox input {
  display: none;
}

.collapse-checkbox .vis-label {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid var(--sub);
  display: inline-block;
  background: transparent;
  position: relative;
}

.collapse-checkbox input:checked + .vis-label {
  background: var(--text);
  border-color: var(--text);
}

.collapse-checkbox .vis-label:hover {
  border-color: var(--text);
}

.collapse-checkbox .vis-label::after {
  content: '';
  position: absolute;
  width: 0;
  height: 0;
  border: solid var(--lbg);
  border-width: 0 2px 2px 0;
  opacity: 0;
  left: 50%;
  top: 32%;
  transform: translate(-50%, -30%) rotate(70deg);
  transition: width 0.3s cubic-bezier(0.25, 1, 0.5, 1),
  height 0.3s cubic-bezier(0.25, 1, 0.5, 1),
  transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}

.collapse-checkbox input:checked + .vis-label::after {
  opacity: 1;
  width: 5px;
  height: 10px;
  transform: translate(-50%, -45%) rotate(45deg);
}
</style>