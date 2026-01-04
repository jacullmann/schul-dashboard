<template>
  <div class="blurit" @click.self="$emit('close')" aria-hidden="true">
    <div class="glass-modal" role="dialog" aria-modal="true" aria-label="Eintrag hinzufügen">
      <div class="modal-header">
        <h3 class="modal-title">
          {{ initial ? 'Eintrag bearbeiten' : 'Neuer Eintrag' }} — {{ labelFor(type) }}
        </h3>
        <button data-umami-event="Eintrag erstellen/bearbeiten Menu schließen" class="btn ghost" @click="$emit('close')">Schließen</button>
      </div>

      <div class="row">
        <div class="col">
          <label class="label">Titel</label>
          <input class="input" v-model="title" />
        </div>
        <div class="col">
          <label class="label">Fach</label>
          <select class="input hover" v-model="subjectSel">
            <option disabled value="">Bitte wählen</option>
            <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
            <option value="__OTHER__">Anderes...</option>
          </select>
        </div>

        <div class="col" v-if="subjectSel === 'Enrichment'">
          <label class="label">Kurs</label>
          <select class="input hover" v-model="enrKursSel">
            <option disabled value="">Bitte Kurs wählen</option>
            <option v-for="k in enrKurse" :key="k.id" :value="k.name">{{ k.name }}</option>
          </select>
        </div>

        <div class="col" v-if="subjectSel === 'WPU (Di)'">
          <label class="label">Kurs</label>
          <select class="input hover" v-model="wpuDiKursSel">
            <option disabled value="">Bitte Kurs wählen</option>
            <option v-for="k in wpuDiKurse" :key="k.id" :value="k.name">{{ k.name }}</option>
          </select>
        </div>

        <div class="col" v-if="subjectSel === 'WPU (Do)'">
          <label class="label">Kurs</label>
          <select class="input hover" v-model="wpuDoKursSel">
            <option disabled value="">Bitte Kurs wählen</option>
            <option v-for="k in wpuDoKurse" :key="k.id" :value="k.name">{{ k.name }}</option>
          </select>
        </div>
      </div>

      <div v-if="subjectSel==='__OTHER__'" class="section">
        <input class="input" v-model="subjectOther" placeholder="Eigenes Fach..." />
      </div>

      <div class="section">
        <label class="label">Beschreibung (optional)</label>
        <textarea class="input" rows="4" v-model="description"></textarea>
      </div>

      <div class="row section">
        <div class="col">
          <label class="label">Abgabedatum</label>
          <input class="input hover" type="date" v-model="dueLocal" />

        </div>
      </div>

      <div class="section">
        <div class="label bold">Bilder</div>
        <div class="row images">
          <div
              v-for="img in images"
              :key="img.publicId"
              class="image-item"
          >
            <a :href="img.url" target="_blank" rel="noopener">
              <img
                  :src="img.thumbUrl || makeThumb(img.url)"
                  class="thumb"
                  loading="lazy"
                  decoding="async"
                  alt="Vorschau"
              />
            </a>
            <div class="image-actions">
              <button class="btn danger image-remove" @click="removeImg(img)">X</button>
            </div>
          </div>

          <button data-umami-event="Bild zu Eintrag hinzufügen Button" class="btn ghost" @click="uploadImage" :disabled="uploading">
            <svg v-if="uploading" class="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Bild hochladen
          </button>
        </div>
        <div v-if="uploading" class="small">Lade Bild hoch...</div>
        <div v-if="uploadError" class="small error">{{ uploadError }}</div>
      </div>

      <div class="row actions">
        <button data-umami-event="Eintrag speichern/anlegen" class="btn action" @click="submit" :disabled="submitting">
          <svg v-if="submitting" class="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ initial ? 'Speichern' : 'Anlegen' }}
        </button>
        <div v-if="message" class="small" :class="isError ? 'msg-error' : 'msg-ok'">{{ message }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import hw from '../../hwApi';
import type { HwItem } from './Hausaufgaben.vue';
import { containsProfanity } from '../../composables/useProfanity';
import { processImageBeforeUpload} from "../../composables/useConvertImage";


const props = defineProps<{
  type: 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG';
  initial?: HwItem;
  subjects: string[]
}>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'success'): void; }>();

