<script lang="ts">
import { ref } from 'vue';

const activeTrigger = ref<HTMLElement | null>(null);
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, inject } from 'vue';
import {
  useElementBounding,
  useWindowSize,
  useEventListener,
} from '@vueuse/core';
import BaseMenuButton from '@/common/components/BaseMenuButton.vue';
import BaseMenu from '@/common/components/BaseMenu.vue';
import type { Component } from 'vue';
import { MENU_SHEET_KEY } from '@/common/composables/useMenuContext';

const props = defineProps<{
  label?: string;
  icon?: Component;
  disabled?: boolean;
}>();

const triggerRef = ref<HTMLElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);

// ── Mobile drill-down context ───────────────────────────────
const sheetCtx = inject(MENU_SHEET_KEY, undefined);
const { width: vw, height: vh } = useWindowSize();
const isMobile = computed(() => vw.value < 768 && !!sheetCtx);

const submenuId = `sub-${Math.random().toString(36).slice(2, 9)}`;
const isMobileActive = computed(
  () => sheetCtx?.activeViewId.value === submenuId,
);

function drillDown() {
  if (!props.disabled) {
    sheetCtx?.pushView(submenuId, props.label ?? '');
  }
}

// ── Desktop hover/focus logic (unchanged) ───────────────────
const isOpen = computed(() => activeTrigger.value === triggerRef.value);

function onMouseEnter() {
  if (!props.disabled) {
    activeTrigger.value = triggerRef.value;
  }
}

useEventListener(document, 'mouseover', (e: MouseEvent) => {
  if (!isOpen.value) return;

  const target = e.target as HTMLElement;
  if (triggerRef.value?.contains(target) || menuRef.value?.contains(target)) {
    return;
  }

  const menuItem = target.closest('[role="menuitem"], [role="menuitemradio"]');
  if (menuItem) {
    if (activeTrigger.value === triggerRef.value) {
      activeTrigger.value = null;
    }
  }
});

useEventListener(document, 'focusin', (e: FocusEvent) => {
  if (!isOpen.value) return;

  const target = e.target as HTMLElement;
  if (triggerRef.value?.contains(target) || menuRef.value?.contains(target)) {
    return;
  }

  const menuItem = target.closest('[role="menuitem"], [role="menuitemradio"]');
  if (menuItem) {
    if (activeTrigger.value === triggerRef.value) {
      activeTrigger.value = null;
    }
  }
});

onBeforeUnmount(() => {
  if (activeTrigger.value === triggerRef.value) {
    activeTrigger.value = null;
  }
});

const {
  left: btnLeft,
  top: btnTop,
  right: btnRight,
} = useElementBounding(triggerRef);
const { width: popupW, height: popupH } = useElementBounding(menuRef);

const popupStyle = computed(() => {
  if (!isOpen.value) return {};

  let left = btnRight.value;
  let top = btnTop.value;

  if (left + (popupW.value || 180) > vw.value - 8) {
    left = btnLeft.value - (popupW.value || 180) - 4;
  }

  const estimatedH = popupH.value || 250;
  if (top + estimatedH > vh.value - 8) {
    top = Math.max(8, vh.value - estimatedH - 8);
  }

  return {
    position: 'fixed',
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    minWidth: '180px',
  };
});
</script>

<template>
  <div
    class="relative"
    @mouseenter="!isMobile && onMouseEnter()"
    @focusin="!isMobile && onMouseEnter()"
  >
    <div ref="triggerRef">
      <BaseMenuButton
        :icon="icon"
        :isSubmenu="true"
        :disabled="disabled"
        :force-hover="isOpen && !isMobile"
        type="button"
        aria-haspopup="true"
        :aria-expanded="isMobile ? isMobileActive : isOpen"
        @click="isMobile ? drillDown() : undefined"
      >
        <slot name="label">{{ label }}</slot>
      </BaseMenuButton>
    </div>

    <!-- Desktop: side panel (unchanged) -->
    <template v-if="!isMobile">
        <BaseMenu
          :open="isOpen"
          desktopTransition="fade-dropdown-side"
          :style="popupStyle"
          :ref="(el: any) => (menuRef = el?.menuEl)"
          class="z-[1100]"
        >
          <slot></slot>
        </BaseMenu>
    </template>

    <!-- Mobile: teleport content into parent BaseMenu's submenu area -->
    <Teleport
      v-else-if="sheetCtx?.submenuTarget.value"
      :to="sheetCtx.submenuTarget.value"
    >
      <div v-show="isMobileActive">
        <slot></slot>
      </div>
    </Teleport>
  </div>
</template>
