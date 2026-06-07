<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { Plus } from '@lucide/vue';
import { useSubjectAdmin } from '@/modules/groups/composables/useSubjectAdmin';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

const i18n = useI18n();
const { t } = i18n;

defineProps<{
  isAdmin: boolean;
}>();

const route = useRoute();
const router = useRouter();

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
const newSubjectCategory = ref('core');
const showCreateModal = ref(false);
const newSubjectInputRef = ref<any>(null);

const groupId = computed(() => route.params.groupId as string);
const subTabId = computed(() => route.params.subTab as string | undefined);
const subject = computed(() => {
  if (!subTabId.value) return null;
  return subjects.value.find((s) => s.id === subTabId.value) || null;
});

const subjectNameInput = ref('');
const subjectCategoryInput = ref('core');

const categoryOptions = computed(() => [
  { value: 'core', label: t('groups.settings.subjects.categories.core') },
  {
    value: 'elective',
    label: t('groups.settings.subjects.categories.elective'),
  },
  { value: 'extra', label: t('groups.settings.subjects.categories.extra') },
]);

// Sync subject name and category inputs when subject loads or changes
watch(
  subject,
  (newSub) => {
    if (newSub) {
      subjectNameInput.value = newSub.name;
      subjectCategoryInput.value = newSub.category || 'core';
    }
  },
  { immediate: true },
);

function resetSubjectName() {
  if (subject.value) {
    subjectNameInput.value = subject.value.name;
    subjectCategoryInput.value = subject.value.category || 'core';
  }
}

async function handleSave() {
  if (!subject.value) return;
  const nameTrimmed = subjectNameInput.value.trim();
  if (!nameTrimmed) return;
  await updateSubject(subject.value.id, {
    name: nameTrimmed,
    category: subjectCategoryInput.value,
  });
}

async function handleDelete() {
  if (!subject.value) return;
  const ok = await deleteSubject(subject.value.id);
  if (ok) {
    void router.push(`/groups/${groupId.value}/settings/subjects`);
  }
}

function goToSubject(id: string) {
  void router.push(`/groups/${groupId.value}/settings/subjects/${id}`);
}

function openCreateModal() {
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
  newSubjectName.value = '';
  newSubjectCategory.value = 'core';
}

async function handleCreate() {
  if (!newSubjectName.value.trim()) return;
  const oldLength = subjects.value.length;
  await createSubject(newSubjectName.value, newSubjectCategory.value);
  if (subjects.value.length > oldLength) {
    newSubjectName.value = '';
    newSubjectCategory.value = 'core';
    showCreateModal.value = false;
  }
}

watch(showCreateModal, async (open) => {
  if (open) {
    await nextTick();
    newSubjectInputRef.value?.focus();
  }
});

onMounted(() => {
  void loadSubjects();
});
</script>

