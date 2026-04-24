<script setup lang="ts">
import { useToast } from '@/common/composables/useToast';
import { Check, AlertTriangle, CircleX, Info, X } from '@lucide/vue';

const { toasts, dismiss } = useToast();

const ICONS = {
  success: Check,
  error: CircleX,
  warning: AlertTriangle,
  info: Info,
};

const ICON_COLORS: Record<string, string> = {
  success: 'text-on-action bg-action',
  error: 'text-on-danger bg-danger',
  warning: 'text-on-warn bg-warn',
  info: 'text-on-surface bg-surface border border-surface-border',
};
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed top-6 right-6 z-(--z-toast) flex flex-col-reverse gap-2 pointer-events-none max-w-[min(400px,calc(100vw-48px))] max-sm:top-4 max-sm:right-0 max-sm:left-0 max-sm:max-w-[calc(100vw-32px)] max-sm:mx-auto"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="relative flex items-start gap-2 p-1 rounded-full text-body leading-none overflow-hidden pointer-events-auto shadow-menu"
          role="alert"
          :class="ICON_COLORS[toast.type]"
          :aria-atomic="true"
        >
          <span
            class="ml-2.5 my-2.5 shrink-0 flex items-center justify-center"
          >
            <component :is="ICONS[toast.type]" :size="20" />
          </span>

          <span class="my-2.5 flex-1 min-w-0 break-words text-body leading-5 truncate">{{ toast.message }}</span>

          <BaseButton
            v-if="toast.dismissible"
            :icon="X"
            :on="toast.type === 'success' ? 'action' : toast.type === 'error' ? 'danger' : 'surface'"
            @click="dismiss(toast.id)"
          />
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
