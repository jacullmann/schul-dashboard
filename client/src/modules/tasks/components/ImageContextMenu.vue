<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { Upload, Trash2 } from '@lucide/vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  x: number;
  y: number;
  canDelete: boolean;
}>();

const emit = defineEmits(['close', 'upload', 'delete']);

const menuRef = ref<HTMLElement | null>(null);

const styleObject = reactive({
  top: props.y + 'px',
  left: props.x + 'px',
  opacity: '0',
});

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close');
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKeyDown);
  await nextTick();

  if (!menuRef.value) return;

  const rect = menuRef.value.getBoundingClientRect();
  const winWidth = window.innerWidth;
  const winHeight = window.innerHeight;

  let newX = props.x;
  let newY = props.y;
  const padding = 10;

  if (newX + rect.width > winWidth) {
    newX = winWidth - rect.width - padding;
  }
  if (newX < padding) newX = padding;

  if (newY + rect.height > winHeight) {
    newY = winHeight - rect.height - padding;
  }
  if (newY < padding) newY = padding;

  styleObject.left = `${newX}px`;
  styleObject.top = `${newY}px`;
  styleObject.opacity = '1';
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <div
      ref="menuRef"
      class="position-fixed z-10001 min-w-[180px]"
      :style="styleObject"
      @click.stop
  >
    <BaseMenu>
      <BaseMenuButton @click="emit('upload')">
        <Upload />
        {{ t('school.tasks.items.menu.uploadImages') }}
      </BaseMenuButton>

      <BaseMenuButton v-if="canDelete" @click="emit('delete')">
        <Trash2 />
        {{ t('global.buttons.delete') }}
      </BaseMenuButton>
    </BaseMenu>
  </div>
  <div class="position-fixed inset-0 z-10000" @click="emit('close')" @contextmenu.prevent="emit('close')"></div>
</template>