const labelFor = (type: string) => {
  const map = {
    'HAUSAUFGABE': 'Hausaufgabe',
    'DALTON': 'Daltonauftrag',
    'PRUEFUNG': 'Prüfung',
  } as const;
  return map[type];
};
const enrKurse = [
  { id: '1', name: 'Herr Müller' },
  { id: '2', name: 'Herr Weber' },
  { id: '3', name: 'Frau Glier' },
  { id: '4', name: 'Frau Ellsiepen' },
];

const wpuDiKurse = [
  { id: '1', name: 'Englisch' },
  { id: '2', name: 'Deutsch' },
  { id: '3', name: 'Biologie' },
  { id: '4', name: 'Geschichte' },
  { id: '5', name: 'Informatik' },
  { id: '6', name: 'Latein' },
];

const wpuDoKurse = [
  { id: '1', name: 'Englisch' },
  { id: '2', name: 'Biologie' },
  { id: '3', name: 'Mathe' },
  { id: '4', name: 'Geschichte' },
  { id: '5', name: 'Musik' },
];

const getInitialSubjectParts = () => {
  const initial = props.initial?.subject;
  if (!initial) return { main: '', course: '' };

  const parts = initial.split(' - ');
  if (parts.length === 2) {
    const main = parts[0].trim();
    const course = parts[1].trim();
    if (['Enrichment', 'WPU (Di)', 'WPU (Do)'].includes(main)) {
      return { main, course };
    }
  }
  return { main: initial, course: '' };
};

const initialParts = getInitialSubjectParts();

const title = ref(props.initial?.title || '');
const subjectSel = ref(initialParts.main);
const subjectOther = ref('');
const description = ref(props.initial?.description || '');
const images = ref(props.initial?.images || []);
const enrKursSel = ref(initialParts.main === 'Enrichment' ? initialParts.course : '');
const wpuDiKursSel = ref(initialParts.main === 'WPU (Di)' ? initialParts.course : '');
const wpuDoKursSel = ref(initialParts.main === 'WPU (Do)' ? initialParts.course : '');

watch(subjectSel, (newVal) => {
  // Setzt die Kursauswahl zurück, wenn das Hauptfach gewechselt wird
  if (newVal !== 'Enrichment') enrKursSel.value = '';
  if (newVal !== 'WPU (Di)') wpuDiKursSel.value = '';
  if (newVal !== 'WPU (Do)') wpuDoKursSel.value = '';
});

const now = new Date();
const minDate = new Date();
minDate.setDate(now.getDate() - 2);
minDate.setHours(0, 0, 0, 0);

const maxDate = new Date();
maxDate.setDate(now.getDate() + 365);
maxDate.setHours(23, 59, 59, 999);

function isoDateOnlyFromIso(iso: string) {
  try {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch { return new Date().toISOString().slice(0,10); }
}

const dueLocal = ref(
    props.initial?.dueDate ? isoDateOnlyFromIso(props.initial.dueDate) : new Date().toISOString().slice(0,10)
);


const submitting = ref(false);
const message = ref('');
const isError = ref(false);
const uploading = ref(false);
const uploadError = ref('');

function makeThumb(url: string) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    const uploadIdx = parts.findIndex(p => p === 'upload');
    if (uploadIdx !== -1) {
      parts.splice(uploadIdx + 1, 0, 'f_webp,q_auto:best,w_120');
      u.pathname = parts.join('/');
    }
    return u.toString();
  } catch {
    return url;
  }
}

