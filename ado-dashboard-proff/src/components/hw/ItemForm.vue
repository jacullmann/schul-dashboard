<template>
  <div class="card" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:100;">
    <div class="card" style="width:100%; max-width:640px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">{{ initial ? 'Eintrag bearbeiten' : 'Neuer Eintrag' }} — {{ labelFor(type) }}</h3>
        <button class="btn ghost" @click="$emit('close')">Schließen</button>
      </div>

      <div class="row" style="margin-top:12px;">
        <div class="col">
          <label>Titel</label>
          <input class="input" v-model="title" />
        </div>
        <div class="col">
          <label>Fach</label>
          <select class="input" v-model="subjectSel">
            <option disabled value="">Bitte wählen</option>
            <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
            <option value="__OTHER__">Anderes...</option>
          </select>
        </div>
      </div>
      <div v-if="subjectSel==='__OTHER__'" style="margin-top:8px;">
        <input class="input" v-model="subjectOther" placeholder="Eigenes Fach..." />
      </div>

      <div style="margin-top:8px;">
        <label>Beschreibung (optional)</label>
        <textarea class="input" rows="4" v-model="description"></textarea>
      </div>

      <div class="row" style="margin-top:8px;">
        <div class="col">
          <label>Abgabedatum</label>
          <input class="input" type="datetime-local" v-model="dueLocal" />
        </div>
      </div>

      <div style="margin-top:16px;">
        <div style="font-weight:600;">Bilder</div>
        <div class="row" style="gap:8px; margin-top:8px;">
          <div v-for="img in images" :key="img.publicId" style="position:relative; max-width:120px; border:1px solid var(--border); border-radius:8px; overflow:hidden;">
            <img :src="img.url" style="width:100%; height:auto;" />
            <div style="position:absolute; top:4px; right:4px;">
              <button class="btn danger" style="padding:4px 8px; font-size:12px;" @click="removeImg(img)">X</button>
            </div>
          </div>
          <button class="btn ghost" @click="uploadImage" :disabled="uploading">
            <svg v-if="uploading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Bild hochladen
          </button>
        </div>
        <div v-if="uploading" class="small">Lade Bild hoch...</div>
        <div v-if="uploadError" class="small" style="color:var(--danger)">{{ uploadError }}</div>
      </div>

      <div class="row" style="margin-top:16px; align-items:center;">
        <button class="btn" @click="submit" :disabled="submitting">
          <svg v-if="submitting" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ initial ? 'Speichern' : 'Anlegen' }}
        </button>
        <div v-if="message" class="small" :style="{ color: isError ? 'var(--danger)': 'var(--primary)' }">{{ message }}</div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import hw from '../../hwApi';
import type { HwItem } from './Hausaufgaben.vue';

const props = defineProps<{ type: 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG'; initial?: HwItem; subjects: string[] }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'success'): void; }>();

const labelFor = (type: string) => {
  const map = {
    'HAUSAUFGABE': 'Hausaufgabe',
    'DALTON': 'Dalton-Auftrag',
    'PRUEFUNG': 'Klassenarbeit',
  };
  return map[type];
};

const title = ref(props.initial?.title || '');
const subjectSel = ref(props.initial?.subject || '');
const subjectOther = ref('');
const description = ref(props.initial?.description || '');
const images = ref(props.initial?.images || []);
const dueLocal = ref(props.initial?.dueDate ? new Date(props.initial.dueDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));

const submitting = ref(false);
const message = ref('');
const isError = ref(false);
const uploading = ref(false);
const uploadError = ref('');

async function uploadImage() {
  uploading.value = true;
  uploadError.value = '';
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      const { data: sign } = await hw.post('/api/uploads/sign');
      const form = new FormData();
      form.set('file', file);
      form.set('api_key', sign.apiKey);
      form.set('timestamp', String(sign.timestamp));
      form.set('signature', sign.signature);
      form.set('folder', sign.folder);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, { method: 'POST', body: form });
      const json = await res.json();
      if (json.secure_url && json.public_id) {
        images.value.push({ url: json.secure_url, publicId: json.public_id, createdBy: '' }); // createdBy is set by the backend
        uploadError.value = '';
      } else {
        uploadError.value = 'Upload fehlgeschlagen';
      }
    } catch (e: any) {
      uploadError.value = 'Upload fehlgeschlagen';
    } finally {
      uploading.value = false;
    }
  };
  input.click();
}

function removeImg(img: { url: string; publicId: string }) {
  images.value = images.value.filter(i => i.publicId !== img.publicId);
}

async function submit() {
  submitting.value = true;
  message.value = '';
  isError.value = false;
  try {
    const subject = subjectSel.value === '__OTHER__' ? subjectOther.value.trim() : subjectSel.value;
    const payload: any = {
      type: props.type,
      title: title.value.trim(),
      subject,
      description: description.value.trim(),
      images: images.value,
      dueDate: new Date(dueLocal.value).toISOString()
    };
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
    message.value = e.response?.data?.error || 'Unbekannter Fehler';
    isError.value = true;
  } finally {
    submitting.value = false;
  }
}
</script>
