<script setup lang="ts">
import { ref } from 'vue';

defineOptions({ inheritAttrs: false });

withDefaults(
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
  (e: 'after-leave'): void;
}>();

const menuEl = ref<HTMLElement | null>(null);

defineExpose({ menuEl });
</script>

<template>
  <Transition
    appear
    :name="desktopTransition"
    @after-leave="emit('after-leave')"
  >
    <div
      v-if="open"
      ref="menuEl"
      v-bind="$attrs"
      class="absolute flex flex-col items-stretch p-1 bg-surface border border-surface-border rounded-xl min-w-[180px] shadow-menu overflow-y-auto overflow-x-hidden gap-0 z-[1000]"
    >
      <slot></slot>
    </div>
  </Transition>
</template>
