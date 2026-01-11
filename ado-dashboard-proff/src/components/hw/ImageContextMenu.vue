<template>
  <div
      class="ctx-menu"
      :style="{ top: y + 'px', left: x + 'px' }"
      @click.stop
      @contextmenu.prevent
  >
    <button class="menu-btn" @click="emit('add')">
      <div class="fixall"><Images :size="16" /> Ein weiteres hinzufügen</div>
    </button>
    <button class="menu-btn danger" @click="emit('delete')">
      <div class="fixall"><Trash2 :size="16" /> Bild löschen</div>
    </button>
  </div>

  <div class="ctx-overlay" @click="emit('close')" @contextmenu.prevent="emit('close')"></div>
</template>

<script setup lang="ts">
import { Images, Trash2 } from 'lucide-vue-next';

defineProps<{
  x: number,
  y: number
}>();

const emit = defineEmits(['close', 'add', 'delete']);
</script>

<style scoped>
.ctx-menu {
  position: fixed;
  z-index: 9999;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: 8px;
  padding: 6px;
  box-shadow: var(--shadow-l);
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ctx-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: transparent;
}

.menu-btn {
  display: flex;
  align-items: center;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 8px;
  color: var(--text);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}

.menu-btn:hover { background: var(--gg); }

.menu-btn.danger { color: var(--special--red); }
.menu-btn.danger:hover { background: var(--special--red--background); }

.fixall {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>