<template>
  <Modal @close="emit('close')">
    <template #title>
      {{ initial ? 'Eintrag bearbeiten' : 'Neuer Eintrag' }} — {{ labelFor(type) }}
    </template>

    <template #content>
      <div class="row-n top">
        <div class="col">
          <label class="label">Titel</label>
          <input class="input" v-model="title" />
        </div>

        <div class="col">
          <label class="label">Fach</label>
          <SelectDropdown
              v-model="subjectSel"
              :options="subjectOptions"
          />
        </div>

        <div class="col" v-if="subjectSel === 'Enrichment'">
          <label class="label">Kurs</label>
          <SelectDropdown
              v-model="enrKursSel"
              :options="enrOptions"
          />
        </div>

        <div class="col" v-if="subjectSel === 'WPU (Di)'">
          <label class="label">Kurs</label>
          <SelectDropdown
              v-model="wpuDiKursSel"
              :options="wpuDiOptions"
          />
        </div>

        <div class="col" v-if="subjectSel === 'WPU (Do)'">
          <label class="label">Kurs</label>
          <SelectDropdown
              v-model="wpuDoKursSel"
              :options="wpuDoOptions"
          />
        </div>
      </div>

      <div v-if="subjectSel==='__OTHER__'" class="section">
        <label class="label">Benutzerdefiniertes Fach</label>
        <input class="input" v-model="subjectOther"/>
      </div>

      <div class="section">
        <label class="label">Beschreibung (optional)</label>
        <textarea class="input" rows="4" v-model="description"></textarea>
      </div>

      <div class="row-n section">
        <div class="col">
          <label class="label">Datum</label>
          <input class="input hover" type="date" v-model="dueLocal" />

        </div>
      </div>

      <div class="section">
        <div class="label">Bilder</div>
        <div class="row-n images">
          <div
              v-for="img in imgStore.images"
              :key="img.publicId"
              class="image-item"
          >
            <a :href="img.url" target="_blank" rel="noopener">
              <img
                  :src="img.thumbUrl || imgStore.makeThumb(img.url)"
                  class="thumb"
                  loading="lazy"
                  decoding="async"
                  alt="Vorschau"
              />
            </a>
            <div class="image-actions">
              <button class="btn danger image-remove" @click="imgStore.removeImg(img, initial?.id)">X</button>
            </div>
          </div>

          <button data-umami-event="Bild zu Eintrag hinzufügen Button" class="btn ghost" @click="imgStore.uploadImage(!!initial)" :disabled="imgStore.uploading">
            <svg v-if="imgStore.uploading" class="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Bilder hochladen
          </button>
        </div>
        <div v-if="imgStore.uploading" class="small">Lade Bild hoch...</div>
        <div v-if="imgStore.uploadError" class="small error">{{ imgStore.uploadError }}</div>
      </div>
    </template>

    <template #actions>
      <div class="row actions">
        <div v-if="message" class="small" :class="isError ? 'msg-error' : 'msg-ok'">{{ message }}</div>

        <button class="btn ghost" @click="emit('close')">
          Abbrechen
        </button>

        <button class="btn action" @click="submit" :disabled="submitting">
          <svg v-if="submitting" class="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ initial ? 'Speichern' : 'Erstellen' }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue';
import hw from '../../hwApi';
import type { HwItem } from '../../composables/useHausaufgaben';
import { containsProfanity } from '../../composables/useProfanity';
import { useImageUploadStore } from '../../stores/imageStore';
import Modal from './Modal.vue';
import SelectDropdown from './SelectDropdown.vue';

const props = defineProps<{
  type: 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG';
  initial?: HwItem;
  subjects: string[]
}>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'success'): void; }>();

const imgStore = useImageUploadStore();

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
const enrKursSel = ref(initialParts.main === 'Enrichment' ? initialParts.course : '');
const wpuDiKursSel = ref(initialParts.main === 'WPU (Di)' ? initialParts.course : '');
const wpuDoKursSel = ref(initialParts.main === 'WPU (Do)' ? initialParts.course : '');

