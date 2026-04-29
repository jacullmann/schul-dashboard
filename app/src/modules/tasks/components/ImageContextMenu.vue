<script setup lang="ts">
import { ref, computed } from 'vue';
import { Upload, Trash2 } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import {
  useEventListener,
  useElementBounding,
  useWindowSize,
} from '@vueuse/core';

const { t } = useI18n();

const props = defineProps<{
  x: number;
  y: number;
  canDelete: boolean;
}>();

const emit = defineEmits(['cancel', 'upload', 'delete']);

const menuRef = ref<HTMLElement | null>(null);

const { width: menuW, height: menuH } = useElementBounding(menuRef);
const { width: winW, height: winH } = useWindowSize();

const padding = 10;

const styleObject = computed(() => {
  const x = Math.min(
    Math.max(padding, props.x),
    winW.value - menuW.value - padding,
  );
  const y = Math.min(
    Math.max(padding, props.y),
    winH.value - menuH.value - padding,
  );
  return {
    top: `${y}px`,
    left: `${x}px`,
    // Stay hidden until bounding data is available to avoid initial flash at wrong position
    opacity: menuW.value > 0 ? '1' : '0',
  };
});

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('cancel');
});
</script>

<template>
  <div
    ref="menuRef"
    class="fixed z-[10001] min-w-[180px]"
    :style="styleObject"
    @click.stop
  >
    <BaseMenu class="min-w-[180px]">
      <BaseMenuButton :icon="Upload" @click="emit('upload')">
        {{ t('school.tasks.items.menu.uploadImages') }}
      </BaseMenuButton>

      <BaseMenuButton v-if="canDelete" variant="danger" :icon="Trash2" @click="emit('delete')">
        {{ t('global.buttons.delete') }}
      </BaseMenuButton>
    </BaseMenu>
  </div>

  <div
    class="fixed inset-0 z-[10000] cursor-default"
    @click="emit('cancel')"
    @contextmenu.prevent="emit('cancel')"
  ></div>
</template>
