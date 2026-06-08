<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { Plus, Pencil, Trash2 } from '@lucide/vue';
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
  createCourse,
  updateCourse,
  deleteCourse,
} = useSubjectAdmin();

const { checkPermission } = useAppAuth();
const canEditSubjects = computed(() =>
  checkPermission('edit_subjects_courses'),
);

const newSubjectName = ref('');
const selectedSubjectKey = ref('');
const newSubjectCategory = ref('core');
const showCreateModal = ref(false);
const newSubjectInputRef = ref<any>(null);

const subjectOptions = computed(() => {
  const subjectsObj = i18n.tm('common.subjects');
  const list = Object.entries(subjectsObj || {}).map(([key, label]) => ({
    value: key,
    label,
  }));
  list.push({
    value: 'custom',
    label: t('common.selection.other'),
  });
  return list;
});

watch(selectedSubjectKey, async (newVal) => {
  if (newVal === 'custom') {
    newSubjectName.value = '';
    await nextTick();
    newSubjectInputRef.value?.focus();
  } else if (newVal) {
    newSubjectName.value = newVal;
  } else {
    newSubjectName.value = '';
  }
});

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
  selectedSubjectKey.value = '';
  newSubjectCategory.value = 'core';
}

async function handleCreate() {
  if (!newSubjectName.value.trim()) return;
  const oldLength = subjects.value.length;
  await createSubject(newSubjectName.value, newSubjectCategory.value);
  if (subjects.value.length > oldLength) {
    newSubjectName.value = '';
    selectedSubjectKey.value = '';
    newSubjectCategory.value = 'core';
    showCreateModal.value = false;
  }
}

watch(showCreateModal, async (open) => {
  if (open) {
    await nextTick();
    if (selectedSubjectKey.value === 'custom') {
      newSubjectInputRef.value?.focus();
    }
  }
});

const showCreateCourseModal = ref(false);
const newCourseName = ref('');

const showEditCourseModal = ref(false);
const editingCourse = ref<{ id: string; name: string } | null>(null);
const editCourseName = ref('');

function openCreateCourseModal() {
  newCourseName.value = '';
  showCreateCourseModal.value = true;
}

async function handleCreateCourse() {
  if (!subject.value || !newCourseName.value.trim()) return;
  const ok = await createCourse(subject.value.id, newCourseName.value);
  if (ok) {
    showCreateCourseModal.value = false;
    newCourseName.value = '';
  }
}

function openEditCourseModal(course: { id: string; name: string }) {
  editingCourse.value = course;
  editCourseName.value = course.name;
  showEditCourseModal.value = true;
}

async function handleEditCourse() {
  if (!subject.value || !editingCourse.value || !editCourseName.value.trim())
    return;
  const ok = await updateCourse(
    subject.value.id,
    editingCourse.value.id,
    editCourseName.value,
  );
  if (ok) {
    showEditCourseModal.value = false;
    editingCourse.value = null;
    editCourseName.value = '';
  }
}

