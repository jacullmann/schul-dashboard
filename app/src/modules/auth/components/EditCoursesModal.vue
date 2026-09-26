<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSubjectStore } from '@/stores/subjectStore';
import { useUserStore } from '@/stores/userStore';
import {
  useCourseSelection,
  type Enrollment,
} from '@/common/composables/useCourseSelection';
import { apiErrorMessage } from '@/api/errors';

const { t } = useI18n();
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
} = useCourseSelection();

const props = defineProps<{
  open: boolean;
  initialData: { courses: Enrollment[] };
  isSetup: boolean;
}>();

const emit = defineEmits(['cancel', 'success', 'update:user']);

const submitting = ref(false);
const skipping = ref(false);
const error = ref('');

function initSelections() {
  // The prop can lag behind the store, so the user's own enrollment acts as
  // the fallback.
  resetSelections(
    props.initialData?.courses?.length
      ? props.initialData.courses
      : (userStore.user?.courses ?? []),
  );
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      error.value = '';
      void subjectStore.loadSubjects().then(() => {
        initSelections();
      });
      initSelections();
    }
  },
  { immediate: true },
);

watch(
  () => props.initialData,
  () => {
    if (props.open) {
      initSelections();
    }
  },
  { deep: true },
);

watch(
  () => [
    subjectStore.requiredCourseSubjects,
    subjectStore.optionalCourseSubjects,
  ],
  () => {
    if (props.open) {
      initSelections();
    }
  },
);

onMounted(() => {
  if (props.open) {
    void subjectStore.loadSubjects().then(() => {
      initSelections();
    });
  }
});

async function submitData(courses: Enrollment[]) {
  error.value = '';
  try {
    const updatedUser = await saveCourses(courses);

    emit('update:user', updatedUser);
    emit('success');
    emit('cancel');
  } catch (e: unknown) {
    console.error('Setup failed:', e);
    error.value = apiErrorMessage(e, t('auth.courses.errors.save_failed'));
  } finally {
    submitting.value = false;
    skipping.value = false;
  }
}

async function save() {
  if (props.isSetup && !hasRequiredSelections.value) {
    error.value = t('auth.setup.errors.required_courses');
    return;
  }
  submitting.value = true;
  await submitData(selectedCourses.value);
}

async function skip() {
  skipping.value = true;
  await submitData([]);
}
</script>

<template>
  <BaseModal
    :open="open"
    :error="error"
    :submit="save"
    :cancel="isSetup ? skip : () => $emit('cancel')"
    :loading="submitting || skipping"
    @cancel="$emit('cancel')"
  >
    <template #title>{{
      isSetup ? t('auth.courses.title_creation') : t('auth.courses.title')
    }}</template>

    <template #content>
      <p class="text-sm text-on-ghost-muted m-0!">
        {{
          isSetup
            ? t('auth.courses.description_creation')
            : t('auth.courses.description')
        }}
      </p>

      <div v-if="subjectStore.loading" class="flex justify-center mb-6">
        <BaseSpinner />
      </div>
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

    <template #cancel-text>
      {{ isSetup ? t('common.buttons.skip') : t('common.buttons.cancel') }}
    </template>

    <template #action-text>
      {{ t('common.buttons.save') }}
    </template>
  </BaseModal>
</template>
