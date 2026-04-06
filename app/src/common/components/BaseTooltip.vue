<script setup lang="ts">
import {
  ref,
  nextTick,
  onMounted,
  onBeforeUnmount,
  computed,
  type CSSProperties,
} from 'vue';

const props = withDefaults(
  defineProps<{
    content?: string;
    shortcut?: string[];
    disabled?: boolean;
    debounce?: 'slow' | 'fast';
    placement?: 'top' | 'bottom' | 'left' | 'right';
  }>(),
  {
    debounce: 'fast',
    placement: 'right',
  },
);

const isVisible = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const tooltipStyle = ref<CSSProperties>({});

let showTimeout: ReturnType<typeof setTimeout> | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

const clearTimers = () => {
  if (showTimeout) clearTimeout(showTimeout);
  if (hideTimeout) clearTimeout(hideTimeout);
};

const updatePosition = () => {
  if (!triggerRef.value) return;

  const rect = triggerRef.value.getBoundingClientRect();
  const offset = 8; // Distance between trigger and tooltip

  const pos: Record<string, CSSProperties> = {
    top: {
      top: `${rect.top - offset}px`,
      left: `${rect.left + rect.width / 2}px`,
      transform: 'translate(-50%, -100%)',
    },
    bottom: {
      top: `${rect.bottom + offset}px`,
      left: `${rect.left + rect.width / 2}px`,
      transform: 'translateX(-50%)',
    },
    left: {
      top: `${rect.top + rect.height / 2}px`,
      left: `${rect.left - offset}px`,
      transform: 'translate(-100%, -50%)',
    },
    right: {
      top: `${rect.top + rect.height / 2}px`,
      left: `${rect.right + offset}px`,
      transform: 'translateY(-50%)',
    },
  };

  tooltipStyle.value = pos[props.placement];
};

// Dynamic transition classes based on placement
const transitionClasses = computed(() => {
  const directions = {
    top: 'translate-y-1',
    bottom: '-translate-y-1',
    left: 'translate-x-1',
    right: '-translate-x-1',
  };
  
  const fromClass = `opacity-0 ${directions[props.placement]}`;
  
  return {
    enter: 'transition duration-150 ease-out',
    leave: 'transition duration-100 ease-in',
    from: fromClass,
    to: 'opacity-100 translate-0',
  };
});

const show = () => {
  if (props.disabled || !props.content) return;
  clearTimers();
  const delay = props.debounce === 'slow' ? 350 : 50;

  showTimeout = setTimeout(async () => {
    isVisible.value = true;
    await nextTick();
    updatePosition();
  }, delay);
};

const hide = () => {
  clearTimers();
  hideTimeout = setTimeout(() => {
    isVisible.value = false;
  }, 50);
};

const immediateHide = () => {
  clearTimers();
  isVisible.value = false;
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isVisible.value) immediateHide();
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  // Optional: Update position on scroll/resize to keep tooltip attached
  window.addEventListener('scroll', updatePosition, true);
  window.addEventListener('resize', updatePosition);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('scroll', updatePosition, true);
  window.removeEventListener('resize', updatePosition);
  immediateHide();
});
</script>

<template>
  <div
    ref="triggerRef"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot></slot>

    <Teleport to="body">
      <transition
        :enter-active-class="transitionClasses.enter"
        :enter-from-class="transitionClasses.from"
        :enter-to-class="transitionClasses.to"
        :leave-active-class="transitionClasses.leave"
        :leave-from-class="transitionClasses.to"
        :leave-to-class="transitionClasses.from"
      >
        <div
          v-if="isVisible"
          class="fixed z-(--z-tooltip) px-2 py-1.5 bg-action text-on-action text-xs leading-4 font-medium rounded-md shadow-lg pointer-events-none whitespace-nowrap"
          :style="tooltipStyle"
        >
          {{ content }}
          <BaseKbdGroup
            v-if="shortcut"
            :keys="shortcut"
            :flat="true"
            on="action"
            class="ml-2"
          />
        </div>
      </transition>
    </Teleport>
  </div>
</template>
