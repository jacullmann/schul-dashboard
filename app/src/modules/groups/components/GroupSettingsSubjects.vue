<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { Plus, Pencil, Trash2 } from '@lucide/vue';
import { useSubjectAdmin } from '@/modules/groups/composables/useSubjectAdmin';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import {
  categoryBelongsTo,
  courseSelectionFor,
  courseTypeIsSelectable,
  DEFAULT_COURSE_TYPE,
  defaultSubjectCategory,
  normalizeSubjectCategory,
  resolveCourseType,
  SELECTABLE_COURSE_TYPES,
  subjectCategoriesFor,
  usesCourseTypes,
  ZUSATZKURS_CATEGORY,
  DALTON_SUBJECT_KEY,
  type CourseType,
} from '@/types/subjects';
import type { AdminCourse } from '@/modules/groups/types';
import SettingToggleCard from './SettingToggleCard.vue';

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

const { checkPermission, activeGroupType, activeGroupDaltonEnabled } =
  useAppAuth();
const canEditSubjects = computed(() =>
  checkPermission('edit_subjects_courses'),
);

const newSubjectName = ref('');
const selectedSubjectKey = ref('');
const newSubjectCategory = ref(defaultSubjectCategory(activeGroupType.value));
const newSubjectIsDalton = ref(false);
const showCreateModal = ref(false);
const newSubjectInputRef = ref<any>(null);

