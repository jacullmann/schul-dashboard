<template>
  <button
      class="toggle-btn btn"
      :class="{ 'is-showing-old': props.modelValue }"
      @click="toggleState"
  >
    <transition name="fade" mode="out-in">
      <component
          :is="activeIcon"
          :key="props.modelValue ? 'right' : 'left'"
          :size="16"
          stroke-width="2.5"
          class="icon"
      />
    </transition>

    <transition name="fade" mode="out-in">
      <span :key="buttonText">
        {{ buttonText }}
      </span>
    </transition>
  </button>
</template>



<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { computed } from 'vue'
import { ChevronsRight, ChevronsLeft } from 'lucide-vue-next'

const message = useMessage()

const props = defineProps<{
  modelValue: boolean // false = Neue, true = Alte
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

// Diese Logik war bereits korrekt
const buttonText = computed(() => {
  if (props.modelValue) {
    // Aktuell werden ALTE angezeigt -> Button bietet NEUE an
    return 'Aktuelle Einträge anzeigen'
  } else {
    // Aktuell werden NEUE angezeigt -> Button bietet ALTE an
    return 'Alte Einträge anzeigen'
  }
})

/**
 * NEU: Computed Property für das Icon.
 * Basierend auf deiner Anfrage:
 * - "Aktuelle Einträge anzeigen" (modelValue=true) -> ChevronsRight
 * - "Alte Einträge anzeigen" (modelValue=false) -> ChevronsLeft
 */
const activeIcon = computed(() => {
  if (props.modelValue) {
    return ChevronsRight
  } else {
    return ChevronsLeft
  }
})

// Diese Logik war bereits korrekt
function toggleState() {
  handleChange(!props.modelValue)
}

// Diese Logik war bereits korrekt
function handleChange(value: boolean) {
  emit('update:modelValue', value)
  if (value) {
    message.info('Lade Einträge, die seit mehr als 48 Stunden abgelaufen sind.')
  } else if (!value) {
    message.info(`Lade Einträge, die noch nicht oder seit höchstens 48 Stunden abgelaufen sind.`)
  }
}
</script>

<style scoped>
.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  padding: 6px 16px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease, transform 0.2s ease, box-shadow 0.2s ease;
  min-width: 210px;
  text-align: center;
  background-color: #2a2a2a;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  height: 37px;
}

/* NEU: Stellt sicher, dass das Icon im Layout bleibt */
.icon {
  display: block;
  line-height: 1; /* Verhindert seltsame Abstände */
}

.toggle-btn:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  background-color: #3e3e3e;
}

.toggle-btn.is-showing-old {
  background-color: #2a2a2a;
}
.toggle-btn.is-showing-old:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  background-color: #3e3e3e;
}

/* Transitions sind unverändert */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.1s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>