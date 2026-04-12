<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  /**
   * The size of the logo.
   * Pass string presets ('sm', 'md', 'lg', etc.) or a numeric pixel value.
   */
  size?: number | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

  /**
   * Triggers a continuous, elegant loading animation state
   */
  loading?: boolean;

  /**
   * Aesthetic variant:
   *  - solid: standard minimal monochrome silhouette
   *  - gradient: dynamic multi-color magic gradient
   *  - outline: clean outlined minimal variant
   */
  variant?: 'solid' | 'gradient' | 'outline';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  loading: false,
  variant: 'solid',
});

const computedSize = computed(() => {
  if (typeof props.size === 'number') return props.size;
  const map: Record<string, number> = {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
    '2xl': 40,
  };
  return map[props.size] || 24;
});

const fillStyle = computed(() => {
  if (props.variant === 'outline') return 'none';
  if (props.variant === 'gradient') return 'url(#ai-logo-gradient)';
  return 'currentColor';
});
</script>

<template>
  <div
    class="inline-flex items-center justify-center shrink-0 select-none"
    :style="{ width: `${computedSize}px`, height: `${computedSize}px` }"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      class="w-full h-full transition-all duration-700 ease-in-out text-current"
      :class="[
        loading ? 'animate-ai-fluid opacity-90' : 'animate-none scale-100',
        { 'hover:scale-110 active:scale-95': !loading },
      ]"
      aria-hidden="true"
    >
      <defs>
        <!-- A vibrant, high-quality gradient evoking AI & Magic -->
        <linearGradient
          id="ai-logo-gradient"
          x1="20%"
          y1="20%"
          x2="80%"
          y2="80%"
        >
          <stop style="stop-color: var(--color-bismuth-yellow)" offset="8.4%" />
          <stop style="stop-color: var(--color-bismuth-red)" offset="38.4%" />
          <stop
            style="stop-color: var(--color-bismuth-purple)"
            offset="69.1%"
          />
          <stop style="stop-color: var(--color-bismuth-violet)" offset="100%" />
        </linearGradient>
      </defs>

      <!-- Primary Intelligence Star -->
      <path
        d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
        :fill="fillStyle"
        :stroke="variant === 'outline' ? 'currentColor' : 'none'"
        stroke-width="1.5"
        stroke-linejoin="round"
      />

      <!-- Secondary Accent Sparkle -->
      <path
        d="M19 2C19 3.657 17.657 5 16 5C17.657 5 19 6.343 19 8C19 6.343 20.343 5 22 5C20.343 5 19 3.657 19 2Z"
        :fill="fillStyle"
        :stroke="variant === 'outline' ? 'currentColor' : 'none'"
        stroke-width="1.5"
        stroke-linejoin="round"
        class="origin-center transition-opacity duration-1000"
        :class="loading ? 'opacity-40 animate-pulse' : 'opacity-80'"
      />
    </svg>
  </div>
</template>

<style scoped>
@keyframes ai-fluid {
  0%,
  100% {
    transform: scale(0.75);
    filter: blur(0px);
  }
  50% {
    transform: scale(1.25);
    filter: blur(1px);
  }
}

.animate-ai-fluid {
  animation: ai-fluid 2s ease-in-out infinite;
  transform-origin: center;
  will-change: transform, filter;
}
</style>