const subjectOptions = computed(() => {
  const subjectsObj = i18n.tm('common.subjects');
  // Dalton is a pseudo-subject that only exists in the schedule.
  const list = Object.entries(subjectsObj || {})
    .filter(([key]) => key !== DALTON_SUBJECT_KEY)
    .map(([key, label]) => ({
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
const subjectCategoryInput = ref(defaultSubjectCategory(activeGroupType.value));
const subjectIsDaltonInput = ref(false);

function categoryLabel(category: string): string {
  const key = `groups.settings.subjects.categories.${category}`;
  return i18n.te(key) ? t(key) : category.toUpperCase();
}

const categoryOptions = computed(() =>
  subjectCategoriesFor(activeGroupType.value).map((category) => ({
    value: category,
    label: categoryLabel(category),
  })),
);

// A group that switched its type keeps subjects categorised for the old type
// until they are saved again; the form offers the closest current category.
const storedCategory = computed(() => subject.value?.category ?? '');
const categoryNeedsMigration = computed(
  () =>
    !!storedCategory.value &&
    !categoryBelongsTo(storedCategory.value, activeGroupType.value),
);

function subjectHasCourses(category: string | undefined): boolean {
  return courseSelectionFor(category) !== 'none';
}

function courseTypeLabel(courseType: string): string {
  const key = `groups.settings.subjects.course_types.${courseType}`;
  return i18n.te(key) ? t(key) : courseType.toUpperCase();
}

function courseTypeShortLabel(courseType: string): string {
  const key = `groups.settings.subjects.course_types_short.${courseType}`;
  return i18n.te(key) ? t(key) : courseType.toUpperCase();
}

const courseTypeOptions = computed(() =>
  SELECTABLE_COURSE_TYPES.map((courseType) => ({
    value: courseType,
    label: courseTypeLabel(courseType),
  })),
);

// A Zusatzkurs subject types its courses itself, and a regular group has no
// course types at all — only then does the form offer the choice.
const showCourseTypeField = computed(() =>
  courseTypeIsSelectable(subjectCategoryInput.value, activeGroupType.value),
);

const coursesAreForcedZk = computed(
  () =>
    usesCourseTypes(activeGroupType.value) &&
    subjectCategoryInput.value === ZUSATZKURS_CATEGORY,
);

/** The type a course of the subject currently being edited would get. */
function effectiveCourseType(requested: unknown): CourseType | null {
  return resolveCourseType(
    subjectCategoryInput.value,
    activeGroupType.value,
    requested,
  );
}

function toCategory(value: string) {
  return normalizeSubjectCategory(value, activeGroupType.value);
}

// Keep both forms on categories the group currently offers, even when the type
// is switched in another tab while this one stays mounted.
watch(activeGroupType, (groupType) => {
  newSubjectCategory.value = normalizeSubjectCategory(
    newSubjectCategory.value,
    groupType,
  );
  subjectCategoryInput.value = normalizeSubjectCategory(
    subject.value?.category ?? subjectCategoryInput.value,
    groupType,
  );
});

// Sync subject name and category inputs when subject loads or changes
watch(
  subject,
  (newSub) => {
    if (newSub) {
      subjectNameInput.value = newSub.name;
      subjectCategoryInput.value = normalizeSubjectCategory(
        newSub.category,
        activeGroupType.value,
      );
      subjectIsDaltonInput.value = newSub.isDalton === true;
    }
  },
  { immediate: true },
);

function resetSubjectName() {
  if (subject.value) {
    subjectNameInput.value = subject.value.name;
    subjectCategoryInput.value = normalizeSubjectCategory(
      subject.value.category,
      activeGroupType.value,
    );
    subjectIsDaltonInput.value = subject.value.isDalton === true;
  }
}

const subjectChanged = computed(
  () =>
    !!subject.value &&
    (subjectNameInput.value.trim() !== subject.value.name ||
      subjectCategoryInput.value !== storedCategory.value ||
      subjectIsDaltonInput.value !== (subject.value.isDalton === true)),
);

async function handleSave() {
  if (!subject.value) return;
  const nameTrimmed = subjectNameInput.value.trim();
  if (!nameTrimmed) return;
  await updateSubject(subject.value.id, {
    name: nameTrimmed,
    category: subjectCategoryInput.value,
    isDalton: subjectIsDaltonInput.value,
  });
}

async function handleDelete() {
  if (!subject.value) return;
  const ok = await deleteSubject(subject.value.id);
  if (ok) {
    void router.push({
      name: 'group-admin',
      params: { groupId: groupId.value, tab: 'subjects' },
    });
  }
}

function goToSubject(id: string) {
  void router.push({
    name: 'group-admin',
    params: { groupId: groupId.value, tab: 'subjects', subTab: id },
  });
}

function openCreateModal() {
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
  newSubjectName.value = '';
  selectedSubjectKey.value = '';
  newSubjectCategory.value = defaultSubjectCategory(activeGroupType.value);
  newSubjectIsDalton.value = false;
}

async function handleCreate() {
  if (!newSubjectName.value.trim()) return;
  const oldLength = subjects.value.length;
  await createSubject(
    newSubjectName.value,
    newSubjectCategory.value,
    activeGroupDaltonEnabled.value && newSubjectIsDalton.value,
  );
  if (subjects.value.length > oldLength) {
    newSubjectName.value = '';
    selectedSubjectKey.value = '';
    newSubjectCategory.value = defaultSubjectCategory(activeGroupType.value);
    newSubjectIsDalton.value = false;
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
const newCourseType = ref<CourseType>(DEFAULT_COURSE_TYPE);

const showEditCourseModal = ref(false);
const editingCourse = ref<AdminCourse | null>(null);
const editCourseName = ref('');
const editCourseType = ref<CourseType>(DEFAULT_COURSE_TYPE);

function openCreateCourseModal() {
  newCourseName.value = '';
  newCourseType.value = DEFAULT_COURSE_TYPE;
  showCreateCourseModal.value = true;
}

async function handleCreateCourse() {
  if (!subject.value || !newCourseName.value.trim()) return;
  const ok = await createCourse(
    subject.value.id,
    newCourseName.value,
    effectiveCourseType(newCourseType.value),
  );
  if (ok) {
    showCreateCourseModal.value = false;
    newCourseName.value = '';
    newCourseType.value = DEFAULT_COURSE_TYPE;
  }
}

function openEditCourseModal(course: AdminCourse) {
  editingCourse.value = course;
  editCourseName.value = course.name;
  editCourseType.value =
    course.courseType && course.courseType !== 'zk'
      ? course.courseType
      : DEFAULT_COURSE_TYPE;
  showEditCourseModal.value = true;
}

const editCourseChanged = computed(
  () =>
    editCourseName.value.trim() !== (editingCourse.value?.name || '') ||
    effectiveCourseType(editCourseType.value) !==
      (editingCourse.value?.courseType ?? null),
);

async function handleEditCourse() {
  if (!subject.value || !editingCourse.value || !editCourseName.value.trim())
    return;
  const ok = await updateCourse(
    subject.value.id,
    editingCourse.value.id,
    editCourseName.value,
    effectiveCourseType(editCourseType.value),
  );
  if (ok) {
    showEditCourseModal.value = false;
    editingCourse.value = null;
    editCourseName.value = '';
    editCourseType.value = DEFAULT_COURSE_TYPE;
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
              categoryLabel(sub.category || '') +
              (subjectHasCourses(sub.category)
                ? `, ${
                    (sub.coursesCount || 0) === 0
                      ? t('groups.settings.subjects.courses_count_zero')
                      : (sub.coursesCount || 0) === 1
                        ? t('groups.settings.subjects.courses_count_singular')
                        : t('groups.settings.subjects.courses_count_plural', {
                            count: sub.coursesCount,
                          })
                  }`
                : '') +
              (activeGroupDaltonEnabled && sub.isDalton
                ? `, ${t('groups.settings.subjects.dalton_badge')}`
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
            <BaseLabel for="new-subject-name" :required="true">{{
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
            <BaseLabel for="new-subject-custom" :required="true">{{
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
            <BaseLabel for="new-subject-category" :required="true">{{
              t('groups.settings.subjects.category_label')
            }}</BaseLabel>
            <BaseSelect
              id="new-subject-category"
              :model-value="newSubjectCategory"
              :disabled="saving"
              :options="categoryOptions"
              @update:model-value="
                (value) => (newSubjectCategory = toCategory(value))
              "
            />
          </BaseFormGroup>
          <SettingToggleCard
            v-if="activeGroupDaltonEnabled"
            v-model="newSubjectIsDalton"
            :title="t('groups.settings.subjects.dalton_label')"
            :description="t('groups.settings.subjects.dalton_description')"
            :disabled="saving"
          />
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
              :model-value="subjectCategoryInput"
              class="w-full"
              :disabled="saving || !canEditSubjects"
              :options="categoryOptions"
              @update:model-value="
                (value) => (subjectCategoryInput = toCategory(value))
              "
            />
            <span
              v-if="categoryNeedsMigration"
              class="text-xs text-warning mt-1"
            >
              {{
                t('groups.settings.subjects.category_mismatch', {
                  category: categoryLabel(storedCategory),
                })
              }}
            </span>
          </BaseFormGroup>

          <SettingToggleCard
            v-if="activeGroupDaltonEnabled"
            v-model="subjectIsDaltonInput"
            :title="t('groups.settings.subjects.dalton_label')"
            :description="t('groups.settings.subjects.dalton_description')"
            :disabled="saving || !canEditSubjects"
          />

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
              :disabled="saving || !subjectNameInput.trim() || !subjectChanged"
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
      <div v-if="subjectHasCourses(subject.category)">
        <div class="flex items-center justify-between mb-4 gap-4">
          <div class="flex flex-col">
            <h3 class="text-lg font-semibold text-on-ghost m-0">
              {{ t('groups.settings.subjects.courses_title') }}
            </h3>
            <span v-if="coursesAreForcedZk" class="text-sm text-on-ghost-muted">
              {{ t('groups.settings.subjects.course_type_forced_zk') }}
            </span>
          </div>
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
          class="text-center p-6 bg-surface border border-ghost-border rounded-xl text-on-ghost-muted text-base"
        >
          {{ t('groups.settings.subjects.list.empty') }}
        </div>
        <div v-else class="flex flex-col gap-2 max-w-200 mx-auto">
          <div
            v-for="course in subject.courses"
            :key="course.id"
            class="flex items-center justify-between p-3 rounded-xl bg-surface border border-ghost-border animate-fade-up"
          >
            <span class="font-medium text-base text-on-ghost truncate">
              {{ course.name }}
              <span
                v-if="course.courseType"
                class="font-normal text-sm text-on-ghost-muted"
                >({{ courseTypeShortLabel(course.courseType) }})</span
              >
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
            <BaseLabel for="new-course-name" :required="true">{{
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
          <BaseFormGroup
            v-if="showCourseTypeField"
            id="new-course-type"
            class="flex flex-col gap-2"
          >
            <BaseLabel for="new-course-type" :required="true">{{
              t('groups.settings.subjects.course_type_label')
            }}</BaseLabel>
            <BaseSelect
              id="new-course-type"
              v-model="newCourseType"
              :disabled="saving"
              :options="courseTypeOptions"
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
        :requirement="!!editCourseName.trim() && editCourseChanged"
        @cancel="showEditCourseModal = false"
      >
        <template #title>
          {{ t('groups.settings.subjects.course_edit_title') }}
        </template>

        <template #content>
          <BaseFormGroup id="edit-course-name" class="flex flex-col gap-2">
            <BaseLabel for="edit-course-name" :required="true">{{
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
          <BaseFormGroup
            v-if="showCourseTypeField"
            id="edit-course-type"
            class="flex flex-col gap-2"
          >
            <BaseLabel for="edit-course-type" :required="true">{{
              t('groups.settings.subjects.course_type_label')
            }}</BaseLabel>
            <BaseSelect
              id="edit-course-type"
              v-model="editCourseType"
              :disabled="saving"
              :options="courseTypeOptions"
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