async function uploadImage() {
  uploading.value = true;
  uploadError.value = '';

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;

  // Reset uploading state if user cancels
  input.oncancel = () => {
    uploading.value = false;
  };

  input.onchange = async () => {
    const files = Array.from(input.files || []);
    if (files.length === 0) {
      uploading.value = false;
      return;
    }

    const TOTAL_MAX_IMAGES = 12;
    const PER_USER_MAX_IMAGES = 8;
    const MAX_IMAGES = props.initial ? TOTAL_MAX_IMAGES : PER_USER_MAX_IMAGES;
    const existingCount = (images.value || []).length;
    const remaining = MAX_IMAGES - existingCount;
    if (remaining <= 0) {
      uploadError.value = `Die maximale Anzahl an Bilder (${MAX_IMAGES})  ${props.initial ? '(gesamt)' : '(für neuen Eintrag)'} für diesen Eintrag wurden erreicht.`;
      uploading.value = false;
      return;
    }
    if (files.length > remaining) {
      uploadError.value = `Du kannst nur noch ${remaining} Bild(er) hochladen. Dein Limit: ${MAX_IMAGES} Bilder.`;
      uploading.value = false;
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        console.warn(`Datei ${file.name} ist kein Bild und wird übersprungen.`);
        continue;
      }

      try {
        const processedFile = await processImageBeforeUpload(file);
        const { data: sign } = await hw.post('/api/uploads/sign');
        const form = new FormData();
        form.set('file', processedFile);
        form.set('api_key', sign.apiKey);
        form.set('timestamp', String(sign.timestamp));
        form.set('signature', sign.signature);
        form.set('folder', sign.folder);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, { method: 'POST', body: form });
        const json = await res.json();

        if (json.secure_url && json.public_id) {
          images.value.push({
            url: json.secure_url,
            thumbUrl: makeThumb(json.secure_url),
            publicId: json.public_id,
            createdBy: ''
          });
          uploadError.value = '';
        } else {
          uploadError.value = 'Einige Uploads konnten nicht durchgeführt werden.';
          console.error('Upload failed for file', file, json);
        }
      } catch (e: any) {
        uploadError.value = 'Upload fehlgeschlagen für mindestens eine Datei.';
        console.error('uploadImage error', e);
      }
    }

    uploading.value = false;
  };

  // Setze einen Timeout als Fallback für den Fall, dass oncancel nicht funktioniert
  setTimeout(() => {
    if (uploading.value) {
      // Prüfe ob das input Element noch im DOM ist (Dialog noch offen)
      if (!document.body.contains(input)) {
        uploading.value = false;
      }
    }
  }, 3000);

  input.click();
}



async function removeImg(img: { url: string; publicId: string }) {
  if (props.initial?.id) {
    try {
      // encode publicId so slashes are safe in the URL
      await hw.delete(`/api/items/${props.initial.id}/images/${encodeURIComponent(img.publicId)}`);

      // remove locally
      images.value = images.value.filter(i => i.publicId !== img.publicId);

      console.log('Bild erfolgreich gelöscht:', img.publicId);
      uploadError.value = 'Bild erfolgreich gelöscht.';
      setTimeout(() => uploadError.value = '', 3000);

    } catch (e: any) {
      console.error('Fehler beim Löschen des Bildes:', e);
      uploadError.value = 'Fehler beim Löschen des Bildes.';
    }
  } else {
    images.value = images.value.filter(i => i.publicId !== img.publicId);
  }
}

