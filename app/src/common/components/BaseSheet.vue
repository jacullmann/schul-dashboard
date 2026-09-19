<script setup lang="ts">
import { ref, watch } from 'vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    open?: boolean;
  }>(),
  {
    open: true,
  },
);

const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'after-leave'): void;
}>();

const sheetEl = ref<HTMLElement | null>(null);
const scrollEl = ref<HTMLElement | null>(null);
const backdropComponent = ref<any>(null);

let dragStartX = 0;
let dragStartY = 0;
let currentDragY = 0;
let isDragging = false;
let isHorizontalDrag = false;
let dragStartTime = 0;
let dragHandled = false;
let isDragFromHandle = false;

const isDraggingDismiss = ref(false);

const DISMISS_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 0.5;

function getBackdropEl(): HTMLElement | null {
  return backdropComponent.value?.$el || null;
}

watch(backdropComponent, (val) => {
  if (val) {
    const el = val.$el;
    if (el) {
      el.addEventListener('touchstart', onTouchStart, { passive: true });
      el.addEventListener('touchmove', onTouchMove, { passive: false });
      el.addEventListener('touchend', onTouchEnd);
      el.addEventListener('touchcancel', onTouchEnd);
    }
  }
});

function onTouchStart(e: TouchEvent) {
  if (!sheetEl.value) return;

  const target = e.target as HTMLElement;
  isDragFromHandle = !!target.closest('[data-drag-handle]');
  const isInsideSheet = sheetEl.value.contains(target);

  const scroller = target.closest('.overflow-y-auto');
  const scrollTop = scroller
    ? scroller.scrollTop
    : (scrollEl.value?.scrollTop ?? 0);
  if (isInsideSheet && !isDragFromHandle && scrollTop > 0) return;

  dragHandled = false;
  isDraggingDismiss.value = false;
  const touch = e.touches[0];
  if (!touch) return;
  dragStartX = touch.clientX;
  dragStartY = touch.clientY;
  dragStartTime = Date.now();
  currentDragY = 0;
  isDragging = true;
  isHorizontalDrag = false;
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging || !sheetEl.value) return;
  const touch = e.touches[0];
  if (!touch) return;

  const deltaX = touch.clientX - dragStartX;
  const deltaY = touch.clientY - dragStartY;

  if (
    currentDragY === 0 &&
    Math.abs(deltaX) > Math.abs(deltaY) &&
    Math.abs(deltaX) > 5
  ) {
    isHorizontalDrag = true;
    isDragging = false;
    return;
  }

  if (isHorizontalDrag) return;

  if (deltaY < 0 && !isDragFromHandle) {
    isDragging = false;
    return;
  }

  if (deltaY < 0) {
    sheetEl.value.style.transform = `translateY(${deltaY * 0.1}px)`;
    sheetEl.value.style.transition = 'none';
    return;
  }

  if (deltaY > 0 && e.cancelable) {
    e.preventDefault();
  }

  currentDragY = deltaY;
  sheetEl.value.style.transform = `translateY(${deltaY}px)`;
  sheetEl.value.style.transition = 'none';

  const backdropEl = getBackdropEl();
  if (backdropEl) {
    const progress = Math.min(deltaY / DISMISS_THRESHOLD, 1);
    backdropEl.style.opacity = String(1 - progress * 0.6);
    backdropEl.style.transition = 'none';
  }
}

