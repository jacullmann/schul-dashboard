<template>
  <div v-if="visible" class="modal-overlay" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); width: 100%; margin-left:0;display:flex; align-items:center; justify-content:center; z-index:1000000000;">
    <div class="card modal-content" style="max-width: 480px; width: 90%; top: 5px;">
      <h2>{{ isSetup ? 'Willkommen! Vervollständige dein Profil' : 'Kurse bearbeiten' }}</h2>
      <p class="small" style="color: var(--sub)">{{ isSetup ? 'Wähle aus, welche Fächer du belegst, um bessere Ergebnisse zu bekommen. Du kannst deine Auswahl jederzeit in deinen Account-Einstellungen ändern.' : 'Wähle aus, welche Fächer du belegst, um bessere Ergebnisse zu bekommen.' }}</p>

      <div class="form-group">
        <label for="enrKurs">Enrichment</label>
        <select id="enrKurs" v-model="formData.enrKurs" class="input">
          <option value="0" disabled>Bitte auswählen...</option>
          <option value="1">Herr Müller</option>
          <option value="2">Herr Weber</option>
          <option value="3">Frau Glier</option>
          <option value="4">Frau Ellsiepen</option>
        </select>
      </div>

      <div class="form-group" style="margin-top: 12px;">
        <label for="wpuKurs1">WPU am Dienstag</label>
        <select id="wpuKurs1" v-model="formData.wpuKurs1" class="input">
          <option value="0" disabled>Bitte auswählen...</option>
          <option value="1">Englisch</option>
          <option value="2">Deutsch</option>
          <option value="3">Biologie</option>
          <option value="4">Geschichte</option>
          <option value="5">Informatik</option>
          <option value="6">Latein</option>
        </select>
      </div>

      <div class="form-group" style="margin-top: 12px;">
        <label for="wpuKurs2">WPU am Donnerstag</label>
        <select id="wpuKurs2" v-model="formData.wpuKurs2" class="input">
          <option value="0" disabled>Bitte auswählen...</option>
          <option value="1">Englisch</option>
          <option value="2">Biologie</option>
          <option value="3">Mathe</option>
          <option value="4">Geschichte</option>
          <option value="5">Musik</option>
        </select>
      </div>

      <div class="form-group" style="margin-top: 12px;">
        <label for="theater">Theater</label>
        <select id="theater" v-model="formData.theater" class="input">
          <option value="0" disabled>Bitte auswählen...</option>
          <option value="1">Ja</option>
          <option value="2">Nein</option>
        </select>
      </div>



      <div v-if="error" class="field-error" style="color:var(--danger); margin-top: 12px;">{{ error }}</div>

      <div class="row" style="justify-content: space-between; margin-top: 20px;">
        <button class="btn" @click="save" :disabled="submitting || skipping || (isSetup && !isValid)">
          {{ submitting ? 'Speichere...' : 'Speichern' }}
        </button>
        <button class="btn ghost" v-if="isSetup" @click="skip" :disabled="skipping || submitting">
          {{ skipping ? 'Überspringe...' : 'Überspringen' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, defineProps, defineEmits } from 'vue';
import hw from '../../hwApi';

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
.modal-overlay {
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
}
.modal-content {
  z-index: 10000000000000000;
  position: relative;
}
.input {
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  border-radius: 10px;
  border: none;
  background: #282828;
  color: var(--text);
  outline: none;
}
label {
  margin-bottom: 15px;
  display: block;
}
</style>