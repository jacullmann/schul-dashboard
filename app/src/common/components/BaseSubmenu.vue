<script lang="ts">
import { ref } from 'vue';

const activeTrigger = ref<HTMLElement | null>(null);
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, inject } from 'vue';
import { useEventListener, useWindowSize } from '@vueuse/core';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue';
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
const menuComponentRef = ref<any>(null);
const menuRef = computed(() => menuComponentRef.value?.menuEl || null);

const sheetCtx = inject(MENU_SHEET_KEY, undefined);
const { width: vw } = useWindowSize();
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

const isOpen = computed(
  () =>
    activeTrigger.value !== null && activeTrigger.value === triggerRef.value,
);

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

const { floatingStyles, isPositioned } = useFloating(triggerRef, menuRef, {
  placement: 'right-start',
  whileElementsMounted: autoUpdate,
  transform: false,
  middleware: [
    offset({ mainAxis: 5, alignmentAxis: 0 }),
    flip(),
    shift({ padding: 8 }),
  ],
});

const submenuStyles = computed(() => ({
  ...floatingStyles.value,
  opacity: isPositioned.value ? undefined : 0,
}));
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

    <template v-if="!isMobile">
      <BaseMenu
        :open="isOpen"
        desktopTransition="fade-dropdown-side"
        :style="submenuStyles"
        ref="menuComponentRef"
        class="z-[1100]"
      >
        <slot></slot>
      </BaseMenu>
    </template>

    <Teleport
      v-if="sheetCtx?.submenuTarget.value"
      :to="sheetCtx.submenuTarget.value"
    >
      <div v-show="isMobileActive">
        <slot></slot>
      </div>
    </Teleport>
  </div>
</template>
