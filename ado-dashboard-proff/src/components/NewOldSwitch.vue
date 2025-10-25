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
    message.info('Alte Einträge werden geladen')
  } else if (value === false) {
    message.info(`Neue/Aktuelle Einträge werden geladen`)
  }
}


function railStyle({ focused, checked }: { focused: boolean, checked: boolean }): CSSProperties {
  const style: CSSProperties = {}
  if (checked) {
    style.background = '#615b5d'
    if (focused) {
      style.boxShadow = '0 0 0 0 #d0305040'
    }
  }
  else {
    style.background = '#373937'
    if (focused) {
      style.boxShadow = '0 0 0 0 #2080f040'
    }
  }
  return style
}
</script>

<style scoped>

</style>