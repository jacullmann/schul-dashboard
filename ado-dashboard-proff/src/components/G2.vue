<template>
  <button
      class="ripple-button2"
      @mousedown="createRipple"
      @click="handleClick"
      ref="buttonRef"
  >
    <span class="button-text">
      <slot>Button</slot>
    </span>
    <span
        v-for="ripple in ripples"
        :key="ripple.id"
        class="ripple"
        :style="{
        left: ripple.x + 'px',
        top: ripple.y + 'px',
        width: ripple.size + 'px',
        height: ripple.size + 'px'
      }"
    ></span>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

const emit = defineEmits<{
  click: [event: MouseEvent]
}>();

const buttonRef = ref<HTMLButtonElement | null>(null);
const ripples = ref<Ripple[]>([]);
let rippleId = 0;

const createRipple = (event: MouseEvent) => {
  if (!buttonRef.value) return;

  const button = buttonRef.value;
  const rect = button.getBoundingClientRect();

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const size = Math.max(rect.width, rect.height) * 4.5;

  const newRipple: Ripple = {
    id: rippleId++,
    x: x,
    y: y,
    size: size
  };

  ripples.value.push(newRipple);

  setTimeout(() => {
    const index = ripples.value.findIndex(r => r.id === newRipple.id);
    if (index > -1) {
      ripples.value.splice(index, 1);
    }
  }, 450);
};

const handleClick = (event: MouseEvent) => {
  emit('click', event);
};
</script>

<style scoped>
.ripple-button2 {
  position: relative;
  overflow: hidden;
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 500;
  background:transparent;
  color: white;
  border: 1px solid ;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.1s ease;
  z-index: 0;
}

.ripple-button2:hover {
}

.ripple-button2:active {
  transform: translateY(0);
}

.button-text {
  position: relative;
  z-index: 2;
}

.ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%) scale(0);
  animation: ripple-animation 0.6s ease-out forwards;
  pointer-events: none;
  z-index: 1;
}

@keyframes ripple-animation {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0;
  }
}
</style>