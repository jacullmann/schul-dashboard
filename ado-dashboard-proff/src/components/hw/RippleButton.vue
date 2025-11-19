<template>
  <button
      ref="buttonRef"
      class="ripple-button"
      :class="{ 'ripple-disabled': disabled }"
      :disabled="disabled"
      @click="handleClick"
      @mousedown="createRipple"
  >
    <span class="ripple-button-content">
      <slot></slot>
    </span>
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonRef = ref<HTMLButtonElement | null>(null)

// Ripple-Effekt erstellen
const createRipple = (event: MouseEvent) => {
  if (props.disabled) return

  const button = buttonRef.value
  if (!button) return

  const circle = document.createElement('span')
  const diameter = Math.max(button.clientWidth, button.clientHeight)
  const radius = diameter / 2

  const rect = button.getBoundingClientRect()
  const x = event.clientX - rect.left - radius
  const y = event.clientY - rect.top - radius

  circle.style.width = circle.style.height = `${diameter}px`
  circle.style.left = `${x}px`
  circle.style.top = `${y}px`
  circle.classList.add('ripple')

  // Vorherige Ripple-Effekte entfernen
  const existingRipples = button.getElementsByClassName('ripple')
  Array.from(existingRipples).forEach(ripple => {
    if (ripple.parentNode) {
      ripple.parentNode.removeChild(ripple)
    }
  })

  button.appendChild(circle)

  // Ripple nach Animation entfernen
  setTimeout(() => {
    if (circle.parentNode) {
      circle.parentNode.removeChild(circle)
    }
  }, 600)
}

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit('click', event)
  }
}
</script>

<style scoped>
.ripple-button {
  position: relative;
  overflow: hidden;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  outline: none;
  user-select: none;
}

.ripple-button:hover:not(.ripple-disabled) {
  background: #e8e8e8;
  border-color: #ccc;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.ripple-button:active:not(.ripple-disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.ripple-button:focus:not(.ripple-disabled) {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.ripple-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.ripple-button-content {
  position: relative;
  z-index: 1;
}

.ripple {
  position: absolute;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.1);
  transform: scale(0);
  animation: ripple-animation 0.6s linear;
  pointer-events: none;
}

@keyframes ripple-animation {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

/* Alternative mit etwas stärkerem Effekt */
/*
.ripple {
  position: absolute;
  border-radius: 50%;
  background-color: rgba(59, 130, 246, 0.3);
  transform: scale(0);
  animation: ripple-animation 0.6s linear;
  pointer-events: none;
}

@keyframes ripple-animation {
  to {
    transform: scale(4);
    opacity: 0;
  }
}
*/
</style>