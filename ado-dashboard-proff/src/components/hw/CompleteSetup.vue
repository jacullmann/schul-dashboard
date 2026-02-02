<template>
  <Modal v-if="visible" @cancel="$emit('close')">
    <template #title>{{ isSetup ? 'Willkommen! Vervollständige dein Profil' : 'Kurse bearbeiten' }}</template>

    <template #content>
      <p class="small" style="color: var(--sub)">{{ isSetup ? 'Wähle aus, welche Fächer du belegst, um bessere Ergebnisse zu bekommen. Du kannst deine Auswahl jederzeit in deinen Account-Einstellungen ändern.' : 'Wähle aus, welche Fächer du belegst, um bessere Ergebnisse zu bekommen.' }}</p>

      <div class="form-group">
        <label class="label-text">Enrichment</label>
        <SelectDropdown
            v-model="formData.enrKurs"
            :options="enrichmentOptions"
        />
      </div>

      <div class="form-group" style="margin-top: 12px;">
        <label class="label-text">WPU am Dienstag</label>
        <SelectDropdown
            v-model="formData.wpuKurs1"
            :options="wpu1Options"
        />
      </div>

      <div class="form-group" style="margin-top: 12px;">
        <label class="label-text">WPU am Donnerstag</label>
        <SelectDropdown
            v-model="formData.wpuKurs2"
            :options="wpu2Options"
        />
      </div>

      <div class="form-group" style="margin-top: 12px;">
        <label class="label-text">Theater</label>
        <SelectDropdown
            v-model="formData.theater"
            :options="theaterOptions"
        />
      </div>
    </template>

    <template #actions>
      <div v-if="error" class="field-error" style="color:var(--danger); margin-top: 12px;">{{ error }}</div>

      <div class="row" style="margin-top: 16px;">
        <button class="btn ghost" v-if="isSetup" @click="skip" :disabled="skipping || submitting">
          {{ skipping ? 'Überspringe...' : 'Überspringen' }}
        </button>

        <button class="btn ghost" v-else @click="$emit('close')">
          Abbrechen
        </button>

        <button class="btn action" @click="save" :disabled="submitting || skipping || (isSetup && !isValid)">
          {{ submitting ? 'Speichere...' : 'Speichern' }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, defineProps, defineEmits } from 'vue';
import hw from '../../hwApi';
import Modal from './Modal.vue';
import SelectDropdown from './SelectDropdown.vue';

// Option Definitions
const enrichmentOptions = [
  { label: 'Herr Müller', value: '1' },
  { label: 'Herr Weber', value: '2' },
  { label: 'Frau Glier', value: '3' },
  { label: 'Frau Ellsiepen', value: '4' },
];

const wpu1Options = [
  { label: 'Englisch', value: '1' },
  { label: 'Deutsch', value: '2' },
  { label: 'Biologie', value: '3' },
  { label: 'Geschichte', value: '4' },
  { label: 'Informatik', value: '5' },
  { label: 'Latein', value: '6' },
];

const wpu2Options = [
  { label: 'Englisch', value: '1' },
  { label: 'Biologie', value: '2' },
  { label: 'Mathe', value: '3' },
  { label: 'Geschichte', value: '4' },
  { label: 'Musik', value: '5' },
];

const theaterOptions = [
  { label: 'Ja', value: '1' },
  { label: 'Nein', value: '2' },
];

const props = defineProps<{
  visible: boolean; // Steuert die Anzeige der Komponente
  // Initialwerte vom Server, die beim Öffnen des Modals übergeben werden
  initialData: { enrKurs: number; wpuKurs1: number; wpuKurs2: number; theater: number; };
  isSetup: boolean; // true, wenn es das initiale Setup ist (doneSetup=false)
}>();

// update:user emittiert die aktualisierten User-Daten zurück zum Parent
const emit = defineEmits(['close', 'success', 'update:user']);

const submitting = ref(false);
const skipping = ref(false);
const error = ref<string | null>(null);


const formData = reactive({
  // Initialisiere mit den Props-Werten, konvertiert zu String
  enrKurs: props.initialData.enrKurs.toString(),
  wpuKurs1: props.initialData.wpuKurs1.toString(),
  wpuKurs2: props.initialData.wpuKurs2.toString(),
  theater: props.initialData.theater.toString()
});

// Watcher, um formData zu aktualisieren, wenn sich initialData ändert (z.B. beim manuellen Öffnen)
watch(() => props.initialData, (newVal) => {
  formData.enrKurs = newVal.enrKurs.toString();
  formData.wpuKurs1 = newVal.wpuKurs1.toString();
  formData.wpuKurs2 = newVal.wpuKurs2.toString();
  formData.theater = newVal.theater.toString();
}, { immediate: true });


// Prüfung, ob alle Felder ausgewählt sind (nur für das initiale Setup relevant)
const isValid = computed(() => {
  // Beim Speichern MUSS jeder Kurs ausgewählt sein (Wert > 0)
  return formData.enrKurs !== "0" && formData.wpuKurs1 !== "0" && formData.wpuKurs2 !== "0" && formData.theater !== "0";
});


async function submitData(dataToSend: Record<string, number>) {
  error.value = null;
  try {
    const { data } = await hw.patch('/api/user/setup', dataToSend);

    // Die aktualisierten User-Daten an den Parent schicken
    emit('update:user', data.user);
    emit('success');
    emit('close');
  } catch (e: any) {
    console.error('Setup failed:', e);
    error.value = e.response?.data?.error || 'Speichern fehlgeschlagen.';
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

  // Konvertiere die String-Werte zu Zahlen für das Backend
  const dataToSend = {
    enrKurs: parseInt(formData.enrKurs),
    wpuKurs1: parseInt(formData.wpuKurs1),
    wpuKurs2: parseInt(formData.wpuKurs2),
    theater: parseInt(formData.theater),
  };

  await submitData(dataToSend);
}

// Hier soll gesendet werden für alle drei sachen 0
async function skip() {
  skipping.value = true;
  const dataToSend = {
    enrKurs: 0, // 0 eintragen
    wpuKurs1: 0, // 0 eintragen
    wpuKurs2: 0,
    theater: 0,// 0 eintragen
  };

  await submitData(dataToSend);
}
</script>

<style scoped>
.small {
  font-size: var(--font-size-sub);
  font-family: var(--normal-font), sans-serif;
}

.form-group {
  font-family: var(--normal-font), sans-serif;
}

label {
  margin-bottom: 6px;
  display: block;
}
</style>