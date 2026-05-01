<script setup lang="ts">
import { computed, ref, provide } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { ChevronLeft } from '@lucide/vue';
import { MENU_SHEET_KEY } from '@/common/composables/useMenuContext';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    open?: boolean;
    desktopTransition?: string;
  }>(),
  {
    open: true,
    desktopTransition: 'fade-dropdown',
  },
);

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { width: vw } = useWindowSize();
const isMobile = computed(() => vw.value < 768);

// ── Drill-down view stack (mobile only) ─────────────────────
interface StackEntry {
  id: string;
  label: string;
}

const viewStack = ref<StackEntry[]>([{ id: 'root', label: '' }]);
const activeViewId = computed(() => viewStack.value.at(-1)!.id);
const activeLabel = computed(() => viewStack.value.at(-1)!.label);
const isAtRoot = computed(() => viewStack.value.length <= 1);
const submenuTarget = ref<HTMLElement | null>(null);

function pushView(id: string, label: string) {
  viewStack.value = [...viewStack.value, { id, label }];
}
function popView() {
  if (viewStack.value.length > 1) {
    viewStack.value = viewStack.value.slice(0, -1);
  }
}

provide(MENU_SHEET_KEY, { activeViewId, pushView, popView, submenuTarget });

// ── Expose desktop element + close trigger for consumers ─────
const desktopMenuEl = ref<HTMLElement | null>(null);

// Exposed so consumers can trigger the animated close from outside
function startClose() {
  emit('close');
}

defineExpose({ menuEl: desktopMenuEl, startClose });

// ── Drag-to-dismiss gesture ──────────────────────────────────
const sheetEl = ref<HTMLElement | null>(null);
const backdropEl = ref<HTMLElement | null>(null);

// All drag state is plain JS (not reactive) for max frame-rate perf
let dragStartY = 0;
let currentDragY = 0;
let isDragging = false;
let dragStartTime = 0;
let dragHandled = false;
const isDraggingDismiss = ref(false);

const DISMISS_THRESHOLD = 100; // px
const VELOCITY_THRESHOLD = 0.5; // px/ms

function onTouchStart(e: TouchEvent) {
  dragHandled = false;
  isDraggingDismiss.value = false;
  const touch = e.touches[0];
  dragStartY = touch.clientY;
  dragStartTime = Date.now();
  currentDragY = 0;
  isDragging = true;
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging || !sheetEl.value) return;
  const touch = e.touches[0];
  const delta = touch.clientY - dragStartY;

  if (delta < 0) {
    sheetEl.value.style.transform = `translateY(${delta * 0.1}px)`;
    sheetEl.value.style.transition = 'none';
    return;
  }

  currentDragY = delta;
  sheetEl.value.style.transform = `translateY(${delta}px)`;
  sheetEl.value.style.transition = 'none';

  if (backdropEl.value) {
    const progress = Math.min(delta / DISMISS_THRESHOLD, 1);
    backdropEl.value.style.opacity = String(1 - progress * 0.6);
    backdropEl.value.style.transition = 'none';
  }
}

