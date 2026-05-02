<script setup lang="ts">
import { computed, ref, provide, watch, nextTick, onBeforeUnmount } from 'vue';
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
  (e: 'cancel'): void;
  (e: 'close'): void;
  (e: 'after-leave'): void;
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
const desktopMenuCardRef = ref<any>(null);
const sheetComponentRef = ref<any>(null);

const desktopMenuEl = computed(() => desktopMenuCardRef.value?.menuEl || null);
const sheetEl = computed(() => sheetComponentRef.value?.sheetEl || null);

function startClose() {
  emit('cancel');
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

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
});

defineExpose({ menuEl: desktopMenuEl, startClose });
</script>

<template>
  <BaseMenuCard
    ref="desktopMenuCardRef"
    :open="open && !isMobile"
    :desktop-transition="desktopTransition"
    v-bind="$attrs"
    role="menu"
    aria-orientation="vertical"
    tabindex="-1"
    @after-leave="emit('after-leave')"
  >
    <slot></slot>
  </BaseMenuCard>

  <BaseSheet
    v-if="isMobile"
    ref="sheetComponentRef"
    :open="open"
    role="menu"
    aria-orientation="vertical"
    tabindex="-1"
    @cancel="startClose"
    @after-leave="emit('after-leave')"
  >
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
  </BaseSheet>
</template>
