<script setup lang="ts">
import { ref, computed } from 'vue';
import { useToast } from '@/common/composables/useToast';
import { Check, AlertTriangle, CircleX, Info, X } from '@lucide/vue';

const { toasts, dismiss, setIsHovered } = useToast();

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
  info: 'text-on-ghost bg-surface border border-surface-border',
};

const isHovered = ref(false);
const heights = ref<Map<number, number>>(new Map());

function updateHeight(id: number, el: any) {
  if (el) {
    heights.value.set(id, el.offsetHeight);
  } else {
    heights.value.delete(id);
  }
}

function onMouseEnter() {
  isHovered.value = true;
  setIsHovered(true);
}

function onMouseLeave() {
  isHovered.value = false;
  setIsHovered(false);
}

const VISIBLE_COUNT = 3;
const GAP = 12;

function getToastStyle(index: number) {
  const reversedIndex = toasts.length - 1 - index;

  let expandedOffset = 0;
  if (isHovered.value) {
    for (let i = toasts.length - 1; i > index; i--) {
      const id = toasts[i].id;
      expandedOffset += (heights.value.get(id) || 48) + GAP;
    }
  }

  const baseStyle: any = {
    position: 'absolute',
    top: 0,
    zIndex: toasts.length - reversedIndex,
    transition: 'all 400ms cubic-bezier(0.16, 1, 0.3, 1)',
  };

  if (isHovered.value) {
    return {
      ...baseStyle,
      transform: `translateY(${expandedOffset}px) scale(1)`,
      opacity: 1,
      pointerEvents: 'auto',
    };
  }

  if (reversedIndex >= VISIBLE_COUNT) {
    return {
      ...baseStyle,
      transform: `translateY(${VISIBLE_COUNT * GAP}px) scale(${1 - VISIBLE_COUNT * 0.05})`,
      opacity: 0,
      pointerEvents: 'none',
    };
  }

  return {
    ...baseStyle,
    transform: `translateY(${reversedIndex * GAP}px) scale(${1 - reversedIndex * 0.05})`,
    opacity: 1,
    pointerEvents: reversedIndex === 0 ? 'auto' : 'none',
  };
}

const totalHeight = computed(() => {
  if (toasts.length === 0) return 0;
  let height = 0;
  for (const toast of toasts) {
    height += (heights.value.get(toast.id) || 48) + GAP;
  }
  return height - GAP;
});

const hitBoxHeight = computed(() => {
  if (toasts.length === 0) return 0;
  if (isHovered.value) return totalHeight.value;
  const frontId = toasts[toasts.length - 1].id;
  const frontHeight = heights.value.get(frontId) || 48;
  const visibleStacks = Math.min(toasts.length - 1, VISIBLE_COUNT - 1);
  return frontHeight + visibleStacks * GAP;
});
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed top-6 right-6 z-(--z-toast) max-w-[min(400px,calc(100vw-48px))] w-full max-sm:top-4 max-sm:right-0 max-sm:left-0 max-sm:max-w-[calc(100vw-32px)] max-sm:mx-auto"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      style="pointer-events: none"
    >
      <div
        class="relative w-full"
        @mouseenter="onMouseEnter"
        @mouseleave="onMouseLeave"
      >
        <div
          class="absolute top-0 left-0 w-full transition-all duration-400 ease-out-expo"
          :style="{
            height: hitBoxHeight + 'px',
            pointerEvents: toasts.length > 0 ? 'auto' : 'none',
          }"
        ></div>

        <TransitionGroup name="toast-stack" tag="div" class="relative w-full">
          <div
            v-for="(toast, index) in toasts"
            :key="toast.id"
            :ref="(el) => updateHeight(toast.id, el)"
            class="toast-card w-full flex items-start gap-2 p-1 rounded-full text-base/none overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] origin-top"
            :class="ICON_COLORS[toast.type]"
            :style="getToastStyle(index)"
            role="alert"
            :aria-atomic="true"
          >
            <span
              class="ml-2.5 my-2.5 shrink-0 flex items-center justify-center"
            >
              <component :is="ICONS[toast.type]" :size="20" />
            </span>

            <span
              class="my-2.5 flex-1 min-w-0 break-words text-base leading-5 truncate"
            >
              {{ toast.message }}
            </span>

            <BaseButton
              v-if="toast.dismissible"
              :icon="X"
              :on="
                toast.type === 'success'
                  ? 'action'
                  : toast.type === 'error'
                    ? 'danger'
                    : 'ghost'
              "
              style="pointer-events: auto"
              @click="dismiss(toast.id)"
            />
            <div
              class="absolute inset-0 pointer-events-none transition-opacity duration-400 ease-out-expo bg-steel"
              :style="{
                opacity: isHovered
                  ? 0
                  : Math.min(1, (toasts.length - 1 - index) * 0.2),
              }"
            ></div>
          </div>
        </TransitionGroup>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ease-out-expo {
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
.duration-400 {
  transition-duration: 400ms;
}

.toast-stack-enter-active,
.toast-stack-leave-active,
.toast-stack-move {
  transition: all 400ms cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-stack-enter-from {
  opacity: 0 !important;
  transform: translateY(-24px) scale(0.9) !important;
}

.toast-stack-leave-to {
  opacity: 0 !important;
}
</style>
