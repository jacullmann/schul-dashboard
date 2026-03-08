<template>
  <div
      ref="menuRef"
      class="img-menu-wrapper"
      :style="styleObject"
      @click.stop
  >
    <div class="img-menu open">
      <button class="menu-btn" @click="emit('upload')">
        <div class="fixall">
          <Upload />
          Bild hochladen
        </div>
      </button>

      <button v-if="canDelete" class="menu-btn danger" @click="emit('delete')">
        <div class="fixall">
          <Trash2 />
          Löschen
        </div>
      </button>
    </div>
  </div>
  <div class="menu-backdrop" @click="emit('close')" @contextmenu.prevent="emit('close')"></div>
</template>

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

<style scoped>
.img-menu-wrapper {
  position: fixed;
  z-index: 10001;
  min-width: 180px;
}

.img-menu {
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: 12px;
  padding:4px;
  flex-direction: column;
  display: flex;
  gap: 4px;
  box-shadow: var(--shadow-s);
}

.menu-btn {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 8px;
  color: var(--text);
  border-radius: 8px;
  cursor: pointer;
  font-size: var(--font-size-sub);
  transition: background 0.2s ease;
}

.menu-btn .fixall {
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1;
}

.menu-btn .fixall svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0
}

.menu-btn:hover {
  background: var(--gg);
}

.menu-btn.danger {
  color: var(--special--red);
  fill:  var(--special--red);
}

.menu-btn.danger:hover {
  background: var(--special--red--background);
}

.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: transparent;
}
</style>