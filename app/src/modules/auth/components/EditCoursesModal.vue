<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import hw from '@/api/api';
import { useI18n } from 'vue-i18n';
import { useSubjectStore } from '@/stores/subjectStore';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { getSubjectKey } from '@/types/subjects';
import { apiErrorMessage } from '@/api/errors';

const i18n = useI18n();
const t = (key: string, named?: Record<string, any>) =>
  i18n.t(key, named || {});
const te = (key: string) => i18n.te(key);
const subjectStore = useSubjectStore();
const userStore = useUserStore();
const { activeGroupId } = useAppAuth();

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

function initSelections() {
  for (const key of Object.keys(selections)) {
    delete selections[key];
  }

  const allowedSubjects = [
    ...subjectStore.electiveSubjects,
    ...subjectStore.extraSubjects,
  ];

  for (const subject of subjectStore.electiveSubjects) {
    selections[subject.id] = '';
  }
  for (const subject of subjectStore.extraSubjects) {
    selections[subject.id] = 'NONE';
  }

  // Opened from the account menu the prop can lag behind the store, so the
  // user's own enrollment acts as the fallback.
  const enrolled = props.initialData?.courses?.length
    ? props.initialData.courses
    : (userStore.user?.courses ?? []);

  for (const c of enrolled) {
    const subject = allowedSubjects.find((s) => s.id === c.subjectId);
    if (subject?.courses?.some((course) => course.id === c.courseId)) {
      selections[c.subjectId] = c.courseId;
    }
  }
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
  () => [subjectStore.electiveSubjects, subjectStore.extraSubjects],
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
    const config = activeGroupId.value
      ? { headers: { 'x-tenant-id': activeGroupId.value } }
      : {};

    const { data } = await hw.patch('/user/setup', dataToSend, config);

    const updatedUser = {
      ...(data?.user || userStore.user || {}),
      doneSetup: true,
      courses: dataToSend.courses,
    };
    userStore.updateUser(updatedUser);

    emit('update:user', updatedUser);
    emit('success');
    emit('cancel');
  } catch (e: unknown) {
    console.error('Setup failed:', e);
    error.value = apiErrorMessage(e, 'Speichern fehlgeschlagen.');
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

  const allowedSubjects = [
    ...subjectStore.electiveSubjects,
    ...subjectStore.extraSubjects,
  ];

  const validCourses: { subjectId: string; courseId: string }[] = [];

  for (const subject of allowedSubjects) {
    const courseId = selections[subject.id];
    if (
      courseId &&
      courseId !== 'NONE' &&
      subject.courses?.some((c) => c.id === courseId)
    ) {
      validCourses.push({ subjectId: subject.id, courseId });
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
