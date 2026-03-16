<script setup lang="ts">
import { useToast } from '@/common/composables/useToast';
import { Check, AlertTriangle, Info, X } from 'lucide-vue-next';

const { toasts, dismiss } = useToast();

const ICONS = {
  success: Check,
  error:   AlertTriangle,
  warning: AlertTriangle,
  info:    Info,
};
</script>

<template>
  <Teleport to="body">
    <div class="toast-stack" role="region" aria-label="Notifications" aria-live="polite">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast--${toast.type}`"
          role="alert"
          :aria-atomic="true"
        >
          <span class="toast-icon">
            <component :is="ICONS[toast.type]" :size="16" />
          </span>

          <span class="toast-message">{{ toast.message }}</span>

          <button
            v-if="toast.dismissible"
            class="toast-close"
            :aria-label="'Dismiss notification'"
            @click="dismiss(toast.id)"
          >
            <X :size="16" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 99999;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  pointer-events: none;
  max-width: min(400px, calc(100vw - 48px));
}

.toast {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--border2);
  background: var(--vlbg);
  color: var(--text);
  font-size: var(--font-size-body);
  line-height: 1;
  overflow: hidden;
  pointer-events: all;
  box-shadow: var(--menu-shadow);
  backdrop-filter: blur(8px);
}

.toast-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast--success .toast-icon { color: var(--p-green); }
.toast--error   .toast-icon { color: var(--danger); }
.toast--warning .toast-icon { color: var(--warn); }
.toast--info    .toast-icon { color: var(--primary); }

.toast-message {
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: var(--sub);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-md);
  transition: color 0.15s ease, background 0.15s ease;
  margin: -8px -8px -8px 0;
}

.toast-close:hover {
  color: var(--text);
  background: var(--gg);
}

.toast-enter-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.toast-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease, max-height 0.25s ease, margin-bottom 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

@media (max-width: 500px) {
  .toast-stack {
    top: 16px;
    right: 0;
    left: 0;
    max-width: calc(100vw - 32px);
    margin: 0 auto;
  }
}
</style>
