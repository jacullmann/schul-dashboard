<script setup lang="ts">
import { ref, computed } from 'vue';
import { Settings2, Globe, Image, Brain, CalendarFold } from '@lucide/vue';
import {
  onClickOutside,
  useElementBounding,
  useWindowSize,
  useEventListener,
} from '@vueuse/core';

const webSearch = ref(true);
const createImage = ref(true);
const ponder = ref(false);
const answerLeisurely = ref(false);

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
    <BaseButton
      :icon="Settings2"
      size="lg"
      @click="toggle"
      :class="{ 'bg-surface-hover! text-on-surface!': isOpen }"
      aria-haspopup="true"
      :aria-expanded="isOpen"
    >
      Tools
    </BaseButton>

    <Teleport to="body">
      <BaseMenu
        v-if="isOpen"
        ref="menuRef"
        :style="menuStyles"
        class="min-w-56!"
      >
        <BaseMenuButton
          class="px-3!"
          :icon="Globe"
          isToggle
          :active="webSearch"
          @click="webSearch = !webSearch"
        >
          <div class="flex flex-col ml-1">
            <span class="text-sm leading-5 text-on-surface font-medium">Web search</span>
            <span class="text-xs leading-4 text-on-surface-muted font-normal"
              >Search the Internet for additional information</span
            >
          </div>
        </BaseMenuButton>
        <BaseMenuButton
          class="px-3!"
          :icon="Image"
          isToggle
          :active="createImage"
          @click="createImage = !createImage"
        >
          <div class="flex flex-col ml-1">
            <span class="text-sm leading-5 text-on-surface font-medium">Create Image</span>
            <span class="text-xs leading-4 text-on-surface-muted font-normal"
              >Design anything you can imagine</span
            >
          </div>
        </BaseMenuButton>
        <BaseMenuButton
          class="px-3!"
          :icon="Brain"
          isToggle
          :active="ponder"
          @click="ponder = !ponder"
        >
          <div class="flex flex-col ml-1">
            <span class="text-sm leading-5 text-on-surface font-medium">Ponder</span>
            <span class="text-xs leading-4 text-on-surface-muted font-normal"
              >Think for extended periods to give more profound answers</span
            >
          </div>
        </BaseMenuButton>
        <!-- TODO: Choose Icon: CalendarFold or Coffee -->
        <BaseMenuButton
          class="px-3!"
          :icon="CalendarFold"
          isToggle
          :active="answerLeisurely"
          @click="answerLeisurely = !answerLeisurely"
        >
          <div class="flex flex-col ml-1">
            <span class="text-sm leading-5 text-on-surface font-medium"
              >Answer leisurely</span
            >
            <span class="text-xs leading-4 text-on-surface-muted font-normal"
              >Queue your requests, if you aren't in a hurry</span
            >
          </div>
        </BaseMenuButton>
      </BaseMenu>
    </Teleport>
  </div>
</template>