watch(subjectSel, (newVal) => {
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

const subjectOptions = computed(() => {
  const opts = props.subjects.map(s => ({ label: s, value: s }));

  const specials = ['Enrichment', 'WPU (Di)', 'WPU (Do)'];

  specials.forEach(special => {
    if (!opts.some(o => o.value === special)) {
      opts.push({ label: special, value: special });
    }
  });

  opts.push({ label: 'Anderes...', value: '__OTHER__' });

  return opts;
});

const enrOptions = enrKurse.map(k => ({ label: k.name, value: k.name }));
const wpuDiOptions = wpuDiKurse.map(k => ({ label: k.name, value: k.name }));
const wpuDoOptions = wpuDoKurse.map(k => ({ label: k.name, value: k.name }));

async function submit() {
  submitting.value = true;
  message.value = '';
  isError.value = false;

  const resolveSubject = () => {
    const main = subjectSel.value;

    if (main === '__OTHER__') {
      return subjectOther.value.trim();
    }

    if (main === 'Enrichment') {
      if (!enrKursSel.value) throw new Error('Du musst einen Enrichment-Kurs auswählen.');
      return `Enrichment - ${enrKursSel.value}`;
    }

    if (main === 'WPU (Di)') {
      if (!wpuDiKursSel.value) throw new Error('Du musst einen WPU-Kurs auswählen.');
      return `WPU (Di) - ${wpuDiKursSel.value}`;
    }

    if (main === 'WPU (Do)') {
      if (!wpuDoKursSel.value) throw new Error('Du musst einen WPU-Kurs auswählen.');
      return `WPU (Do) - ${wpuDoKursSel.value}`;
    }

    return main;
  };

  try {
    const hasProfanity = [
      title.value,
      subjectSel.value,
      subjectOther.value,
      description.value
    ].some(text => containsProfanity(text));

    if (hasProfanity) {
      throw new Error('Es wurde ein unangemessener Inhalt erkannt. Falls du denkst, dass dies ein Fehler ist, kontaktiere die Seitenbetreiber.');
    }

    const subject = resolveSubject();

    if (!subject || !subject.length) {
      throw new Error('Du musst ein benutzerdefiniertes Fach eintragen.');
    }
    if (subject.length > 40) {
      throw new Error('Das benutzerdefinierte Fach ist zu lang (max. 40 Zeichen).');
    }

    const cleanTitle = title.value.trim();
    const cleanDesc = description.value.trim();

    if (!cleanTitle) {
      throw new Error('Du musst einen Titel hinzufügen.');
    }
    if (cleanTitle.length > 60) {
      throw new Error('Der Titel ist zu lang (max. 60 Zeichen).');
    }
    if (cleanDesc.length > 1000) {
      throw new Error('Die Beschreibung ist zu lang (max. 1000 Zeichen).');
    }

    const selectedDate = new Date(dueLocal.value);
    selectedDate.setHours(23, 59, 0, 0);

    if (selectedDate < minDate) throw new Error('Das Datum liegt zu weit in der Vergangenheit.');
    if (selectedDate > maxDate) throw new Error('Das Datum liegt zu weit in der Zukunft.');

    const payload = {
      type: props.type,
      title: cleanTitle,
      subject,
      description: cleanDesc,
      images: imgStore.images,
      dueDate: selectedDate.toISOString()
    };

    if (props.initial) {
      await hw.patch(`/api/items/${props.initial.id}`, payload);
      message.value = 'Eintrag erfolgreich bearbeitet.';
    } else {
      await hw.post('/api/items', payload);
      message.value = 'Eintrag erfolgreich erstellt.';
    }

    emit('success');

  } catch (e: any) {
    isError.value = true;

    if (e.response?.status === 400) {
      message.value = e.response.data.error || 'Bitte überprüfe deine Eingaben.';
    } else {
      message.value = e.message || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.';
    }
  } finally {
    submitting.value = false;
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
}

onMounted(() => {
  imgStore.init(props.initial?.images || []);
  window.addEventListener('keydown', onKeyDown);
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));
</script>

<style scoped>
.modal-title {
  margin: 0;
  font-size: var(--font-size-h3);
  color: var(--text);
}
.section {
  margin-top: 16px;
}
.top {
  gap: 16px;
}

.label {
  display: block;
  font-size: var(--font-size-button);
  color: var(--text);
  margin-bottom: 6px;
}

.images {
  gap: 8px;
  justify-content: flex-start;
}
.image-item {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: var(--border-4);
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

.spinner {
  animation: spin 1s linear infinite;
  height: 18px;
  width: 18px;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}

.small {
  font-size: var(--font-size-sub);
  color: var(--sub);
  align-self: center;
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