async function submit() {
  submitting.value = true;
  message.value = '';
  isError.value = false;

  try {
    if (
        containsProfanity(title.value) ||
        containsProfanity(subjectSel.value) ||
        containsProfanity(subjectOther.value) ||
        containsProfanity(description.value)
    ) {
      throw new Error('Unangemessene Inhalte erkannt. Bitte drücke dich in angemessener Sprache aus.');
    }
    // --- NEUE LOGIK ZUM ERSTELLEN DES 'subject'-STRINGS ---
    let subject = '';
    const mainSubject = subjectSel.value;

    if (mainSubject === '__OTHER__') {
      subject = subjectOther.value.trim();
    } else if (mainSubject === 'Enrichment') {
      if (!enrKursSel.value) {
        throw new Error('Bitte einen Enrichment-Kurs auswählen');
      }
      subject = `Enrichment - ${enrKursSel.value}`;
    } else if (mainSubject === 'WPU (Di)') {
      if (!wpuDiKursSel.value) {
        throw new Error('Bitte einen WPU (Di) Kurs auswählen');
      }
      subject = `WPU (Di) - ${wpuDiKursSel.value}`;
    } else if (mainSubject === 'WPU (Do)') {
      if (!wpuDoKursSel.value) {
        throw new Error('Bitte einen WPU (Do) Kurs auswählen');
      }
      subject = `WPU (Do) - ${wpuDoKursSel.value}`;
    } else {
      // Es ist ein einfaches Fach (z.B. "Mathe", "Deutsch")
      subject = mainSubject;
    }

    // Titel-Validierung
    if (!title.value.trim()) {
      throw new Error('Du musst einen Titel hinzufügen');
    }
    if (title.value.trim().length < 2 || title.value.trim().length > 60) {
      throw new Error('Passe den Titel an (2-60 Zeichen)');
    }

    // Fach-Validierung (verwendet jetzt die neue 'subject' Variable)
    if (!subject) {
      throw new Error('Du musst ein Fach auswählen');
    }
    // Die 40-Zeichen-Validierung aus routes.js
    if (subject.length < 2 || subject.length > 40) {
      // z.B. "Enrichment - Frau Ellsiepen" = 27 Zeichen. Passt.
      // z.B. "WPU (Di) - Informatik" = 22 Zeichen. Passt.
      throw new Error('Passe das Fach an (2-40 Zeichen)');
    }

    // Beschreibungs-Validierung
    if (description.value.trim().length > 1000) {
      throw new Error('Die Beschreibung ist zu lang');
    }

    const payload = {
      type: props.type,
      title: title.value.trim(),
      subject,
      description: description.value.trim(),
      images: images.value
    };

    const selected = new Date(dueLocal.value);
    selected.setHours(23, 59, 0, 0);
    payload.dueDate = selected.toISOString();

    if (selected < minDate) {
      throw new Error('Das Datum liegt zu weit in der Vergangenheit');
    }
    if (selected > maxDate) {
      throw new Error('Das Datum liegt zu weit in der Zukunft');
    }

    if (props.initial) {
      await hw.patch(`/api/items/${props.initial.id}`, payload);
      message.value = 'Eintrag erfolgreich aktualisiert.';
    } else {
      await hw.post('/api/items', payload);
      message.value = 'Eintrag erfolgreich angelegt.';
    }

    isError.value = false;
    emit('success');

  } catch (e: any) {
    if (e.response?.status === 400) {
      message.value = e.response.data.error || 'Bitte überprüfe deine Eingaben.';
    } else if (e.message) {
      message.value = e.message;
    } else {
      message.value = 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.';
    }
    isError.value = true;
  } finally {
    submitting.value = false;
  }
}



function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
}
onMounted(() => window.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));
</script>

<style scoped>


.glass-modal {
  width: 100%;
  max-width: 720px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--lbg);
  box-shadow: var(--shadow-l);
  padding: 16px;
  max-height: calc(100vh - 40px);
  overflow-y: scroll;
  position: fixed;
  z-index: 100001;
}


.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}
.section {
  margin-top: 10px;
}

.label {
  display: block;
  font-size: 13px;
  color: var(--text);
  margin-bottom: 6px;
}
.label.bold {
  font-weight: 600;
  color: var(--text);
}

/* Bilderbereich */
.images {
  gap: 8px;
  margin-top: 6px;
  justify-content: flex-start;
}
.image-item {
  position: relative;
  width: 120px;
  height: 120px;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(26, 26, 26, 0.5);
  backdrop-filter: blur(8px) brightness(95%);
  -webkit-backdrop-filter: blur(8px) brightness(95%);
}
.thumb {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.image-actions {
  position: absolute;
  top: 4px;
  right: 4px;
}
.image-remove {
  padding: 4px 8px;
  font-size: 12px;
}

/* Spinner */
.spinner {
  animation: spin 1s linear infinite;
  height: 20px;
  width: 20px;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Aktionen unten */
.actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

/* Meldungen */
.small {
  font-size: 12px;
  color: var(--sub);
}
.error {
  color: var(--danger);
}
.msg-ok {
  color: var(--primary);
}
.msg-error {
  color: var(--danger);
}
</style>
