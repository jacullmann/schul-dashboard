<template>
  <div class="overlay">
    <div class="modal card">
      <div class="modal-head">
        <h3>Bilder verwalten für: {{ item.title }}</h3>
        <button class="btn ghost" @click="$emit('close')">Schließen</button>
      </div>

      <div class="section">
        <div class="section-title">Bilder</div>

        <div class="images-row row">
          <div
              v-for="img in currentImages"
              :key="img.publicId"
              class="img-thumb"
          >
            <a :href="img.url" target="_blank" rel="noopener" class="img-link">
              <img
                  :src="img.thumbUrl || makeThumb(img.url)"
                  alt="Vorschau"
                  class="img"
                  loading="lazy"
                  decoding="async"
              />
            </a>

            <div class="thumb-actions">
              <button class="btn danger small" @click="confirmRemoval(img.publicId)" aria-label="Bild löschen">X</button>
            </div>
          </div>
        </div>
      </div>

      <div class="controls row" style="margin-top:16px; align-items:center;">
        <button class="btn" @click="uploadImg" :disabled="uploading">
          <svg v-if="uploading" class="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Bild hochladen
        </button>
        <div v-if="message" class="small" :class="isError ? 'msg-error' : 'msg-ok'" style="margin-left:12px;">{{ message }}</div>
      </div>
    </div>

    <div v-if="showConfirmRemovalModal" class="overlay confirm">
      <div class="modal card confirm-card" role="dialog" aria-modal="true" aria-label="Bild löschen?">
        <h4>Bild löschen?</h4>
        <p>Möchtest du dieses Bild wirklich löschen?</p>
        <div class="row" style="justify-content:center; gap:12px; margin-top:16px;">
          <button class="btn danger" @click="removeImg(publicIdToRemove)">Ja, löschen</button>
          <button class="btn ghost" @click="cancelRemoval()">Abbrechen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import hw from '../../hwApi';

const props = defineProps({
  item: {
    type: Object as () => {
      id: string,
      title: string,
      images: Array<{ url: string, thumbUrl?: string, publicId: string }>
    },
    required: true
  },
});
const emit = defineEmits(['close', 'success']);

const uploading = ref(false);
const message = ref('');
const isError = ref(false);
const currentImages = ref(props.item.images || []);
const showConfirmRemovalModal = ref(false);
const publicIdToRemove = ref('');

watchEffect(() => {
  currentImages.value = props.item.images || [];
});

function confirmRemoval(publicId: string) {
  publicIdToRemove.value = publicId;
  showConfirmRemovalModal.value = true;
}

function cancelRemoval() {
  showConfirmRemovalModal.value = false;
  publicIdToRemove.value = '';
}

function makeThumb(url: string) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    const uploadIdx = parts.findIndex(p => p === 'upload');
    if (uploadIdx !== -1) {
      parts.splice(uploadIdx + 1, 0, 'f_auto,q_auto:low,w_240');
      u.pathname = parts.join('/');
    }
    return u.toString();
  } catch {
    return url;
  }
}

async function uploadImg() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    uploading.value = true;
    message.value = '';
    isError.value = false;

    try {
      const { data: sign } = await hw.post('/api/uploads/sign');
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', sign.apiKey);
      form.append('timestamp', String(sign.timestamp));
      form.append('signature', sign.signature);
      form.set('folder', sign.folder);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, { method: 'POST', body: form });
      const json = await res.json();

      if (json.secure_url && json.public_id) {
        const { data } = await hw.post(`/api/items/${props.item.id}/images`, {
          image: { url: json.secure_url, publicId: json.public_id }
        });
        currentImages.value = [...currentImages.value, data.image];
        message.value = 'Bild erfolgreich hochgeladen.';
        isError.value = false;
        emit('success');
      } else {
        message.value = 'Bild-Upload fehlgeschlagen.';
        isError.value = true;
      }
    } catch (e: any) {
      message.value = e?.response?.data?.error || 'Fehler beim Hochladen.';
      isError.value = true;
      console.error('uploadImg error', e);
    } finally {
      uploading.value = false;
    }
  };
  input.click();
}

async function removeImg(publicId: string) {
  showConfirmRemovalModal.value = false;
  message.value = '';
  isError.value = false;

  try {
    const encoded = encodeURIComponent(publicId);
    await hw.delete(`/api/items/${props.item.id}/images/${encoded}`);
    currentImages.value = currentImages.value.filter(img => img.publicId !== publicId);
    message.value = 'Bild erfolgreich gelöscht.';
    emit('success');
  } catch (e: any) {
    console.error('removeImg error', e);
    message.value = e?.response?.data?.error || e?.message || 'Fehler beim Löschen.';
    isError.value = true;
  }
}
</script>

<style scoped>
/* Overlay & modal positioning (keeps original layout) */
.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  background: rgba(0,0,0,0.5);
}

/* nested overlay for confirmation keeps higher z-index */
.overlay.confirm { z-index: 200; }

/* Modal card styling (keeps visual style local) */
.modal {
  width: 100%;
  max-width: 640px;
  padding: 20px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px) saturate(105%) brightness(105%);
  -webkit-backdrop-filter: blur(20px) saturate(105%) brightness(105%);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
}

/* Confirm modal variant */
.confirm-card {
  max-width: 420px;
  text-align: center;
}

/* Header */
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.modal-head h3 { margin: 0; font-size: 1.05rem; }

/* Section */
.section { margin-top: 16px; }
.section-title { font-weight: 600; margin-bottom: 8px; color: var(--text); }

/* Images grid row */
.images-row {
  gap: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
}

/* Thumbnail wrapper: fixed square using aspect-ratio */
.img-thumb {
  width: 120px;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  border: 1px solid var(--border);
  background: rgba(0,0,0,0.06);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 120px;
}

/* link fills wrapper */
.img-link { display: block; width: 100%; height: 100%; }

/* image fills and is cropped */
.img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}

/* action button in corner */
.thumb-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 4;
}

/* small button variant */
.btn.small { padding: 4px 8px; font-size: 12px; }

/* controls and message */
.controls { display: flex; align-items: center; gap: 12px; }

/* spinner */
.spinner { width: 18px; height: 18px; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* message states */
.small { font-size: 12px; color: var(--muted); }
.msg-ok { color: var(--primary); font-weight: 600; }
.msg-error { color: var(--danger); font-weight: 600; }

/* responsive */
@media (max-width: 480px) {
  .img-thumb { width: 88px; flex: 0 0 88px; aspect-ratio: 1 / 1; }
  .modal { padding: 16px; }
}
</style>
