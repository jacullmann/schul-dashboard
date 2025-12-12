<template>
  <button
      class="btn ghost"
      :class="{ 'is-showing-old': props.modelValue }"
      @click="toggleState"
  >
    <span :key="buttonText">
        {{ buttonText }}
      </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const buttonText = computed(() => {
  if (props.modelValue) {
    return 'Eintragarchiv verlassen'
  } else {
    return 'Eintragsarchiv anzeigen'
  }
})

function toggleState() {
  handleChange(!props.modelValue)
}

function handleChange(value: boolean) {
  emit('update:modelValue', value)
}
</script>

<style scoped>
</style>