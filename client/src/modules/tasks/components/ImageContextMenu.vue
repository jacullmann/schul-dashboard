<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { Upload, Trash2 } from 'lucide-vue-next';

const props = defineProps<{
  x: number;
  y: number;
  canDelete: boolean;
}>();

const emit = defineEmits(['close', 'upload', 'delete']);

const menuRef = ref<HTMLElement | null>(null);

// Start hidden to avoid flicker during calculation
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
  const padding = 10; // Space from edge

  // 1. Check Horizontal (Right edge)
  // If opening at X would push the menu off-screen...
  if (newX + rect.width > winWidth) {
    // ...shift it to the left so it ends at window edge (minus padding)
    newX = winWidth - rect.width - padding;
  }
  // Optional: Prevent it from going off the left edge
  if (newX < padding) newX = padding;

  // 2. Check Vertical (Bottom edge)
  // If opening at Y would push the menu off-screen...
  if (newY + rect.height > winHeight) {
    // ...shift it up
    newY = winHeight - rect.height - padding;
  }
  // Optional: Prevent it from going off the top edge
  if (newY < padding) newY = padding;

  // Apply corrected coordinates and show the menu
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
      class="img-menu-wrapper"
      :style="styleObject"
      @click.stop
  >
    <div class="menu open">
      <button class="menu-btn" @click="emit('upload')">
        <div class="menu-btn-content">
          <Upload />
          Bild hochladen
        </div>
      </button>

      <button v-if="canDelete" class="menu-btn danger" @click="emit('delete')">
        <div class="menu-btn-content">
          <Trash2 />
          Löschen
        </div>
      </button>
    </div>
  </div>
  <div class="menu-backdrop" @click="emit('close')" @contextmenu.prevent="emit('close')"></div>
</template>

<style scoped>
.img-menu-wrapper {
  position: fixed;
  z-index: 10001;
  min-width: 180px;
}

.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: transparent;
}
</style>