function onTouchEnd() {
  if (!isDragging || !sheetEl.value) return;
  isDragging = false;
  dragHandled = true;

  const elapsed = Date.now() - dragStartTime;
  const velocity = currentDragY / elapsed;
  const shouldDismiss =
    currentDragY > DISMISS_THRESHOLD ||
    (velocity > VELOCITY_THRESHOLD && currentDragY > 20);

  if (shouldDismiss) {
    isDraggingDismiss.value = true;
    // Manually animate out to avoid the "snap-to-zero" jump before Transition starts
    sheetEl.value.style.transition =
      'transform 250ms cubic-bezier(0.32,0,0.67,1)';
    sheetEl.value.style.transform = 'translateY(100%)';
    if (backdropEl.value) {
      backdropEl.value.style.transition = 'opacity 250ms ease';
      backdropEl.value.style.opacity = '0';
    }

    // Give some time for the manual animation to start before updating state
    setTimeout(() => {
      emit('close');
      // Reset state after a delay so it doesn't interfere with the next open
      setTimeout(() => {
        isDraggingDismiss.value = false;
        if (sheetEl.value) {
          sheetEl.value.style.transform = '';
          sheetEl.value.style.transition = '';
        }
        if (backdropEl.value) {
          backdropEl.value.style.opacity = '';
          backdropEl.value.style.transition = '';
        }
        dragHandled = false;
      }, 300);
    }, 150);
  } else {
    // Snap back
    sheetEl.value.style.transition =
      'transform 300ms cubic-bezier(0.16,1,0.3,1)';
    sheetEl.value.style.transform = 'translateY(0)';
    if (backdropEl.value) {
      backdropEl.value.style.transition = 'opacity 300ms ease';
      backdropEl.value.style.opacity = '1';
    }
    // Clean up
    setTimeout(() => {
      dragHandled = false;
      if (sheetEl.value) {
        sheetEl.value.style.transform = '';
        sheetEl.value.style.transition = '';
      }
      if (backdropEl.value) {
        backdropEl.value.style.opacity = '';
        backdropEl.value.style.transition = '';
      }
    }, 320);
  }
}

function onBackdropClick() {
  if (dragHandled) {
    dragHandled = false;
    return;
  }
  emit('close');
}
</script>

<template>
  <Transition :name="desktopTransition">
    <div
      v-if="open && !isMobile"
      ref="desktopMenuEl"
      v-bind="$attrs"
      role="menu"
      class="absolute flex flex-col items-stretch p-1 bg-surface border border-surface-border rounded-xl min-w-[180px] shadow-menu overflow-y-auto gap-0 z-[1000]"
      aria-orientation="vertical"
      tabindex="-1"
    >
      <slot></slot>
    </div>
  </Transition>

  <Teleport v-if="isMobile" to="body">
    <Transition
      enter-active-class="animate-[fade-in_200ms_ease]"
      :leave-active-class="
        isDraggingDismiss ? '' : 'animate-[fade-out_280ms_ease_forwards]'
      "
    >
      <div
        v-if="open"
        ref="backdropEl"
        class="fixed inset-0 z-[var(--z-tooltip)] bg-black/40"
        @click="onBackdropClick"
        aria-hidden="true"
      ></div>
    </Transition>

    <Transition
      enter-active-class="animate-[sheet-up_400ms_cubic-bezier(0.22,1,0.36,1)]"
      :leave-active-class="
        isDraggingDismiss
          ? ''
          : 'animate-[sheet-down_250ms_cubic-bezier(0.32,0,0.67,1)_forwards]'
      "
    >
      <div
        v-if="open"
        ref="sheetEl"
        class="fixed bottom-0 left-0 right-0 z-[var(--z-tooltip)] bg-surface border-t border-surface-border rounded-t-2xl shadow-menu max-h-[85vh] overflow-y-auto"
        role="menu"
        aria-orientation="vertical"
        tabindex="-1"
        @click.stop
      >
        <div
          class="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none"
          @touchstart.passive="onTouchStart"
          @touchmove.passive="onTouchMove"
          @touchend.passive="onTouchEnd"
        >
          <div
            class="w-10 h-1 rounded-full bg-on-ghost-subtle opacity-50 pointer-events-none"
          />
        </div>

        <BaseButton
          v-if="!isAtRoot"
          variant="ghost"
          on="ghost"
          @click="popView"
          :icon="ChevronLeft"
          class="ml-1"
          >{{ t('global.buttons.back') }}</BaseButton
        >

        <div v-show="activeViewId === 'root'" class="p-1">
          <slot></slot>
        </div>

        <div
          v-show="activeViewId !== 'root'"
          ref="submenuTarget"
          class="p-1"
        ></div>
      </div>
    </Transition>
  </Teleport>
</template>
