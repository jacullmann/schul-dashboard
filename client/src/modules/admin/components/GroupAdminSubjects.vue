<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Pencil, Trash2, Plus, RefreshCw, X, Check } from 'lucide-vue-next';
import Checkbox from '@/common/components/Checkbox.vue';
import { useSubjectAdmin } from '@/modules/admin/composables/useSubjectAdmin';
import type { AdminSubject } from '@/modules/admin/types';

const props = defineProps<{
  isAdmin: boolean;
}>();

const {
  subjects,
  loading,
  saving,
  loadSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} = useSubjectAdmin();

// New subject form
const newSubjectName = ref('');

// Inline editing state
const editingId = ref<string | null>(null);
const editingName = ref('');

function startRename(subject: AdminSubject) {
  editingId.value = subject.id;
  editingName.value = subject.name;
}

function cancelRename() {
  editingId.value = null;
  editingName.value = '';
}

async function saveRename(id: string) {
  if (!editingName.value.trim()) return;
  await updateSubject(id, { name: editingName.value.trim() });
  editingId.value = null;
  editingName.value = '';
}

async function handleToggleActive(subject: AdminSubject, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  await updateSubject(subject.id, { isActive: checked });
}

async function handleCreate() {
  if (!newSubjectName.value.trim()) return;
  await createSubject(newSubjectName.value);
  newSubjectName.value = '';
}

onMounted(() => {
  loadSubjects();
});
</script>

<template>
  <div class="tab-panel">
    <div class="panel-header">
      <h2>Fächer</h2>
      <button class="btn ghost" @click="loadSubjects" :disabled="loading">
        <RefreshCw :size="14" :class="{ 'spin-icon': loading }" />
        <span>Aktualisieren</span>
      </button>
    </div>

    <!-- Add Subject (admin only) -->
    <div v-if="isAdmin" class="add-form-card">
      <div class="add-form-row">
        <input
            v-model="newSubjectName"
            class="input add-input"
            placeholder="Neues Fach hinzufügen..."
            @keyup.enter="handleCreate"
            :disabled="saving"
        />
        <button
            class="btn action"
            @click="handleCreate"
            :disabled="!newSubjectName.trim() || saving"
        >
          <Plus :size="15" />
          <span>{{ saving ? 'Erstellt...' : 'Hinzufügen' }}</span>
        </button>
      </div>
    </div>

    <!-- Loading / Empty -->
    <div v-if="loading && subjects.length === 0" class="empty-hint">Lädt...</div>
    <div v-else-if="subjects.length === 0" class="empty-hint">Keine Fächer vorhanden.</div>

    <!-- Subjects List -->
    <div v-else class="subjects-list">
      <div
          v-for="subject in subjects"
          :key="subject.id"
          class="subject-row"
          :class="{ inactive: !subject.isActive }"
      >
        <!-- Display mode -->
        <template v-if="editingId !== subject.id">
          <div class="subject-info">
            <span class="subject-name">{{ subject.name }}</span>
            <span class="status-badge" :class="subject.isActive ? 'active' : 'inactive'">
              {{ subject.isActive ? 'Aktiv' : 'Inaktiv' }}
            </span>
          </div>
          <div v-if="isAdmin" class="subject-actions">
            <label class="toggle-label">
              <Checkbox
                  :model-value="subject.isActive"
                  @change="handleToggleActive(subject, $event)"
              />
            </label>
            <button class="btn-icon" @click="startRename(subject)" title="Umbenennen">
              <Pencil :size="14" />
            </button>
            <button class="btn-icon danger" @click="deleteSubject(subject.id)" title="Löschen">
              <Trash2 :size="14" />
            </button>
          </div>
        </template>

        <!-- Edit mode -->
        <template v-else>
          <div class="edit-row">
            <input
                v-model="editingName"
                class="input edit-input"
                @keyup.enter="saveRename(subject.id)"
                @keyup.escape="cancelRename"
                autofocus
            />
            <button
                class="btn-icon confirm"
                @click="saveRename(subject.id)"
                :disabled="!editingName.trim() || saving"
                title="Speichern"
            >
              <Check :size="15" />
            </button>
            <button class="btn-icon" @click="cancelRename" title="Abbrechen">
              <X :size="15" />
            </button>
          </div>
        </template>
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

.panel-header .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-sub);
}

/* Add form */
.add-form-card {
  margin-bottom: 24px;
}

.add-form-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.add-input {
  flex: 1;
  max-width: 400px;
}

.add-form-row .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

/* Subjects list */
.subjects-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.subject-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border-surface);
  box-shadow: var(--input-shadow);
  border-radius: 10px;
  gap: 12px;
  transition: opacity 0.15s;
}

.subject-row.inactive {
  opacity: 0.55;
}

.subject-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.subject-name {
  font-weight: 600;
  font-size: var(--font-size-body);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.status-badge.active { color: #22c55e; }
.status-badge.inactive { color: var(--sub); }

.subject-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.toggle-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

/* Edit row */
.edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.edit-input {
  flex: 1;
  max-width: 400px;
}

/* Button icons */
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
.btn-icon.confirm:hover { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
.btn-icon:disabled { opacity: 0.4; cursor: not-allowed; }

.empty-hint {
  text-align: center;
  padding: 32px;
  color: var(--sub);
  font-size: var(--font-size-body);
}

.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 640px) {
  .subject-row { flex-direction: column; align-items: flex-start; gap: 8px; }
  .subject-actions { width: 100%; }
  .add-form-row { flex-wrap: wrap; }
  .add-input { max-width: 100%; }
  .edit-row { flex-wrap: wrap; }
  .edit-input { max-width: 100%; }
}
</style>