function onTouchEnd() {
  if (!isDragging || !sheetEl.value) return;
  isDragging = false;

  const wasDrag = Math.abs(currentDragY) > 5;
  if (wasDrag) {
    dragHandled = true;
  }

  const elapsed = Date.now() - dragStartTime;
  const velocity = currentDragY / elapsed;
  const shouldDismiss =
    currentDragY > DISMISS_THRESHOLD ||
    (velocity > VELOCITY_THRESHOLD && currentDragY > 20);

  if (shouldDismiss) {
    isDraggingDismiss.value = true;
    sheetEl.value.style.transition =
      'transform 150ms cubic-bezier(0.32,0,0.67,1)';
    sheetEl.value.style.transform = 'translateY(100%)';

    const backdropEl = getBackdropEl();
    if (backdropEl) {
      backdropEl.style.transition = 'opacity 150ms ease';
      backdropEl.style.opacity = '0';
    }

    setTimeout(() => {
      emit('cancel');
      setTimeout(() => {
        isDraggingDismiss.value = false;
        if (sheetEl.value) {
          sheetEl.value.style.transform = '';
          sheetEl.value.style.transition = '';
        }
        if (backdropEl) {
          backdropEl.style.opacity = '';
          backdropEl.style.transition = '';
        }
        dragHandled = false;
      }, 300);
    }, 150);
  } else {
    sheetEl.value.style.transition =
      'transform 200ms cubic-bezier(0.22,1,0.36,1)';
    sheetEl.value.style.transform = 'translateY(0)';

    const backdropEl = getBackdropEl();
    if (backdropEl) {
      backdropEl.style.transition = 'opacity 200ms ease';
      backdropEl.style.opacity = '1';
    }

    setTimeout(() => {
      dragHandled = false;
      if (sheetEl.value) {
        sheetEl.value.style.transform = '';
        sheetEl.value.style.transition = '';
      }
      if (backdropEl) {
        backdropEl.style.opacity = '';
        backdropEl.style.transition = '';
      }
    }, 220);
  }
}

function onBackdropClick() {
  if (dragHandled) {
    dragHandled = false;
    return;
  }
  emit('cancel');
}

defineExpose({ sheetEl, scrollEl });
</script>

<template>
  <Teleport to="body">
    <Transition
      appear
      enter-active-class="animate-[fade-in_200ms_ease]"
      :leave-active-class="
        isDraggingDismiss ? '' : 'animate-[fade-out_280ms_ease_forwards]'
      "
    >
      <BaseBackdrop
        v-if="open"
        ref="backdropComponent"
        blur-size="sm"
        opacity="light"
        @cancel="onBackdropClick"
      />
    </Transition>

    <Transition
      appear
      enter-active-class="animate-[sheet-up_400ms_cubic-bezier(0.22,1,0.36,1)]"
      :leave-active-class="
        isDraggingDismiss
          ? ''
          : 'animate-[sheet-down_150ms_cubic-bezier(0.32,0,0.67,1)_forwards]'
      "
      @after-leave="emit('after-leave')"
    >
      <!-- No overflow clipping here: Chromium drops the masks of backdrop
           filters (BaseScrollFade) under a rounded overflow clip, leaving a
           hard edge. The scroller clips its content; a sticky fade rounds its
           own corners. -->
      <div
        v-if="open"
        ref="sheetEl"
        v-bind="$attrs"
        class="fixed bottom-0 left-0 right-0 z-[var(--z-tooltip)] flex flex-col bg-surface rounded-t-2xl shadow-menu max-h-[85dvh]"
        @click.stop
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @touchcancel="onTouchEnd"
      >
        <!-- Top border drawn above the content: sticky fades reach up to the
             sheet's edge and would otherwise paint over the border where it
             curves around the rounded corners. -->
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 z-30 rounded-t-2xl border-t border-ghost-border"
        />

        <!-- Overlays the scroller's top padding, so it always stays in place
             while sticky headers can still fade out underneath it. -->
        <div
          class="absolute top-0 inset-x-0 z-20 flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none"
          data-drag-handle
        >
          <div
            class="w-10 h-1 rounded-full bg-on-ghost-subtle opacity-50 pointer-events-none"
          />
        </div>

        <div
          ref="scrollEl"
          class="min-h-0 pt-6 pb-4 overflow-x-hidden overflow-y-auto overscroll-contain"
        >
          <slot></slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
