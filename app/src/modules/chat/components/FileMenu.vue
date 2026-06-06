<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, Brush } from '@lucide/vue';
import { onClickOutside, useEventListener, useWindowSize } from '@vueuse/core';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue';

const { width: windowWidth } = useWindowSize();
const isMobile = computed(() => windowWidth.value < 768);

const isOpen = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const menuComponentRef = ref<any>(null);
const menuRef = computed(() => menuComponentRef.value?.menuEl || null);

const { floatingStyles, isPositioned } = useFloating(triggerRef, menuRef, {
  strategy: 'fixed',
  placement: 'bottom-start',
  whileElementsMounted: autoUpdate,
  transform: false,
  middleware: [offset(8), flip(), shift({ padding: 8 })],
});

const menuStyles = computed(() => ({
  ...floatingStyles.value,
  opacity: isPositioned.value ? undefined : 0,
}));

function toggle() {
  isOpen.value = !isOpen.value;
}

function close() {
  isOpen.value = false;
}

onClickOutside(
  triggerRef,
  () => {
    close();
  },
  { ignore: [menuRef] },
);

useEventListener(document, 'keydown', (e) => {
  if (e.key === 'Escape') close();
});
</script>

<template>
  <div ref="triggerRef" class="relative inline-block">
    <BaseTooltip content="Add files" placement="bottom">
      <BaseButton
        :icon="Plus"
        :class="{ 'bg-surface-hover! text-on-ghost!': isOpen }"
        aria-haspopup="true"
        :aria-expanded="isOpen"
        @click="toggle"
      />
    </BaseTooltip>

    <Teleport to="body" :disabled="isMobile">
      <BaseMenu
        ref="menuComponentRef"
        :open="isOpen"
        :style="!isMobile ? menuStyles : undefined"
        class="min-w-56!"
        @close="close"
      >
        <BaseMenuButton :icon="Brush" @click="(drawImage, close())">
          Draw Image
        </BaseMenuButton>
      </BaseMenu>
    </Teleport>
  </div>
</template>