<template>
  <div class="animate-fade-up">
    <!-- List View -->
    <div v-if="!subTabId">
      <PageHeader>
        {{ t('groups.settings.subjects.title') }}

        <template #action>
          <BaseTooltip
            v-if="canEditSubjects"
            :content="t('common.buttons.add')"
            placement="bottom"
          >
            <BaseButton
              variant="action"
              :icon="Plus"
              icon-classes="size-6"
              @click="openCreateModal"
            />
          </BaseTooltip>
        </template>
      </PageHeader>

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

      <div v-else class="flex flex-col max-md:-mx-6">
        <BaseList
          v-for="(sub, index) in subjects"
          :key="sub.id"
          class="animate-fade-up cursor-pointer"
          :style="{
            animationDelay: `${index * 0.075}s`,
            animationFillMode: 'both',
          }"
          :separator="index !== subjects.length - 1"
          :chevron="true"
          @click="goToSubject(sub.id)"
        >
          <template #label>
            <div class="flex items-center justify-between gap-2">
              <div class="flex flex-col ml-2">
                <span
                  class="font-medium text-base/relaxed text-on-ghost truncate"
                  >{{ sub.name }}</span
                >
                <span
                  v-if="i18n.te(`common.subjects.${sub.name}`)"
                  class="font-normal text-sm text-on-ghost-muted"
                  >{{ t(`common.subjects.${sub.name}`) }}</span
                >
              </div>
            </div>
          </template>
        </BaseList>
      </div>

      <BaseModal
        :open="showCreateModal"
        :submit="handleCreate"
        :loading="saving"
        @cancel="closeCreateModal"
      >
        <template #title>
          {{ t('groups.settings.subjects.create_title') }}
        </template>

        <template #content>
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <BaseLabel for="new-subject-name-input">{{
                t('groups.settings.general.appearance.name_label')
              }}</BaseLabel>
              <BaseInput
                id="new-subject-name-input"
                ref="newSubjectInputRef"
                v-model="newSubjectName"
                :placeholder="t('groups.settings.subjects.add_placeholder')"
                :disabled="saving"
              />
            </div>
            <div class="flex flex-col gap-2">
              <BaseLabel for="new-subject-category">{{
                t('groups.settings.subjects.category_label')
              }}</BaseLabel>
              <BaseSelect
                id="new-subject-category"
                v-model="newSubjectCategory"
                :disabled="saving"
                :options="categoryOptions"
              />
            </div>
          </div>
        </template>

        <template #action-text>
          {{ t('common.buttons.add') }}
        </template>
      </BaseModal>
    </div>

    <!-- Detail View -->
    <div
      v-else-if="loading && subjects.length === 0"
      class="flex justify-center p-8"
    >
      <BaseSpinner />
    </div>
    <div
      v-else-if="!subject"
      class="text-center p-8 text-on-ghost-muted text-base"
    >
      {{ t('groups.settings.subjects.errors.load_failed') }}
    </div>
    <div v-else class="flex flex-col gap-8">
      <div>
        <PageHeader>{{
          t('groups.settings.general.appearance.title')
        }}</PageHeader>
        <div class="flex-1 w-full flex flex-col gap-4 max-w-[400px]">
          <div class="flex flex-col gap-2">
            <BaseLabel for="subject-name">{{
              t('groups.settings.general.appearance.name_label')
            }}</BaseLabel>
            <BaseInput
              id="subject-name"
              v-model="subjectNameInput"
              class="w-full"
              :disabled="saving || !canEditSubjects"
              @keyup.enter="handleSave"
            />
          </div>

          <div class="flex flex-col gap-2">
            <BaseLabel for="subject-category">{{
              t('groups.settings.subjects.category_label')
            }}</BaseLabel>
            <BaseSelect
              id="subject-category"
              v-model="subjectCategoryInput"
              class="w-full"
              :disabled="saving || !canEditSubjects"
              :options="categoryOptions"
            />
          </div>

          <BaseRow
            v-if="canEditSubjects"
            justify="end"
            class="w-full mt-2 gap-2"
          >
            <BaseButton
              variant="ghost"
              :disabled="saving"
              @click="resetSubjectName"
            >
              {{ t('common.buttons.cancel') }}
            </BaseButton>
            <BaseButton
              :disabled="
                saving ||
                !subjectNameInput.trim() ||
                (subjectNameInput.trim() === subject.name &&
                  subjectCategoryInput === (subject.category || 'core'))
              "
              variant="action"
              @click="handleSave"
            >
              {{
                saving ? t('common.buttons.saving') : t('common.buttons.save')
              }}
            </BaseButton>
          </BaseRow>
        </div>
      </div>

      <div v-if="canEditSubjects">
        <h3 class="text-danger mt-6 mb-2">
          {{ t('groups.settings.general.delete_group.danger_zone_title') }}
        </h3>
        <p class="text-base/relaxed text-on-ghost-muted m-0 mb-5">
          {{ t('groups.settings.subjects.delete_modal.message') }}
        </p>
        <BaseButton type="button" variant="danger" @click="handleDelete">
          {{ t('common.buttons.delete') }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>
