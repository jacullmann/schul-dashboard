<template>
  <div class="card" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center;">
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
        <input class="input" v-model="subjectOther" placeholder="Eigenes Fach" />
      </div>

      <div style="margin-top:8px;">
        <label>Beschreibung (optional)</label>
        <textarea class="input" rows="4" v-model="description"></textarea>
      </div>

      <div style="margin-top:8px;">
        <label>Abgabedatum</label>
        <input class="input" type="datetime-local" v-model="dueLocal" />
      </div>

      <div style="margin-top:8px;">
        <label>Bilder (optional)</label>
        <div class="row">
          <button class="btn" @click="pickAndUpload">Bild hochladen</button>
        </div>
        <div class="row" style="margin-top:8px; flex-wrap:wrap;">
          <div v-for="img in images" :key="img.url" class="card" style="padding:6px;">
            <img :src="img.url" style="width:120px; height:90px; object-fit:cover; border-radius:8px;"/>
            <div class="row" style="margin-top:6px;">
              <button class="btn danger" @click="removeImg(img)">Entfernen</button>
            </div>
          </div>
        </div>
      </div>

      <div class="row" style="margin-top:12px; align-items:center;">
        <button class="btn" @click="submit" :disabled="submitting">{{ initial ? 'Speichern' : 'Anlegen' }}</button>
        <div v-if="error" class="small" style="color:var(--danger)">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import hw from '../../hwApi';

const props = defineProps<{ type:'HAUSAUFGABE'|'DALTON'|'PRUEFUNG'; subjects:string[]; initial?: any }>();
const emit = defineEmits<{ (e:'close'): void; (e:'saved'): void }>();

const title = ref(props.initial?.title || '');
const subjectSel = ref(props.initial?.subject && props.subjects.includes(props.initial.subject) ? props.initial.subject : '');
const subjectOther = ref(props.initial && !props.subjects.includes(props.initial.subject || '') ? props.initial.subject : '');
const description = ref(props.initial?.description || '');
const dueLocal = ref(props.initial ? toLocal(props.initial.dueDate) : '');
const images = ref<{url:string; publicId:string}[]>(props.initial?.images || []);
const submitting = ref(false);
const error = ref('');

function labelFor(t:string) {
  return t==='HAUSAUFGABE' ? 'Hausaufgabe' : t==='DALTON' ? 'DALTON' : 'Prüfung';
}
function toLocal(iso:string) {
  const d = new Date(iso);
  const pad = (n:number)=> String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function pickAndUpload() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files?.[0]; if (!file) return;
    try {
      const { data: sign } = await hw.post('/api/uploads/sign');
      const form = new FormData();
      form.set('file', file);
      form.set('api_key', sign.apiKey);
      form.set('timestamp', String(sign.timestamp));
      form.set('signature', sign.signature);
      form.set('folder', sign.folder);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, { method:'POST', body: form });
      const json = await res.json();
      if (json.secure_url && json.public_id) {
        images.value.push({ url: json.secure_url, publicId: json.public_id });
      } else {
        error.value = 'Upload fehlgeschlagen';
      }
    } catch (e:any) {
      error.value = 'Upload fehlgeschlagen';
    }
  };
  input.click();
}

function removeImg(img:{url:string; publicId:string}) {
  images.value = images.value.filter(i => i.publicId !== img.publicId);
}

async function submit() {
  error.value = '';
  submitting.value = true;
  try {
    const subject = subjectSel.value === '__OTHER__' ? subjectOther.value.trim() : subjectSel.value;
    const payload:any = {
      type: props.type,
      title: title.value.trim(),
      subject,
      description: description.value.trim(),
      images: images.value,
      dueDate: new Date(dueLocal.value).toISOString()
    };
    if (!props.initial) {
      await hw.post('/api/items', payload);
    } else {
      await hw.patch(`/api/items/${props.initial.id}`, payload);
    }
    emit('saved'); emit('close');
  } catch (e:any) {
    error.value = e?.response?.data?.error || 'Fehler';
  } finally {
    submitting.value = false;
  }
}
</script>
