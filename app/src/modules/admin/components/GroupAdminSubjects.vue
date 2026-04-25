<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Pencil, Trash2, Plus, RefreshCw, X, Check } from '@lucide/vue';
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
  <div class="animate-fade-up">
    <PageHeader>
      Fächer

      <template #action>
        <BaseTooltip content="Aktualisieren">
          <BaseButton
            @click="loadSubjects"
            :disabled="loading"
            variant="ghost"
            :icon="RefreshCw"
          />
        </BaseTooltip>
      </template>
    </PageHeader>

    <!-- Add Subject (admin only) -->
    <div v-if="isAdmin" class="mb-6">
      <div class="flex gap-2.5 items-center">
        <BaseInput
          id="new-subject-name-input"
          v-model="newSubjectName"
          class="flex-1 max-w-[400px]"
          placeholder="Neues Fach hinzufügen..."
          @keyup.enter="handleCreate"
          :disabled="saving"
        />
        <BaseButton
          @click="handleCreate"
          :disabled="!newSubjectName.trim() || saving"
          variant="action"
          :icon="Plus"
        >
          {{ saving ? 'Erstellt...' : 'Hinzufügen' }}
        </BaseButton>
      </div>
    </div>

    <!-- Loading / Empty -->
    <div
      v-if="loading && subjects.length === 0"
      class="text-center p-8 text-on-surface-muted text-body"
    >
      Lädt...
    </div>
    <div
      v-else-if="subjects.length === 0"
      class="text-center p-8 text-on-surface-muted text-body"
    >
      Keine Fächer vorhanden.
    </div>

    <!-- Subjects List -->
    <div v-else class="flex flex-col gap-1.5">
      <div
        v-for="subject in subjects"
        :key="subject.id"
        class="flex items-center justify-between p-3 bg-surface border border-surface-border shadow-input rounded-lg gap-3"
        :class="{ 'opacity-60': !subject.isActive }"
      >
        <!-- Display mode -->
        <template v-if="editingId !== subject.id">
          <div class="flex items-center gap-2 min-w-0">
            <span
              class="font-semibold text-body whitespace-nowrap overflow-hidden text-ellipsis"
              >{{ subjectLabel(subject) }}</span
            >
            <span
              class="text-[0.7rem] font-semibold uppercase tracking-[0.04em] flex-shrink-0"
              :class="
                subject.isActive ? 'text-on-surface' : 'text-on-surface-muted'
              "
            >
              {{ subject.isActive ? 'Aktiv' : 'Inaktiv' }}
            </span>
          </div>
          <BaseRow v-if="isAdmin" class="sm:w-full">
            <BaseCheckbox
              class="mx-2"
              :model-value="subject.isActive"
              @change="handleToggleActive(subject, $event)"
            />
            <BaseTooltip content="Umbenennen">
              <BaseButton
                variant="ghost"
                @click="startRename(subject)"
                :icon="Pencil"
              />
            </BaseTooltip>
            <BaseTooltip content="Löschen">
              <BaseButton
                variant="ghost"
                @click="deleteSubject(subject.id)"
                :icon="Trash2"
              />
            </BaseTooltip>
          </BaseRow>
        </template>

        <!-- Edit mode -->
        <template v-else>
          <div class="flex items-center gap-2 w-full">
            <BaseInput
              :id="'edit-subject-' + subject.id"
              v-model="editingName"
              class="flex-1 max-w-[400px]"
              @keyup.enter="saveRename(subject.id)"
              @keyup.escape="cancelRename"
              autofocus
            />
            <BaseTooltip content="Speichern">
              <BaseButton
                variant="ghost"
                @click="saveRename(subject.id)"
                :disabled="!editingName.trim() || saving"
                title="Speichern"
                :icon="Check"
              />
            </BaseTooltip>
            <BaseTooltip content="Abbrechen">
              <BaseButton
                variant="ghost"
                @click="cancelRename"
                title="Abbrechen"
                :icon="X"
              />
            </BaseTooltip>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
