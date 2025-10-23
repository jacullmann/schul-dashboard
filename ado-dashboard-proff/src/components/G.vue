<template>
  <button
      class="ripple-button"
      @mousedown="createClickRipple"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @click="handleClick"
      ref="buttonRef"
  >
    <span class="button-background"></span>
    <span
        v-if="hoverRipple && !isMobile"
        class="hover-ripple"
        :style="{
          left: hoverRipple.x + 'px',
          top: hoverRipple.y + 'px',
          width: hoverRipple.size + 'px',
          height: hoverRipple.size + 'px',
          opacity: hoverRipple.opacity
        }"
    ></span>
    <span class="button-text">
      <slot>Dashboard jetzt ausprobieren</slot>
    </span>
    <span
        v-for="ripple in clickRipples"
        :key="ripple.id"
        class="click-ripple"
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
import { ref, onMounted, onUnmounted } from 'vue';

interface ClickRipple {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface HoverRipple {
  x: number;
  y: number;
  size: number;
  opacity: number;
}

const emit = defineEmits<{
  click: [event: MouseEvent]
}>();

const buttonRef = ref<HTMLButtonElement | null>(null);
const clickRipples = ref<ClickRipple[]>([]);
const hoverRipple = ref<HoverRipple | null>(null);
const isHovered = ref(false);
const isMobile = ref(false);
let clickRippleId = 0;
let hoverAnimationFrame: number | null = null;

// Detect mobile device
const checkMobile = () => {
  isMobile.value = window.matchMedia('(max-width: 900px)').matches ||
      ('ontouchstart' in window);
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
  if (hoverAnimationFrame) {
    cancelAnimationFrame(hoverAnimationFrame);
  }
});

const handleMouseEnter = (event: MouseEvent) => {
  if (isMobile.value) return;

  isHovered.value = true;

  if (!buttonRef.value) return;

  const button = buttonRef.value;
  const rect = button.getBoundingClientRect();

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const size = Math.max(rect.width, rect.height) * 3;

  hoverRipple.value = {
    x,
    y,
    size,
    opacity: 0
  };

  animateHoverIn();
};

const handleMouseLeave = () => {
  if (isMobile.value) return;

  isHovered.value = false;
  animateHoverOut();
};

const animateHoverIn = () => {
  if (!hoverRipple.value || !isHovered.value) return;

  const duration = 200;
  const startTime = performance.now();

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    if (hoverRipple.value) {
      hoverRipple.value.opacity = progress;
    }

    if (progress < 1 && isHovered.value) {
      hoverAnimationFrame = requestAnimationFrame(animate);
    }
  };

  hoverAnimationFrame = requestAnimationFrame(animate);
};

const animateHoverOut = () => {
  if (!hoverRipple.value) return;

  const duration = 150;
  const startTime = performance.now();
  const startOpacity = hoverRipple.value.opacity;

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    if (hoverRipple.value) {
      hoverRipple.value.opacity = startOpacity * (1 - progress);
    }

    if (progress < 1) {
      hoverAnimationFrame = requestAnimationFrame(animate);
    } else {
      hoverRipple.value = null;
    }
  };

  hoverAnimationFrame = requestAnimationFrame(animate);
};

const createClickRipple = (event: MouseEvent) => {
  if (!buttonRef.value) return;

  const button = buttonRef.value;
  const rect = button.getBoundingClientRect();

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const size = Math.max(rect.width, rect.height) * 2.5;

  const newRipple: ClickRipple = {
    id: clickRippleId++,
    x,
    y,
    size
  };

  clickRipples.value.push(newRipple);

  setTimeout(() => {
    const index = clickRipples.value.findIndex(r => r.id === newRipple.id);
    if (index > -1) {
      clickRipples.value.splice(index, 1);
    }
  }, 650);
};

const handleClick = (event: MouseEvent) => {
  emit('click', event);
};
</script>

<style scoped>
.ripple-button {
  position: relative;
  overflow: hidden;
  padding: 12px 24px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.1s ease, border-color 0.3s ease;
  z-index: 0;
  color: white;
  background: transparent;
  border: 2px solid transparent;
  background-clip: padding-box;
}

/* Desktop: Border gradient when not hovered */
@media (min-width: 901px) {
  .ripple-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 8px;
    padding: 2px;
    background: linear-gradient(70deg, #ff9823, #ff335a, #af00ff, #6600ff);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    z-index: 0;
  }
}

/* Mobile: Always filled with gradient */
@media (max-width: 900px) {
  .ripple-button {
    background: linear-gradient(70deg, rgba(255, 152, 35, 0.90), rgba(255, 51, 90, 0.90), rgba(175, 0, 255, 0.90), rgba(102, 0, 255, 0.90));
    border: none;
  }
}

.ripple-button:active {
  transform: translateY(0);
}

.button-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 8px;
  pointer-events: none;
  z-index: 0;
}

.hover-ripple {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(70deg,#ff9823,  #ff9823, #ff335a, #af00ff, #6600ff, #6600ff);
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 1;
  transition: opacity 0.05s linear;
}

.button-text {
  position: relative;
  z-index: 3;
}

.click-ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  transform: translate(-50%, -50%) scale(0);
  animation: ripple-animation 0.6s ease-out forwards;
  pointer-events: none;
  z-index: 2;
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