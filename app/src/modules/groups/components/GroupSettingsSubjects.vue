<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Pencil, Trash2, Plus, RefreshCw, X, Check } from '@lucide/vue';
import { useSubjectAdmin } from '@/modules/groups/composables/useSubjectAdmin';
import type { AdminSubject } from '@/modules/groups/types';
import { computed } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

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

const { checkPermission } = useAppAuth();
const canEditSubjects = computed(() =>
  checkPermission('edit_subjects_courses'),
);

const newSubjectName = ref('');

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



async function handleCreate() {
  if (!newSubjectName.value.trim()) return;
  await createSubject(newSubjectName.value);
  newSubjectName.value = '';
}

function subjectLabel(subject: AdminSubject): string {
  const key = `common.subjects.${subject.name}`;
  return te(key) ? `${subject.name} (${t(key)})` : subject.name;
}

onMounted(() => {
  loadSubjects();
});
</script>

<template>
  <div class="animate-fade-up">
    <PageHeader>
      {{ t('groups.settings.subjects.title') }}

      <template #action>
        <BaseTooltip content="Aktualisieren">
          <BaseButton
            :disabled="loading"
            variant="ghost"
            :icon="RefreshCw"
            @click="loadSubjects"
          />
        </BaseTooltip>
      </template>
    </PageHeader>

    <div v-if="canEditSubjects" class="mb-6">
      <div class="flex gap-2.5 items-center">
        <BaseInput
          id="new-subject-name-input"
          v-model="newSubjectName"
          class="flex-1 max-w-[400px]"
          :placeholder="t('groups.settings.subjects.add_placeholder')"
          :disabled="saving"
          @keyup.enter="handleCreate"
        />
        <BaseButton
          :disabled="!newSubjectName.trim() || saving"
          :loading="saving"
          variant="action"
          :icon="Plus"
          @click="handleCreate"
        >
          {{ t('common.buttons.add') }}
        </BaseButton>
      </div>
    </div>

    <div
      v-if="loading && subjects.length === 0"
      class="flex justify-center p-8"
    >
      <BaseSpinner />
    </div>
    <div
      v-else-if="subjects.length === 0"
      class="text-center p-8 text-on-ghost-muted text-base"
    >
      {{ t('groups.settings.subjects.list.empty') }}
    </div>

    <div v-else class="flex flex-col gap-1.5">
      <div
        v-for="(subject, index) in subjects"
        :key="subject.id"
        class="flex items-center justify-between p-1 bg-surface border border-surface-border shadow-input rounded-xl gap-2 animate-fade-up"
        :style="{
          animationDelay: `${index * 0.075}s`,
          animationFillMode: 'both',
        }"
      >
        <template v-if="editingId !== subject.id">
          <span
            class="font-medium text-base whitespace-nowrap overflow-hidden text-ellipsis ml-2"
            >{{ subjectLabel(subject) }}</span
          >
          <BaseRow v-if="canEditSubjects" justify="end" class="flex-1">
            <BaseTooltip
              :content="t('groups.settings.subjects.rename')"
              placement="bottom"
            >
              <BaseButton
                variant="ghost"
                size="sm"
                :icon="Pencil"
                g
                @click="startRename(subject)"
              />
            </BaseTooltip>
            <BaseTooltip
              :content="t('common.buttons.delete')"
              placement="bottom"
            >
              <BaseButton
                variant="ghost"
                size="sm"
                :icon="Trash2"
                @click="deleteSubject(subject.id)"
              />
            </BaseTooltip>
          </BaseRow>
        </template>

        <template v-else>
          <div class="flex items-center gap-2 w-full">
            <BaseInput
              :id="'edit-subject-' + subject.id"
              v-model="editingName"
              class="flex-1 max-w-[400px]"
              autofocus
              @keyup.enter="saveRename(subject.id)"
              @keyup.escape="cancelRename"
            />
            <BaseTooltip :content="t('common.buttons.save')">
              <BaseButton
                variant="ghost"
                :disabled="!editingName.trim() || saving"
                :title="t('common.buttons.save')"
                :icon="Check"
                @click="saveRename(subject.id)"
              />
            </BaseTooltip>
            <BaseTooltip :content="t('common.buttons.cancel')">
              <BaseButton
                variant="ghost"
                :title="t('common.buttons.cancel')"
                :icon="X"
                @click="cancelRename"
              />
            </BaseTooltip>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