async function handleDeleteCourse(courseId: string) {
  if (!subject.value) return;
  await deleteCourse(subject.value.id, courseId);
}

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

      <div v-else class="flex flex-col max-w-200 mx-auto max-md:-mx-6">
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
            <span
              class="font-medium text-base/relaxed text-on-ghost truncate"
              >{{
                i18n.te(`common.subjects.${sub.name}`)
                  ? t(`common.subjects.${sub.name}`)
                  : sub.name
              }}</span
            >
            <span class="font-normal text-sm text-on-ghost-muted">{{
              t(`groups.settings.subjects.categories.${sub.category}`) +
              (sub.category === 'elective' || sub.category === 'extra'
                ? `, ${
                    (sub.coursesCount || 0) === 0
                      ? t('groups.settings.subjects.courses_count_zero')
                      : (sub.coursesCount || 0) === 1
                        ? t('groups.settings.subjects.courses_count_singular')
                        : t('groups.settings.subjects.courses_count_plural', {
                            count: sub.coursesCount,
                          })
                  }`
                : '')
            }}</span>
          </template>
        </BaseList>
      </div>

      <BaseModal
        :open="showCreateModal"
        :submit="handleCreate"
        :loading="saving"
        :requirement="!!newSubjectName.trim()"
        @cancel="closeCreateModal"
      >
        <template #title>
          {{ t('groups.settings.subjects.create_title') }}
        </template>

        <template #content>
          <BaseFormGroup id="new-subject-name">
            <BaseLabel for="new-subject-name">{{
              t('groups.settings.subjects.name_label')
            }}</BaseLabel>
            <BaseSelect
              id="new-subject-name"
              v-model="selectedSubjectKey"
              :disabled="saving"
              :options="subjectOptions"
            />
          </BaseFormGroup>
          <BaseFormGroup
            v-if="selectedSubjectKey === 'custom'"
            id="new-subject-custom"
          >
            <BaseLabel for="new-subject-custom">{{
              t('groups.settings.subjects.custom_label')
            }}</BaseLabel>
            <BaseInput
              id="new-subject-custom"
              ref="newSubjectInputRef"
              v-model="newSubjectName"
              :placeholder="t('groups.settings.subjects.add_placeholder')"
              :disabled="saving"
            />
          </BaseFormGroup>
          <BaseFormGroup id="new-subject-category">
            <BaseLabel for="new-subject-category">{{
              t('groups.settings.subjects.category_label')
            }}</BaseLabel>
            <BaseSelect
              id="new-subject-category"
              v-model="newSubjectCategory"
              :disabled="saving"
              :options="categoryOptions"
            />
          </BaseFormGroup>
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
        <BaseFormContent class="max-w-120">
          <BaseFormGroup id="subject-name">
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
          </BaseFormGroup>

          <BaseFormGroup id="subject-category">
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
          </BaseFormGroup>

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
        </BaseFormContent>
      </div>

      <!-- Courses list section for elective/extra subjects -->
      <div
        v-if="subject.category === 'elective' || subject.category === 'extra'"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-on-ghost m-0">
            {{ t('groups.settings.subjects.courses_title') }}
          </h3>
          <BaseTooltip
            :content="t('groups.settings.subjects.course_add_title')"
            placement="bottom"
          >
            <BaseButton
              v-if="canEditSubjects"
              variant="action"
              :icon="Plus"
              icon-classes="size-6"
              @click="openCreateCourseModal"
            />
          </BaseTooltip>
        </div>

        <div
          v-if="!subject.courses || subject.courses.length === 0"
          class="text-center p-6 bg-surface border border-surface-border rounded-xl text-on-ghost-muted text-base"
        >
          {{ t('groups.settings.subjects.list.empty') }}
        </div>
        <div v-else class="flex flex-col gap-2 max-w-200 mx-auto">
          <div
            v-for="course in subject.courses"
            :key="course.id"
            class="flex items-center justify-between p-3 rounded-xl bg-surface border border-surface-border animate-fade-up"
          >
            <span class="font-medium text-base text-on-ghost truncate">
              {{ course.name }}
            </span>
            <div v-if="canEditSubjects" class="flex gap-1">
              <BaseButton
                variant="ghost"
                size="sm"
                :icon="Pencil"
                @click="openEditCourseModal(course)"
              />
              <BaseButton
                variant="ghost"
                size="sm"
                :icon="Trash2"
                class="text-danger hover:text-danger"
                @click="handleDeleteCourse(course.id)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Create Course Modal -->
      <BaseModal
        :open="showCreateCourseModal"
        :submit="handleCreateCourse"
        :loading="saving"
        :requirement="!!newCourseName.trim()"
        @cancel="showCreateCourseModal = false"
      >
        <template #title>
          {{ t('groups.settings.subjects.course_add_title') }}
        </template>

        <template #content>
          <BaseFormGroup id="new-course-name" class="flex flex-col gap-2">
            <BaseLabel for="new-course-name">{{
              t('groups.settings.subjects.course_name_label')
            }}</BaseLabel>
            <BaseInput
              id="new-course-name"
              v-model="newCourseName"
              :placeholder="t('groups.settings.subjects.course_name_label')"
              :disabled="saving"
              @keyup.enter="handleCreateCourse"
            />
          </BaseFormGroup>
        </template>

        <template #action-text>
          {{ t('common.buttons.add') }}
        </template>
      </BaseModal>

      <!-- Edit Course Modal -->
      <BaseModal
        :open="showEditCourseModal"
        :submit="handleEditCourse"
        :loading="saving"
        :requirement="
          !!editCourseName.trim() &&
          editCourseName.trim() !== (editingCourse?.name || '')
        "
        @cancel="showEditCourseModal = false"
      >
        <template #title>
          {{ t('groups.settings.subjects.course_edit_title') }}
        </template>

        <template #content>
          <BaseFormGroup id="edit-course-name" class="flex flex-col gap-2">
            <BaseLabel for="edit-course-name">{{
              t('groups.settings.subjects.course_name_label')
            }}</BaseLabel>
            <BaseInput
              id="edit-course-name"
              v-model="editCourseName"
              :placeholder="t('groups.settings.subjects.course_name_label')"
              :disabled="saving"
              @keyup.enter="handleEditCourse"
            />
          </BaseFormGroup>
        </template>

        <template #action-text>
          {{ t('common.buttons.save') }}
        </template>
      </BaseModal>

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
