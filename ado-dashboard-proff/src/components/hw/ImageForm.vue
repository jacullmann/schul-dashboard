<template>
  <div class="card" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:100;">
    <div class="card" style="width:100%; max-width:640px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">Bilder verwalten für: {{ item.title }}</h3>
        <button class="btn ghost" @click="$emit('close')">Schließen</button>
      </div>

      <div style="margin-top:16px;">
        <div style="font-weight:600;">Bilder</div>
        <div class="row" style="gap:8px; margin-top:8px;">
          <div v-for="img in currentImages" :key="img.publicId" style="position:relative; max-width:120px; border:1px solid var(--border); border-radius:8px; overflow:hidden;">
            <img :src="img.url" style="width:100%; height:auto;" />
            <div style="position:absolute; top:4px; right:4px;">
              <button class="btn danger" style="padding:4px 8px; font-size:12px;" @click="removeImg(img.publicId)">X</button>
            </div>
          </div>
        </div>
      </div>

      <div class="row" style="margin-top:16px; align-items:center;">
        <button class="btn" @click="uploadImage" :disabled="uploading">
          <svg v-if="uploading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Bild hochladen
        </button>
        <div v-if="message" class="small" :style="{ color: isError ? 'var(--danger)': 'var(--primary)' }">{{ message }}</div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import hw from '../../hwApi';

const props = defineProps<{ item: any }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'success'): void; }>();

const currentImages = ref(props.item.images);
const uploading = ref(false);
const message = ref('');
const isError = ref(false);

async function uploadImage() {
  uploading.value = true;
  message.value = '';
  isError.value = false;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) {
      uploading.value = false;
      return;
    }

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
        // Now post the new image to the item
        const { data } = await hw.post(`/api/items/${props.item.id}/images`, {
          image: { url: json.secure_url, publicId: json.public_id }
        });
        currentImages.value.push(data.image);
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
  if (confirm('Soll dieses Bild wirklich gelöscht werden?')) {
    try {
      await hw.delete(`/api/items/${props.item.id}/images/${publicId}`);
      currentImages.value = currentImages.value.filter(img => img.publicId !== publicId);
      message.value = 'Bild erfolgreich gelöscht.';
      isError.value = false;
      emit('success');
    } catch (e: any) {
      message.value = e.response?.data?.error || 'Fehler beim Löschen.';
      isError.value = true;
    }
  }
}
</script>
