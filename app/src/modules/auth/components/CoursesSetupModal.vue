<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSubjectStore } from '@/stores/subjectStore';
import { useUserStore } from '@/stores/userStore';
import {
  useCourseSelection,
  type Enrollment,
} from '@/common/composables/useCourseSelection';
import { useCourseSetup } from '@/modules/auth/composables/useCourseSetup';
import { apiErrorMessage } from '@/api/errors';
import CourseLevelPicker from './CourseLevelPicker.vue';
import CourseSetupSchedule from './CourseSetupSchedule.vue';

const props = defineProps<{
  open: boolean;
  groupId: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t, locale } = useI18n();
const subjectStore = useSubjectStore();
const userStore = useUserStore();

const {
  selections,
  resetSelections,
  translatedName,
  optionsForSubject,
  hasRequiredSelections,
  selectedCourses,
  saveCourses,
} = useCourseSelection(props.groupId);

const {
  reset: resetCourseSetup,
  levelChoiceSubjects,
  levelOptions,
  levels,
  hasAllLevels,
  needsLessonChoice,
  loadingLessons,
  loadLessons,
  scheduleConfig,
  setupLessons,
  resolution,
  toggleCourse,
  canToggleCourse,
  enrollments,
  openSubjects,
} = useCourseSetup(props.groupId);

type Step = 'levels' | 'lessons';

const step = ref<Step>('levels');
const saving = ref(false);
const error = ref('');

const isAbitur = computed(() => subjectStore.groupType === 'abitur');
const hasLevelChoices = computed(() => levelChoiceSubjects.value.length > 0);
// Without a level to choose, the timetable is all there is to ask.
const isLessonStep = computed(
  () => isAbitur.value && (step.value === 'lessons' || !hasLevelChoices.value),
);

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    error.value = '';
    step.value = 'levels';
    resetSelections(userStore.user?.courses ?? []);
    resetCourseSetup();
    void subjectStore.loadSubjects(props.groupId);
  },
  { immediate: true },
);

watch(
  () => [
    subjectStore.requiredCourseSubjects,
    subjectStore.optionalCourseSubjects,
  ],
  () => resetSelections(userStore.user?.courses ?? []),
  { immediate: true },
);

// Fetched while the member picks levels, so the timetable is there on Continue.
watch(
  () => props.open && isAbitur.value,
  (preload) => {
    if (!preload) return;
    loadLessons().catch((e: unknown) => {
      if (isLessonStep.value) {
        error.value = apiErrorMessage(
          e,
          t('auth.courses.errors.schedule_load_failed'),
        );
      }
    });
  },
  { immediate: true },
);

const description = computed(() => {
  if (!isAbitur.value) return t('auth.courses.description_creation');
  return isLessonStep.value
    ? t('auth.courses.description_lessons')
    : t('auth.courses.description_levels');
});

const submitLabel = computed(() =>
  isAbitur.value && !isLessonStep.value && needsLessonChoice.value
    ? t('common.buttons.continue')
    : t('common.buttons.save'),
);

const openSubjectsHint = computed(() => {
  if (openSubjects.value.length === 0) return t('auth.courses.all_settled');
  const names = openSubjects.value.map((subject) =>
    translatedName(subject.name),
  );
  return t('auth.courses.open_subjects', {
    subjects: new Intl.ListFormat(locale.value).format(names),
  });
});

async function saveAndClose(courses: Enrollment[]) {
  if (saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    await saveCourses(courses);
    emit('close');
  } catch (e: unknown) {
    console.error('Course setup failed:', e);
    error.value = apiErrorMessage(e, t('auth.courses.errors.save_failed'));
  } finally {
    saving.value = false;
  }
}

async function showLessonStep() {
  error.value = '';
  step.value = 'lessons';
  try {
    await loadLessons();
  } catch (e: unknown) {
    error.value = apiErrorMessage(
      e,
      t('auth.courses.errors.schedule_load_failed'),
    );
  }
}

async function submit() {
  if (isLessonStep.value) return saveAndClose(enrollments.value);

  if (isAbitur.value ? !hasAllLevels.value : !hasRequiredSelections.value) {
    error.value = t('auth.setup.errors.required_courses');
    return;
  }

  if (isAbitur.value) {
    return needsLessonChoice.value
      ? showLessonStep()
      : saveAndClose(enrollments.value);
  }
  return saveAndClose(selectedCourses.value);
}

const skip = () => saveAndClose([]);

function goBack() {
  error.value = '';
  step.value = 'levels';
}
</script>

<template>
  <BaseModal
    :open="open"
    :error="error"
    :submit="submit"
    :cancel="skip"
    :loading="saving"
    :wide="isLessonStep"
  >
    <template #title>{{ t('auth.courses.title_creation') }}</template>

    <template #content>
      <p class="text-sm text-on-ghost-muted m-0!">{{ description }}</p>

      <div
        v-if="subjectStore.loading || (isLessonStep && loadingLessons)"
        class="flex justify-center mb-6"
      >
        <BaseSpinner />
      </div>

      <template v-else-if="isLessonStep">
        <CourseSetupSchedule
          :lessons="setupLessons"
          :config="scheduleConfig"
          :states="resolution.states"
          :can-toggle="canToggleCourse"
          @toggle="toggleCourse"
        />
        <p class="text-sm text-on-ghost-muted m-0!" aria-live="polite">
          {{ openSubjectsHint }}
        </p>
      </template>

      <CourseLevelPicker
        v-else-if="isAbitur"
        v-model="levels"
        :subjects="levelChoiceSubjects"
        :options="levelOptions"
      />

      <div v-else class="flex flex-col gap-5">
        <BaseFormGroup
          v-for="subject in subjectStore.requiredCourseSubjects"
          :id="subject.id"
          :key="subject.id"
        >
          <BaseLabel :for="subject.id">{{
            translatedName(subject.name)
          }}</BaseLabel>
          <BaseSelect
            :id="subject.id"
            :model-value="selections[subject.id] ?? ''"
            :options="optionsForSubject(subject, false)"
            @update:model-value="(v) => (selections[subject.id] = v)"
          />
        </BaseFormGroup>

        <BaseFormGroup
          v-for="subject in subjectStore.optionalCourseSubjects"
          :id="subject.id"
          :key="subject.id"
        >
          <BaseLabel :for="subject.id">{{
            translatedName(subject.name)
          }}</BaseLabel>
          <BaseSelect
            :id="subject.id"
            :model-value="selections[subject.id] ?? ''"
            :options="optionsForSubject(subject, true)"
            @update:model-value="(v) => (selections[subject.id] = v)"
          />
        </BaseFormGroup>
      </div>
    </template>

    <template #secondary-action>
      <BaseButton
        v-if="isLessonStep && hasLevelChoices"
        type="button"
        surface
        variant="ghost"
        form
        class="md:mr-auto"
        :disabled="saving"
        @click="goBack"
      >
        {{ t('common.buttons.back') }}
      </BaseButton>
    </template>

    <template #cancel-text>{{ t('common.buttons.skip') }}</template>

    <template #action-text>{{ submitLabel }}</template>
  </BaseModal>
</template>
