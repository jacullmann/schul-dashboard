<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import hw from '@/api/hwApi';
import Modal from '@/common/components/Modal.vue';
import SelectDropdown from '@/common/components/SelectDropdown.vue';
import LoadingSpinner from '@/common/components/LoadingSpinner.vue';
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
  return courseName
    .replace(/^Herr\s+/, `${mr} `)
    .replace(/^Frau\s+/, `${ms} `);
};

// Option Definitions
const enrichmentOptions = computed(() => {
    return subjectStore.enrCourses.map(k => ({ label: getCourseLabel(k.name), value: k.id }));
});

const wpu1Options = computed(() => {
    return subjectStore.wpu1Courses.map(k => ({ label: getCourseLabel(k.name), value: k.id }));
});

const wpu2Options = computed(() => {
    return subjectStore.wpu2Courses.map(k => ({ label: getCourseLabel(k.name), value: k.id }));
});

const theaterOptions = [
  { label: t('global.selection.yes'), value: '1' },
  { label: t('global.selection.no'), value: '2' },
];

const props = defineProps<{
  visible: boolean; // Steuert die Anzeige der Komponente
  initialData: { enrKurs: string | null; wpuKurs1: string | null; wpuKurs2: string | null; theater: number; };
  isSetup: boolean; // true, wenn es das initiale Setup ist (doneSetup=false)
}>();

// update:user emittiert die aktualisierten User-Daten zurück zum Parent
const emit = defineEmits(['close', 'success', 'update:user']);

const submitting = ref(false);
const skipping = ref(false);
const error = ref<string | null>(null);


const formData = reactive({
  // Initialisiere mit den Props-Werten oder leerem String
  enrKurs: props.initialData.enrKurs || "",
  wpuKurs1: props.initialData.wpuKurs1 || "",
  wpuKurs2: props.initialData.wpuKurs2 || "",
  theater: props.initialData.theater.toString()
});

// Watcher, um formData zu aktualisieren, wenn sich initialData ändert (z.B. beim manuellen Öffnen)
watch(() => props.initialData, (newVal) => {
  formData.enrKurs = newVal.enrKurs || "";
  formData.wpuKurs1 = newVal.wpuKurs1 || "";
  formData.wpuKurs2 = newVal.wpuKurs2 || "";
  formData.theater = newVal.theater.toString();
}, { immediate: true });


// Prüfung, ob alle Felder ausgewählt sind (nur für das initiale Setup relevant)
const isValid = computed(() => {
  // Beim Speichern MUSS jeder Kurs ausgewählt sein (Wert nicht leer)
  return formData.enrKurs !== "" && formData.wpuKurs1 !== "" && formData.wpuKurs2 !== "" && formData.theater !== "0";
});


async function submitData(dataToSend: Record<string, string | number | null>) {
  error.value = null;
  try {
    const { data } = await hw.patch('/api/user/setup', dataToSend);

    // Die aktualisierten User-Daten an den Parent schicken
    emit('update:user', data.user);
    emit('success');
    emit('close');
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
    error.value = 'Bitte alle Kurse auswählen.';
    return;
  }
  submitting.value = true;

  // Sende Strings oder Nullwerte
  const dataToSend = {
    enrKurs: formData.enrKurs === "" ? null : formData.enrKurs,
    wpuKurs1: formData.wpuKurs1 === "" ? null : formData.wpuKurs1,
    wpuKurs2: formData.wpuKurs2 === "" ? null : formData.wpuKurs2,
    theater: parseInt(formData.theater),
  };

  await submitData(dataToSend);
}

// Hier soll gesendet werden für alle drei sachen null
async function skip() {
  skipping.value = true;
  const dataToSend = {
    enrKurs: null,
    wpuKurs1: null,
    wpuKurs2: null,
    theater: 0,
  };

  await submitData(dataToSend);
}
</script>

<template>
  <Modal v-if="visible" @cancel="$emit('close')">
    <template #title>{{ isSetup ? t('account.menu.courses.titleCreation') : t('account.menu.courses.title') }}</template>

    <template #content>
      <p class="small" style="color: var(--color-sub)">{{ isSetup ? t('account.menu.courses.descriptionCreation') : t('account.menu.courses.description') }}</p>

      <div class="form-group">
        <label class="label-text">{{ t('account.menu.courses.enr') }}</label>
        <SelectDropdown
            v-model="formData.enrKurs"
            :options="enrichmentOptions"
        />
      </div>

      <div class="form-group" style="margin-top: 12px;">
        <label class="label-text">{{ t('account.menu.courses.wpu1') }}</label>
        <SelectDropdown
            v-model="formData.wpuKurs1"
            :options="wpu1Options"
        />
      </div>

      <div class="form-group" style="margin-top: 12px;">
        <label class="label-text">{{ t('account.menu.courses.wpu2') }}</label>
        <SelectDropdown
            v-model="formData.wpuKurs2"
            :options="wpu2Options"
        />
      </div>

      <div class="form-group" style="margin-top: 12px;">
        <label class="label-text">{{ t('account.menu.courses.wpu3') }}</label>
        <SelectDropdown
            v-model="formData.theater"
            :options="theaterOptions"
        />
      </div>
    </template>

    <template #actions>
      <div v-if="error" class="field-error" style="color:var(--color-danger); margin-top: 12px;">{{ error }}</div>

      <div class="row" style="margin-top: 16px;">
        <BaseButton v-if="isSetup" @click="skip" :disabled="skipping || submitting" variant="ghost" :loading="skipping">
        {{ t('global.buttons.skip') }}
      </BaseButton>

        <BaseButton v-else @click="$emit('close')" variant="ghost">
          {{ t('global.buttons.cancel') }}
        </BaseButton>

        <BaseButton @click="save" :disabled="submitting || skipping || (isSetup && !isValid)" variant="action" :loading="submitting">
        {{ t('global.buttons.save') }}
      </BaseButton>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.small {
  font-size: var(--text-sub);
  font-family: var(--font-sans), sans-serif;
}

.form-group {
  font-family: var(--font-sans), sans-serif;
}

label {
  margin-bottom: 6px;
  display: block;
}
</style>