<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, Brush } from '@lucide/vue';
import {
  onClickOutside,
  useElementBounding,
  useWindowSize,
  useEventListener,
} from '@vueuse/core';

const isOpen = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);

const { bottom, left, right } = useElementBounding(triggerRef);
const { width: windowWidth } = useWindowSize();

const menuStyles = computed(() => {
  const menuMinWidth = 192; // min-w-48 = 12rem = 192px
  const shouldFlip = left.value + menuMinWidth > windowWidth.value;

  return {
    position: 'fixed' as const,
    top: `${bottom.value + 8}px`,
    left: shouldFlip ? `${right.value - menuMinWidth}px` : `${left.value}px`,
    zIndex: 1000,
  };
});

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
  <div class="relative inline-block" ref="triggerRef">
    <BaseTooltip content="Add files" placement="bottom">
      <BaseButton
        :icon="Plus"
        size="lg"
        @click="toggle"
        :class="{ 'bg-surface-hover! text-on-ghost!': isOpen }"
        aria-haspopup="true"
        :aria-expanded="isOpen"
      />
    </BaseTooltip>

    <Teleport to="body">
      <BaseMenu
        v-if="isOpen"
        ref="menuRef"
        :style="menuStyles"
        class="min-w-56!"
      >
        <BaseMenuButton :icon="Brush" @click="(drawImage, close())">
          Draw Image
        </BaseMenuButton>
      </BaseMenu>
    </Teleport>
  </div>
</template>
