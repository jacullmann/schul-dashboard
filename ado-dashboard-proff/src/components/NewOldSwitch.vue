<template>
  <button
      class="btn ghost"
      :class="{ 'is-showing-old': props.modelValue }"
      @click="toggleState"
  >
    <component
        :is="activeIcon"
        :key="props.modelValue ? 'right' : 'left'"
        :size="14"
        stroke-width="2.5"
        class="icon"
    />

    <span :key="buttonText">
        {{ buttonText }}
      </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronsRight, ChevronsLeft } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const buttonText = computed(() => {
  if (props.modelValue) {
    return 'Aktuelle Einträge anzeigen'
  } else {
    return 'Alte Einträge anzeigen'
  }
})

const activeIcon = computed(() => {
  if (props.modelValue) {
    return ChevronsRight
  } else {
    return ChevronsLeft
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

.icon {
  display: block;
  line-height: 1;
}
</style>