<script lang="ts">
import { ref } from 'vue';

const activeTrigger = ref<HTMLElement | null>(null);
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue';
import {
  useElementBounding,
  useWindowSize,
  useEventListener,
} from '@vueuse/core';
import BaseMenuButton from '@/common/components/BaseMenuButton.vue';
import BaseMenu from '@/common/components/BaseMenu.vue';
import type { Component } from 'vue';

const props = defineProps<{
  label?: string;
  icon?: Component;
  disabled?: boolean;
}>();

const triggerRef = ref<HTMLElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);

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
const { width: vw, height: vh } = useWindowSize();

const popupStyle = computed(() => {
  if (!isOpen.value) return {};

  let left = btnRight.value + 4;
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
  <div class="relative" @mouseenter="onMouseEnter" @focusin="onMouseEnter">
    <div ref="triggerRef">
      <BaseMenuButton
        :icon="icon"
        :isSubmenu="true"
        :disabled="disabled"
        :force-hover="isOpen"
        type="button"
        aria-haspopup="true"
        :aria-expanded="isOpen"
      >
        <slot name="label">{{ label }}</slot>
      </BaseMenuButton>
    </div>

    <Transition name="fade-dropdown-side">
      <BaseMenu
        v-if="isOpen"
        :style="popupStyle"
        :ref="(el: any) => (menuRef = el?.$el)"
        class="z-[1100]"
      >
        <slot></slot>
      </BaseMenu>
    </Transition>
  </div>
</template>
