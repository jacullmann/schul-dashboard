<script setup lang="ts">
import { ref } from 'vue';
import { Trash2 } from 'lucide-vue-next';
import Checkbox from '@/common/components/Checkbox.vue';
import type { AdminAnnouncement } from '@/modules/admin/types';

const props = defineProps<{
  announcements: AdminAnnouncement[];
  creating: boolean;
}>();

const emit = defineEmits<{
  (e: 'create', content: string, color: string, showAsPopup: boolean): void;
  (e: 'delete', id: string): void;
}>();

const annContent = ref('');
const annColor = ref('warn');
const annShowAsPopup = ref(false);

function handleCreateAnn() {
  emit('create', annContent.value, annColor.value, annShowAsPopup.value);
  annContent.value = '';
  annShowAsPopup.value = false;
  // wait, earlier `GroupAdminDashboard.vue` used `.then()`.
  // The event is handled synchronously, but let's assume the reset is optimistic here.
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
  });
}
</script>

<template>
  <div class="tab-panel">
    <div class="panel-header">
      <h2>Ankündigungen</h2>
    </div>

    <div class="ann-form-card">
      <textarea
          v-model="annContent"
          class="input ann-textarea"
          placeholder="Neue Ankündigung verfassen..."
          rows="3"
      ></textarea>
      <div class="ann-form-footer">
        <select v-model="annColor" class="input ann-select">
          <option value="info">Info</option>
          <option value="warn">Warnung</option>
          <option value="danger">Wichtig</option>
        </select>
        <label class="popup-checkbox">
          <Checkbox v-model="annShowAsPopup" /> Als Popup
        </label>
        <button class="btn action" @click="handleCreateAnn" :disabled="!annContent.trim() || creating">
          {{ creating ? 'Erstellt...' : 'Veröffentlichen' }}
        </button>
      </div>
    </div>

    <div v-if="announcements.length === 0" class="empty-hint">Keine Ankündigungen vorhanden.</div>
    <div v-else class="ann-list">
      <div v-for="ann in announcements" :key="ann.id" class="ann-item" :class="'ann-' + ann.color">
        <div class="ann-item-body">{{ ann.content }}</div>
        <div class="ann-item-footer">
          <span class="ann-item-date">{{ formatDate(ann.createdAt) }}</span>
          <button class="btn-icon danger" @click="emit('delete', ann.id)">
            <Trash2 :size="14" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-panel { animation: fadeUp 0.2s ease; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-header h2 {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
}

.ann-form-card {
  margin-bottom: 24px;
}

.ann-textarea {
  width: 100%;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  margin-bottom: 10px;
}

.ann-form-footer {
  display: flex;
  gap: 10px;
  align-items: center;
}

.ann-select { width: 120px; }

.popup-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-sub);
  cursor: pointer;
  white-space: nowrap;
}

.ann-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ann-item {
  padding: 14px 16px;
  border-radius: 10px;
  border-left: 3px solid var(--border-canvas);
  background: var(--bg-surface);
}

.ann-info { border-left-color: #3b82f6; }
.ann-warn { border-left-color: #f59e0b; }
.ann-danger { border-left-color: #ef4444; }

.ann-item-body {
  font-size: var(--font-size-body);
  line-height: 1.5;
  margin-bottom: 8px;
}

.ann-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ann-item-date {
  font-size: var(--font-size-sub);
  color: var(--sub);
}

.empty-hint {
  text-align: center;
  padding: 32px;
  color: var(--sub);
  font-size: var(--font-size-body);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--sub);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-icon:hover { background: var(--bg-interactive-hover); color: var(--text-default); }
.btn-icon.danger:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.btn-icon:disabled { opacity: 0.4; cursor: not-allowed; }

@media (max-width: 640px) {
  .ann-form-footer { flex-wrap: wrap; }
}
</style>
