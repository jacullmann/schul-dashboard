<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { RotateCcw } from '@lucide/vue';
import { useSubjectStore } from '@/stores/subjectStore';
import { useUserStore } from '@/stores/userStore';
import { useConfirmModal } from '@/stores/modalStore';
import { useCourseSelection } from '@/common/composables/useCourseSelection';
import { useGroupPageId } from '@/core/composables/useGroupPageId';
import { useToast } from '@/common/composables/useToast';
import { apiErrorMessage } from '@/api/errors';

const { t } = useI18n();
const router = useRouter();
const groupId = useGroupPageId();
const toast = useToast();
const subjectStore = useSubjectStore();
const userStore = useUserStore();
const confirmModal = useConfirmModal();
const {
  selections,
  resetSelections,
  translatedName,
  optionsForSubject,
  selectedCourses,
  saveCourses,
  resetCourses,
} = useCourseSelection(groupId);

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

// Saved courses can change outside this form, so they replace what is shown.
watch(
  () => [
    subjectStore.requiredCourseSubjects,
    subjectStore.optionalCourseSubjects,
    userStore.user?.courses,
  ],
  discardChanges,
  { immediate: true },
);

void subjectStore.loadSubjects(groupId);

const redoing = ref(false);

async function redoSetup() {
  const confirmed = await confirmModal.ask({
    title: t('auth.courses.redo_setup.title'),
    content: t('auth.courses.redo_setup.message'),
    submitText: t('auth.courses.redo_setup.submit'),
    danger: true,
  });
  if (!confirmed) return;

  redoing.value = true;
  error.value = '';
  try {
    await resetCourses();
    await router.push({
      name: 'group-course-setup',
      params: { groupId },
      query: { returnTo: 'settings' },
    });
  } catch (e: unknown) {
    error.value = apiErrorMessage(e, t('auth.courses.errors.save_failed'));
  } finally {
    redoing.value = false;
  }
}

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
  <div>
    <div
      class="flex flex-col items-start gap-3 mb-4 md:flex-row md:items-center md:justify-between max-w-120"
    >
      <p class="text-base/relaxed text-on-ghost-muted m-0">
        {{ t('auth.courses.description') }}
      </p>
      <BaseButton
        v-if="hasCourseSubjects"
        class="shrink-0"
        :icon="RotateCcw"
        :loading="redoing"
        :disabled="redoing || saving"
        @click="redoSetup"
      >
        {{ t('auth.courses.redo_setup.button') }}
      </BaseButton>
    </div>

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

      <BaseRow justify="end" stack-on-mobile class="w-full mt-2 gap-2">
        <BaseButton
          form
          variant="ghost"
          :disabled="!isDirty || saving"
          @click="discardChanges"
        >
          {{ t('common.buttons.cancel') }}
        </BaseButton>
        <BaseButton
          form
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
