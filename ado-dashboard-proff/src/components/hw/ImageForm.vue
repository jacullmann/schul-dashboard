<template>
  <div class="card" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:100;">
    <div class="card" style="width:100%; max-width:640px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">Bilder verwalten für: {{ item.title }}</h3>
        <button class="btn ghost" @click="$emit('close')">Schließen</button>
      </div>

      <div style="margin-top:16px;">
        <div style="font-weight:600;">Bilder</div>
        <div class="row" style="gap:8px; margin-top:8px; flex-wrap:wrap;">
          <div
              v-for="img in currentImages"
              :key="img.publicId"
              style="position:relative; width:120px; border:1px solid var(--border); border-radius:8px; overflow:hidden;"
          >
            <a :href="img.url" target="_blank" rel="noopener">
              <img
                  :src="img.thumbUrl || makeThumb(img.url)"
                  style="display:block; width:120px; height:auto;"
                  loading="lazy"
                  decoding="async"
                  alt="Vorschau"
              />
            </a>
            <div style="position:absolute; top:4px; right:4px;">
              <button class="btn danger" style="padding:4px 8px; font-size:12px;" @click="confirmRemoval(img.publicId)">X</button>
            </div>
          </div>
        </div>
      </div>

      <div class="row" style="margin-top:16px; align-items:center;">
        <button class="btn" @click="uploadImg" :disabled="uploading">
          <svg v-if="uploading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Bild hochladen
        </button>
        <div v-if="message" class="small" :style="{ color: isError ? 'var(--danger)': 'var(--primary)' }" style="margin-left:12px;">{{ message }}</div>
      </div>
    </div>

    <div v-if="showConfirmRemovalModal" class="card" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:200;">
      <div class="card" style="width:100%; max-width:400px; text-align:center;">
        <h4 style="margin:0;">Bild löschen?</h4>
        <p style="margin-top:12px;">Möchtest du dieses Bild wirklich löschen?</p>
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
const currentImages = ref(props.item.images);
const showConfirmRemovalModal = ref(false);
const publicIdToRemove = ref('');

watchEffect(() => {
  currentImages.value = props.item.images;
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
      message.value = e.response?.data?.error || 'Fehler beim Hochladen.';
      isError.value = true;
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
    // encode the publicId so slashes are not treated as path separators
    await hw.delete(`/api/items/${props.item.id}/images/${encodeURIComponent(publicId)}`);
    currentImages.value = currentImages.value.filter(img => img.publicId !== publicId);
    message.value = 'Bild erfolgreich gelöscht.';
    emit('success');
  } catch (e: any) {
    message.value = e.response?.data?.error || 'Fehler beim Löschen.';
    isError.value = true;
  }
}
</script>

<style scoped>
.row {
  display: flex;
  align-items: center;
}
.card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card-bg);
  padding: 24px;
}
</style>
