<!-- ToastNotifications.vue -->
<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
            v-for="toast in toasts"
            :key="toast.id"
            :class="['toast-item', `toast-${toast.type}`]"
            @click="removeToast(toast.id)"
        >
          <div class="toast-icon">
            <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>

            <svg v-if="toast.type === 'error'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>

            <svg v-if="toast.type === 'warning'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>

            <svg v-if="toast.type === 'info'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          </div>

          <div class="toast-content">
            <div class="toast-message">{{ toast.message }}</div>
            <div v-if="toast.description" class="toast-description">
              {{ toast.description }}
            </div>
          </div>

          <button
              class="toast-close"
              @click.stop="removeToast(toast.id)"
              aria-label="Schließen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  description?: string;
  duration?: number;
}

const toasts = ref<Toast[]>([]);

function addToast(
    type: Toast['type'],
    message: string,
    description?: string,
    duration = 5000
) {
  const id = Date.now() + Math.random();
  const toast: Toast = { id, type, message, description, duration };

  toasts.value.push(toast);

  // Auto-remove nach Duration
  setTimeout(() => {
    removeToast(id);
  }, duration);
}

function removeToast(id: number) {
  const index = toasts.value.findIndex(t => t.id === id);
  if (index > -1) {
    toasts.value.splice(index, 1);
  }
}

// Expose für Parent-Komponenten
defineExpose({ addToast });
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
  max-width: 420px;
}

.toast-item {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  max-width: 350px;
}

.toast-item:hover {
  border-color: var(--border2);
}

.toast-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.toast-success .toast-icon {
  background: rgba(106, 237, 139, 0.15);
  color: var(--p-green);
}

.toast-error .toast-icon {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
}

.toast-warning .toast-icon {
  background: rgba(219, 142, 0, 0.15);
  color: var(--warn);
}

.toast-info .toast-icon {
  background: rgba(63, 147, 248, 0.15);
  color: var(--primary);
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-message {
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
  margin-bottom: 4px;
  line-height: 1.4;
}

.toast-description {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
}

.toast-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #666;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
}

.toast-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text);
}

/* Animations */
.toast-enter-active {
  animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-leave-active {
  animation: toastOut 0.2s cubic-bezier(0.4, 0, 1, 1);
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(100%) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes toastOut {
  from {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
  }
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .toast-container {
    top: 16px;
    right: 16px;
    left: 16px;
    max-width: none;
  }

  .toast-item {
    padding: 14px;
  }

  .toast-message {
    font-size: 13px;
  }

  .toast-description {
    font-size: 12px;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    animation-duration: 0.01ms !important;
  }

  .toast-item:hover {
    transform: none;
  }
}
</style>