<script setup lang="ts">
import { computed, ref, provide, watch, nextTick } from 'vue';
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

const menuHeight = ref<number | 'auto'>('auto');
const rootViewEl = ref<HTMLElement | null>(null);
const subViewEl = ref<HTMLElement | null>(null);

watch(activeViewId, async (newId, oldId) => {
  if (!isMobile.value) return;
  if (newId === oldId || !props.open) return;

  const container = rootViewEl.value?.parentElement;
  if (!container || !rootViewEl.value || !subViewEl.value) return;

  const startHeight = container.getBoundingClientRect().height;
  menuHeight.value = startHeight;

  // Force reflow
  container.offsetHeight;

  await nextTick();

  requestAnimationFrame(() => {
    const targetEl = newId === 'root' ? rootViewEl.value : subViewEl.value;
    if (targetEl) {
      const targetHeight = targetEl.getBoundingClientRect().height;
      menuHeight.value = targetHeight;

      setTimeout(() => {
        if (menuHeight.value === targetHeight) {
          menuHeight.value = 'auto';
        }
      }, 350);
    }
  });
});

watch(
  () => props.open,
  (newOpen) => {
    if (!isMobile.value) return;
    if (!newOpen) {
      setTimeout(() => {
        viewStack.value = [{ id: 'root', label: '' }];
        menuHeight.value = 'auto';
      }, 300);
    }
  },
);

// ── Expose desktop element + close trigger for consumers ─────
const desktopMenuEl = ref<HTMLElement | null>(null);

function startClose() {
  emit('close');
}

// ── Keyboard Navigation (Arrow Keys) ────────────────────────
function handleKeydown(e: KeyboardEvent) {
  if (!props.open) return;

  const target = e.target as HTMLElement;
  const isMenuInteraction =
    (desktopMenuEl.value && desktopMenuEl.value.contains(target)) ||
    (sheetEl.value && sheetEl.value.contains(target));

  if (!isMenuInteraction) return;

  const menuContainer = isMobile.value ? sheetEl.value : desktopMenuEl.value;
  if (!menuContainer) return;

  const focusableSelectors =
    'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  const allFocusableElements = Array.from(
    menuContainer.querySelectorAll<HTMLElement>(focusableSelectors),
  );

  // Exclude elements that are hidden (e.g. out-of-view submenus)
  const focusableElements = allFocusableElements.filter((el) => {
    // Only consider elements that have layout space
    if (el.offsetWidth === 0 || el.offsetHeight === 0) return false;

    // Specifically on mobile, ensure we don't grab focusable items inside a hidden root/sub view
    if (isMobile.value) {
      const inRootView = rootViewEl.value?.contains(el);
      const inSubView = subViewEl.value?.contains(el);
      if (activeViewId.value === 'root' && inSubView) return false;
      if (activeViewId.value !== 'root' && inRootView) return false;
    }
    return true;
  });

  if (focusableElements.length === 0) return;

  const currentIndex = focusableElements.indexOf(target);

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const nextIndex =
      currentIndex === -1 || currentIndex === focusableElements.length - 1
        ? 0
        : currentIndex + 1;
    focusableElements[nextIndex].focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const nextIndex =
      currentIndex === -1 || currentIndex === 0
        ? focusableElements.length - 1
        : currentIndex - 1;
    focusableElements[nextIndex].focus();
  }
}

watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      document.addEventListener('keydown', handleKeydown);
    } else {
      document.removeEventListener('keydown', handleKeydown);
    }
  },
  { immediate: true },
);

import { onBeforeUnmount } from 'vue';
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
});

defineExpose({ menuEl: desktopMenuEl, startClose });

// ── Drag-to-dismiss gesture ──────────────────────────────────
const sheetEl = ref<HTMLElement | null>(null);
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

const DISMISS_THRESHOLD = 100; // px
const VELOCITY_THRESHOLD = 0.5; // px/ms

function getBackdropEl(): HTMLElement | null {
  // Access the root DOM element of the BaseBackdrop component
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

  // If inside sheet, not on handle, and we are scrolled down, let the native scroll handle it
  if (isInsideSheet && !isDragFromHandle && sheetEl.value.scrollTop > 0) return;

  dragHandled = false;
  isDraggingDismiss.value = false;
  const touch = e.touches[0];
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

  const deltaX = touch.clientX - dragStartX;
  const deltaY = touch.clientY - dragStartY;

  // Determine if it's a horizontal swipe on the first move
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
      emit('close');
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
      class="absolute flex flex-col items-stretch p-1 bg-surface border border-surface-border rounded-xl min-w-[180px] shadow-menu overflow-y-auto overflow-x-hidden gap-0 z-[1000]"
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
      <BaseBackdrop
        v-if="open"
        ref="backdropComponent"
        blur-size="sm"
        opacity="light"
        @cancel="onBackdropClick"
      />
    </Transition>

    <Transition
      enter-active-class="animate-[sheet-up_400ms_cubic-bezier(0.22,1,0.36,1)]"
      :leave-active-class="
        isDraggingDismiss
          ? ''
          : 'animate-[sheet-down_150ms_cubic-bezier(0.32,0,0.67,1)_forwards]'
      "
    >
      <div
        v-if="open"
        ref="sheetEl"
        class="fixed bottom-0 left-0 right-0 z-[var(--z-tooltip)] bg-surface border-t border-surface-border rounded-t-2xl shadow-menu max-h-[85dvh] overflow-y-auto overscroll-contain"
        role="menu"
        aria-orientation="vertical"
        tabindex="-1"
        @click.stop
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @touchcancel="onTouchEnd"
      >
        <div
          class="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none"
          data-drag-handle
        >
          <div
            class="w-10 h-1 rounded-full bg-on-ghost-subtle opacity-50 pointer-events-none"
          />
        </div>

        <div
          class="transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden"
          :class="
            !isAtRoot
              ? 'max-h-[44px] opacity-100 pointer-events-auto mt-1'
              : 'max-h-0 opacity-0 pointer-events-none mt-0'
          "
        >
          <BaseButton
            variant="ghost"
            on="ghost"
            @click="popView"
            :icon="ChevronLeft"
            class="ml-1 w-fit"
            >{{ t('global.buttons.back') }}</BaseButton
          >
        </div>

        <div
          class="relative overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[height]"
          :style="{
            height: menuHeight === 'auto' ? 'auto' : `${menuHeight}px`,
          }"
        >
          <div
            class="w-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            :class="
              activeViewId === 'root'
                ? 'relative translate-x-0 opacity-100 pointer-events-auto'
                : 'absolute top-0 left-0 -translate-x-8 opacity-0 pointer-events-none'
            "
            ref="rootViewEl"
          >
            <div class="p-1">
              <slot></slot>
            </div>
          </div>

          <div
            class="w-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            :class="
              activeViewId !== 'root'
                ? 'relative translate-x-0 opacity-100 pointer-events-auto'
                : 'absolute top-0 left-0 translate-x-8 opacity-0 pointer-events-none'
            "
            ref="subViewEl"
          >
            <div ref="submenuTarget" class="p-1"></div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
