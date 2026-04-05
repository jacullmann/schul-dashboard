<script setup lang="ts">
import { ref, nextTick, onBeforeUnmount } from 'vue';

const props = defineProps<{
  content?: string;
  shortcut?: string[];
  disabled?: boolean;
}>();

const isVisible = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const tooltipStyle = ref({ top: '0px', left: '0px' });

const show = async () => {
  if (props.disabled || !props.content) return;
  isVisible.value = true;

  // Wait a tick for the teleported element to mount before calculating position
  await nextTick();
  updatePosition();
};

const hide = () => {
  isVisible.value = false;
};

const updatePosition = () => {
  if (!triggerRef.value) return;

  // Get exact coordinates of the trigger on the screen
  const rect = triggerRef.value.getBoundingClientRect();

  // Position to the right of the trigger, centered vertically
  tooltipStyle.value = {
    top: `${rect.top + rect.height / 2}px`,
    left: `${rect.right + 12}px`, // 12px offset from the button
    transform: 'translateY(-50%)',
  };
};

// Cleanup in case the component is destroyed while hovering
onBeforeUnmount(hide);
</script>

<template>
  <div
    ref="triggerRef"
    class="w-full flex"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot></slot>

    <Teleport to="body">
      <transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 -translate-x-2"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 -translate-x-2"
      >
        <div
          v-if="isVisible"
          class="fixed z-(--z-tooltip) px-3 py-1.5 bg-action text-on-action gap-2 text-xs leading-4 font-medium rounded-md shadow-lg pointer-events-none whitespace-nowrap"
          :style="tooltipStyle"
        >
          {{ content }}
          <BaseKbdGroup v-if="shortcut" :keys="shortcut" :flat="true" on="action" />
        </div>
      </transition>
    </Teleport>
  </div>
</template>