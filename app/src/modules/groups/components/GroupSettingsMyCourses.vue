<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSubjectStore } from '@/stores/subjectStore';
import { useUserStore } from '@/stores/userStore';
import { useCourseSelection } from '@/common/composables/useCourseSelection';
import { useToast } from '@/common/composables/useToast';
import { apiErrorMessage } from '@/api/errors';

const { t } = useI18n();
const toast = useToast();
const subjectStore = useSubjectStore();
const userStore = useUserStore();
const {
  selections,
  resetSelections,
  translatedName,
  optionsForSubject,
  selectedCourses,
  saveCourses,
} = useCourseSelection();

const saving = ref(false);
const error = ref('');
const savedSelections = ref<Record<string, string>>({});

const hasCourseSubjects = computed(
  () =>
    subjectStore.requiredCourseSubjects.length > 0 ||
    subjectStore.optionalCourseSubjects.length > 0,
);

const isDirty = computed(() =>
  Object.keys(selections).some(
    (subjectId) => selections[subjectId] !== savedSelections.value[subjectId],
  ),
);

function discardChanges() {
  resetSelections(userStore.user?.courses ?? []);
  savedSelections.value = { ...selections };
  error.value = '';
}

watch(
  () => [
    subjectStore.requiredCourseSubjects,
    subjectStore.optionalCourseSubjects,
  ],
  discardChanges,
  { immediate: true },
);

void subjectStore.loadSubjects();

async function save() {
  saving.value = true;
  error.value = '';
  try {
    await saveCourses(selectedCourses.value);
    savedSelections.value = { ...selections };
    toast.success(t('auth.courses.saved'));
  } catch (e: unknown) {
    error.value = apiErrorMessage(e, t('auth.courses.errors.save_failed'));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="animate-fade-up">
    <p class="text-base/relaxed text-on-ghost-muted m-0 mb-4 max-w-160">
      {{ t('auth.courses.description') }}
    </p>

    <div v-if="subjectStore.loading" class="flex justify-center">
      <BaseSpinner />
    </div>

    <p v-else-if="!hasCourseSubjects" class="text-base text-on-ghost-muted m-0">
      {{ t('auth.courses.none_offered') }}
    </p>

    <BaseFormContent v-else class="max-w-120" :error="error">
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

      <BaseRow justify="end" class="w-full mt-2 gap-2">
        <BaseButton
          variant="ghost"
          :disabled="!isDirty || saving"
          @click="discardChanges"
        >
          {{ t('common.buttons.cancel') }}
        </BaseButton>
        <BaseButton
          variant="action"
          :disabled="!isDirty || saving"
          @click="save"
        >
          {{ saving ? t('common.buttons.saving') : t('common.buttons.save') }}
        </BaseButton>
      </BaseRow>
    </BaseFormContent>
  </div>
</template>
