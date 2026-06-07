<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import hw from '../../../api/api';
import { useI18n } from 'vue-i18n';
import { useSubjectStore } from '@/stores/subjectStore';
import { getSubjectKey } from '@/types/subjects';

const i18n = useI18n();
const t = (key: string, named?: Record<string, any>) =>
  i18n.t(key, named || {});
const te = (key: string) => i18n.te(key);
const subjectStore = useSubjectStore();

const getCourseLabel = (courseName: string): string => {
  const courseKey = getSubjectKey(courseName);
  if (te(`common.subjects.${courseKey}`)) {
    return t(`common.subjects.${courseKey}`);
  }

  return courseName;
};

const props = defineProps<{
  open: boolean;
  initialData: { courses: { subjectId: string; courseId: string }[] };
  isSetup: boolean;
}>();

const emit = defineEmits(['cancel', 'success', 'update:user']);

const submitting = ref(false);
const skipping = ref(false);
const error = ref('');

const selections = reactive<Record<string, string>>({});

watch(
  () => props.initialData,
  (newVal) => {
    for (const subject of subjectStore.electiveSubjects) {
      selections[subject.id] = '';
    }
    for (const subject of subjectStore.extraSubjects) {
      selections[subject.id] = 'NONE';
    }
    if (newVal?.courses) {
      newVal.courses.forEach((c) => {
        selections[c.subjectId] = c.courseId;
      });
    }
  },
  { immediate: true },
);

onMounted(() => {
  void subjectStore.loadSubjects().then(() => {
    for (const subject of subjectStore.electiveSubjects) {
      if (!selections[subject.id]) selections[subject.id] = '';
    }
    for (const subject of subjectStore.extraSubjects) {
      if (!selections[subject.id]) selections[subject.id] = 'NONE';
    }
    if (props.initialData?.courses) {
      props.initialData.courses.forEach((c) => {
        selections[c.subjectId] = c.courseId;
      });
    }
  });
});

const getOptionsForSubject = (subjectId: string, isExtra: boolean) => {
  const subject = subjectStore.subjects.find((s) => s.id === subjectId);
  const opts = (subject?.courses || []).map((c) => ({
    label: getCourseLabel(c.name),
    value: c.id,
  }));
  if (isExtra) {
    opts.unshift({ label: t('common.selection.no'), value: 'NONE' });
  }
  return opts;
};

const isValid = computed(() => {
  for (const subject of subjectStore.electiveSubjects) {
    if (!selections[subject.id]) return false;
  }
  return true;
});

async function submitData(dataToSend: {
  courses: { subjectId: string; courseId: string }[];
}) {
  error.value = '';
  try {
    const { data } = await hw.patch('/user/setup', dataToSend);

    emit('update:user', data.user);
    emit('success');
    emit('cancel');
  } catch (e: unknown) {
    console.error('Setup failed:', e);
    const err = e as { response?: { data?: { error?: string } } };
    error.value = err.response?.data?.error || 'Speichern fehlgeschlagen.';
  } finally {
    submitting.value = false;
    skipping.value = false;
  }
}
async function save() {
  if (props.isSetup && !isValid.value) {
    error.value = t('auth.setup.errors.required_courses');
    return;
  }
  submitting.value = true;

  const validCourses: { subjectId: string; courseId: string }[] = [];

  for (const subjectId of Object.keys(selections)) {
    const courseId = selections[subjectId];
    if (courseId && courseId !== 'NONE') {
      validCourses.push({ subjectId, courseId });
    }
  }

  await submitData({ courses: validCourses });
}

async function skip() {
  skipping.value = true;
  await submitData({ courses: [] });
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
          v-for="subject in subjectStore.electiveSubjects"
          :id="subject.id"
          :key="subject.id"
        >
          <BaseLabel :for="subject.id">{{
            getCourseLabel(subject.name)
          }}</BaseLabel>
          <BaseSelect
            :id="subject.id"
            :model-value="selections[subject.id] ?? ''"
            :options="getOptionsForSubject(subject.id, false)"
            @update:model-value="(v) => (selections[subject.id] = v)"
          />
        </BaseFormGroup>

        <BaseFormGroup
          v-for="subject in subjectStore.extraSubjects"
          :id="subject.id"
          :key="subject.id"
        >
          <BaseLabel :for="subject.id">{{
            getCourseLabel(subject.name)
          }}</BaseLabel>
          <BaseSelect
            :id="subject.id"
            :model-value="selections[subject.id] ?? ''"
            :options="getOptionsForSubject(subject.id, true)"
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
