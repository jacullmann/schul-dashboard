<template>
  <div
      class="context-menu-wrapper"
      :style="{ top: y + 'px', left: x + 'px' }"
      @click.stop
  >
    <div class="item-menu open">
      <button class="menu-btn" @click="emit('upload')">
        <div class="fixall">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Bild hinzufügen
        </div>
      </button>

      <button v-if="canDelete" class="menu-btn danger" @click="emit('delete')">
        <div class="fixall">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          Bild löschen
        </div>
      </button>
    </div>
  </div>
  <div class="menu-backdrop" @click="emit('close')" @contextmenu.prevent="emit('close')"></div>
</template>

<script setup lang="ts">
defineProps<{
  x: number;
  y: number;
  canDelete: boolean;
}>();

const emit = defineEmits(['close', 'upload', 'delete']);
</script>

<style scoped>
.context-menu-wrapper {
  position: fixed;
  z-index: 10001; /* Higher than items, lower than modals */
  min-width: 160px;
}

/* Reusing existing menu styles via deep or local definition,
   assuming global styles or copied from Hausaufgaben.vue */
.item-menu {
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  box-shadow: var(--shadow-l);
}

.menu-btn {
  display: block;
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

.fixall { display: flex; align-items: center; gap: 8px; line-height: 1; }

.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: transparent;
}
</style>