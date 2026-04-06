<script setup lang="ts">
import {
  ref,
  nextTick,
  onMounted,
  onBeforeUnmount,
  type CSSProperties,
} from 'vue';

const props = withDefaults(
  defineProps<{
    content?: string;
    shortcut?: string[];
    disabled?: boolean;
    debounce?: 'slow' | 'fast';
  }>(),
  {
    debounce: 'fast',
  },
);

const isVisible = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const tooltipStyle = ref<CSSProperties>({ top: '0px', left: '0px' });

// Timer references for debounce cleanup
let showTimeout: ReturnType<typeof setTimeout> | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

const clearTimers = () => {
  if (showTimeout) clearTimeout(showTimeout);
  if (hideTimeout) clearTimeout(hideTimeout);
};

const show = () => {
  if (props.disabled || !props.content) return;

  clearTimers();

  const delay = props.debounce === 'slow' ? 350 : 50;

  showTimeout = setTimeout(async () => {
    if (props.disabled || !props.content) return;

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

const updatePosition = () => {
  if (!triggerRef.value) return;

  const rect = triggerRef.value.getBoundingClientRect();

  tooltipStyle.value = {
    top: `${rect.top + rect.height / 2}px`,
    left: `${rect.right + 12}px`,
    transform: 'translateY(-50%)',
  };
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isVisible.value) {
    immediateHide();
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
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
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 -translate-x-2"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 -translate-x-2"
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
