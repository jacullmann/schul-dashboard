<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Pencil, Trash2, Plus, RefreshCw, X, Check } from 'lucide-vue-next';
import BaseCheckbox from '@/common/components/BaseCheckbox.vue';
import { useSubjectAdmin } from '@/modules/admin/composables/useSubjectAdmin';
import type { AdminSubject } from '@/modules/admin/types';

const { t, te } = useI18n();

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

function subjectLabel(subject: AdminSubject): string {
  const key = `global.subjects.${subject.name}`;
  return te(key) ? `${subject.name} (${t(key)})` : subject.name;
}

onMounted(() => {
  loadSubjects();
});
</script>

<template>
  <div class="tab-panel">
    <div class="panel-header">
      <h2>Fächer</h2>
      <BaseButton @click="loadSubjects" :disabled="loading" variant="ghost">
        <RefreshCw :size="14" :class="{ 'spin-icon': loading }" />
        <span>Aktualisieren</span>
      </BaseButton>
    </div>

    <!-- Add Subject (admin only) -->
    <div v-if="isAdmin" class="add-form-card">
      <div class="add-form-row">
        <BaseInput
            v-model="newSubjectName"
            class="input add-input"
            placeholder="Neues Fach hinzufügen..."
            @keyup.enter="handleCreate"
            :disabled="saving"
        />
        <BaseButton @click="handleCreate" :disabled="!newSubjectName.trim() || saving" variant="action">
          <Plus :size="16" />
          <span>{{ saving ? 'Erstellt...' : 'Hinzufügen' }}</span>
        </BaseButton>
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
            <span class="subject-name">{{ subjectLabel(subject) }}</span>
            <span class="status-badge" :class="subject.isActive ? 'active' : 'inactive'">
              {{ subject.isActive ? 'Aktiv' : 'Inaktiv' }}
            </span>
          </div>
          <div v-if="isAdmin" class="subject-actions">
            <label class="toggle-label">
              <BaseCheckbox
                  :model-value="subject.isActive"
                  @change="handleToggleActive(subject, $event)"
              />
            </label>
            <button class="btn-icon" @click="startRename(subject)" title="Umbenennen">
              <Pencil :size="16" />
            </button>
            <button class="btn-icon danger" @click="deleteSubject(subject.id)" title="Löschen">
              <Trash2 :size="16" />
            </button>
          </div>
        </template>

        <!-- Edit mode -->
        <template v-else>
          <div class="edit-row">
            <BaseInput
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
              <Check :size="16" />
            </button>
            <button class="btn-icon" @click="cancelRename" title="Abbrechen">
              <X :size="16" />
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
  font-size: var(--text-sub);
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
  padding: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  box-shadow: var(--shadow-input);
  border-radius: var(--radius-lg);
  gap: 12px;
}

.subject-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.subject-name {
  font-weight: 600;
  font-size: var(--text-body);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.subject-row.inactive .subject-name {
  color: var(--color-on-surface-muted)
}


.status-badge {
  font-size: var(--text-footnote);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.status-badge.active { color: var(--color-on-surface); }
.status-badge.inactive { color: var(--color-on-surface-muted); }

.subject-actions {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}

.toggle-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin: 0;
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
  padding: 8px;
  margin: -8px;
  border-radius: var(--radius-md);
  background: transparent;
  border: none;
  color: var(--color-sub);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-icon:hover { background: var(--color-surface-hover); color: var(--color-on-surface); }
.btn-icon.danger:hover { background: var(--color-danger-surface); color: var(--color-danger); }
.btn-icon.confirm:hover { background: rgba(34, 197, 94, 0.1); color: var(--color-success); }
.btn-icon:disabled { opacity: 0.4; cursor: not-allowed; }

.empty-hint {
  text-align: center;
  padding: 32px;
  color: var(--color-sub);
  font-size: var(--text-body);
}

.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 300px) {
  .subject-row { flex-direction: column; align-items: flex-start; gap: 8px; }
  .subject-actions { width: 100%; }
  .add-form-row { flex-wrap: wrap; }
  .add-input { max-width: 100%; }
  .edit-row { flex-wrap: wrap; }
  .edit-input { max-width: 100%; }
}
</style>
