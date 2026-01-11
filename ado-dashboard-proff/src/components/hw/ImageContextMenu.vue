<template>
  <div class="img-menu-wrapper" :style="{ top: y + 'px', left: x + 'px' }" @click.stop>
    <div class="img-menu open">
      <button class="menu-btn" @click="emit('upload')">
        <div class="fixall">
          <Upload />
          Bild hochladen
        </div>
      </button>

      <button class="menu-btn danger" @click="emit('delete')">
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
import { Upload, Trash2 } from 'lucide-vue-next';

defineProps<{
  x: number;
  y: number;
  canDelete: boolean;
}>();

const emit = defineEmits(['close', 'upload', 'delete']);
</script>

<style scoped>
.img-menu-wrapper {
  position: fixed;
  z-index: 10001;
  min-width: 150px;
}

.img-menu {
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: 12px;
  padding:8px;
  flex-direction: column;
  display: flex;
  gap: 5px;
  box-shadow: var(--shadow-s);
}

.menu-btn {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 6px;
  color: var(--text);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
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