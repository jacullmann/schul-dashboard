// NewOldSwitch.vue

<template>
  <n-switch :value="props.modelValue" @update:value="handleChange" :rail-style="railStyle">
    <template #checked>
      Alte Einträge
    </template>
    <template #unchecked>
      Neue Einträge
    </template>
  </n-switch>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { CSSProperties } from 'vue'

const message = useMessage()

// Definiere props und emits, um die Komponente als v-model:value zu verwenden
const props = defineProps<{
  // modelValue ist der Standardname für v-model
  modelValue: boolean // true = Alte Einträge, false = Neue Einträge (Default)
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

function handleChange(value: boolean) {
  emit('update:modelValue', value) // Sende den neuen Zustand an die Elternkomponente
  if (value === true) {
    message.info('Lade Einträge, die seit mehr als 48 Stunden abgelaufen sind.')
  } else if (value === false) {
    message.info(`Lade Einträge, die noch nicht oder seit höchstens 48 Stunden abgelaufen sind.`)
  }
}


function railStyle({ focused, checked }: { focused: boolean, checked: boolean }): CSSProperties {
  const style: CSSProperties = {}
  if (checked) {
    style.background = '#d83737'
    if (focused) {
      style.boxShadow = '0 0 0 0 #d0305040'
    }
  }
  else {
    style.background = '#049704'
    if (focused) {
      style.boxShadow = '0 0 0 0 #2080f040'
    }
  }
  return style
}
</script>

<style scoped>

</style>