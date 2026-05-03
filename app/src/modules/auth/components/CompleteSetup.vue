<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import hw from '@/api/hwApi';
import { useI18n } from 'vue-i18n';
import { useSubjectStore } from '@/stores/subjectStore';
import { getSubjectKey } from '@/types/subjects';

const { t, te } = useI18n();
const subjectStore = useSubjectStore();

const getCourseLabel = (courseName: string): string => {
  const courseKey = getSubjectKey(courseName);
  if (te(`global.subjects.${courseKey}`)) {
    return t(`global.subjects.${courseKey}`);
  }

  const mr = t('global.titles.abbr.mr');
  const ms = t('global.titles.abbr.ms');
  return courseName.replace(/^Herr\s+/, `${mr} `).replace(/^Frau\s+/, `${ms} `);
};

const props = defineProps<{
  open: boolean;
  initialData: { courses: { subjectId: string; courseId: string }[] };
  isSetup: boolean;
}>();

// update:user emittiert die aktualisierten User-Daten zurück zum Parent
const emit = defineEmits(['cancel', 'success', 'update:user']);

const submitting = ref(false);
const skipping = ref(false);
const error = ref('');

const selections = reactive<Record<string, string>>({});

// Watcher, um formData zu aktualisieren, wenn sich initialData ändert (z.B. beim manuellen Öffnen)
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
  subjectStore.loadSubjects().then(() => {
    // re-init selections fully once loaded
    for (const subject of subjectStore.electiveSubjects) {
      if (!selections[subject.id]) selections[subject.id] = '';
    }
    for (const subject of subjectStore.extraSubjects) {
      if (!selections[subject.id]) selections[subject.id] = 'NONE';
    }
    // overlay initial data
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
    opts.unshift({ label: t('global.selection.no'), value: 'NONE' });
  }
  return opts;
};

// Prüfung, ob alle Felder ausgewählt sind (nur für das initiale Setup relevant)
const isValid = computed(() => {
  // Beim Speichern MUSS jedes Elective ausgewählt sein
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
    const { data } = await hw.patch('/api/user/setup', dataToSend);

    // Die aktualisierten User-Daten an den Parent schicken
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

// Hier soll die aktuelle Auswahl gesendet werden
async function save() {
  if (props.isSetup && !isValid.value) {
    error.value = 'Bitte alle Pflichtkurse auswählen.';
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

// Hier soll gesendet werden für alle drei sachen null
async function skip() {
  skipping.value = true;
  await submitData({ courses: [] });
}
</script>

<template>
  <BaseModal
    :open="open"
    @cancel="$emit('cancel')"
    :error="error"
    :submit="save"
    :cancel="isSetup ? skip : () => $emit('cancel')"
    :loading="submitting || skipping"
  >
    <template #title>{{
      isSetup
        ? t('account.menu.courses.titleCreation')
        : t('account.menu.courses.title')
    }}</template>

    <template #content>
      <p class="text-sm text-on-ghost-muted mb-6">
        {{
          isSetup
            ? t('account.menu.courses.descriptionCreation')
            : t('account.menu.courses.description')
        }}
      </p>

      <div v-if="subjectStore.loading" class="flex justify-center mb-6">
        <BaseSpinner />
      </div>
      <div v-else class="flex flex-col gap-5">
        <!-- Electives -->
        <BaseFormGroup
          v-for="subject in subjectStore.electiveSubjects"
          :key="subject.id"
          :id="subject.id"
        >
          <BaseLabel :for="subject.id">{{
            getCourseLabel(subject.name)
          }}</BaseLabel>
          <BaseSelect
            :id="subject.id"
            :model-value="selections[subject.id] ?? ''"
            @update:model-value="(v) => (selections[subject.id] = v)"
            :options="getOptionsForSubject(subject.id, false)"
          />
        </BaseFormGroup>

        <!-- Extras -->
        <BaseFormGroup
          v-for="subject in subjectStore.extraSubjects"
          :key="subject.id"
          :id="subject.id"
        >
          <BaseLabel :for="subject.id">{{
            getCourseLabel(subject.name)
          }}</BaseLabel>
          <BaseSelect
            :id="subject.id"
            :model-value="selections[subject.id] ?? ''"
            @update:model-value="(v) => (selections[subject.id] = v)"
            :options="getOptionsForSubject(subject.id, true)"
          />
        </BaseFormGroup>
      </div>
    </template>

    <template #cancel-text>
      {{ isSetup ? t('global.buttons.skip') : t('global.buttons.cancel') }}
    </template>

    <template #action-text>
      {{ t('global.buttons.save') }}
    </template>
  </BaseModal>
</template>
