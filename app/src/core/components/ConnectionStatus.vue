<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Wifi, WifiOff } from '@lucide/vue';
import { useConnectionStatus } from '@/common/composables/useConnectionStatus';

const { t } = useI18n();
const status = useConnectionStatus();

const isVisible = computed(() => status.value !== 'online');

const appearance = computed(() =>
  status.value === 'offline'
    ? {
        icon: WifiOff,
        label: t('common.connection.offline'),
        colors: 'bg-action text-on-action',
      }
    : {
        icon: Wifi,
        label: t('common.connection.restored'),
        colors: 'bg-success text-on-success',
      },
);
</script>

<template>
  <Teleport to="body">
    <!-- The live region stays mounted so screen readers pick up the first
         message; one added together with its content is often not announced. -->
    <div
      role="status"
      aria-live="polite"
      class="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tab-bar-height)+max(--spacing(4),env(safe-area-inset-bottom)))] z-(--z-toast) flex justify-center px-4 print:hidden"
    >
      <Transition
        enter-active-class="transition-[translate,scale,opacity] duration-600 ease-(--ease-spring)"
        leave-active-class="transition-[translate,scale,opacity] duration-250 ease-in"
        enter-from-class="translate-y-4 scale-90 opacity-0"
        leave-to-class="translate-y-4 scale-90 opacity-0"
      >
        <div
          v-if="isVisible"
          class="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-menu transition-colors duration-(--duration-focus) ease-(--ease-focus)"
          :class="appearance.colors"
        >
          <component :is="appearance.icon" :size="16" aria-hidden="true" />
          {{ appearance.label }}
        </div>
      </Transition>
    </div>
  </Teleport>
</template>
