<template>
  <div class="blurit">
    <div class="modal card rlc">
      <div class="modal-head">
        <h3 style="color: white;">Bilder verwalten für: {{ item.title }}</h3>
        <button data-umami-event="ImageForm Menü schließen"  class="btn ghost" @click="$emit('close')">Schließen</button>
      </div>

      <div class="section">
        <div  class="section-title">Bilder</div>

        <div class="images-row row-n">
          <div
              v-for="img in imgStore.images"
              :key="img.publicId"
              class="img-thumb"
          >
            <a :href="img.url" target="_blank" rel="noopener" class="img-link">
              <img
                  :src="img.thumbUrl || imgStore.makeThumb(img.url)"
                  alt="Vorschau"
                  class="img"
                  loading="lazy"
                  decoding="async"
              />
            </a>

            <div class="thumb-actions">
              <button data-umami-event="Bild löschen Button -> Menu öffnen " class="btn danger small" @click="confirmRemoval(img.publicId)" aria-label="Bild löschen">X</button>
            </div>
          </div>
        </div>
      </div>

      <div class="controls row" style="margin-top:16px; align-items:center;">
        <button data-umami-event="Bilder hochladen Button" class="btn ghost" @click="handleUpload" :disabled="imgStore.uploading">
          <svg v-if="imgStore.uploading" class="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Bild hochladen
        </button>
        <div v-if="imgStore.uploadError" class="small msg-error" style="margin-left:12px;">{{ imgStore.uploadError }}</div>
      </div>
    </div>

    <div v-if="showConfirmRemovalModal" class="overlay confirm">
      <div class="modal card rlc confirm-card" role="dialog" aria-modal="true" aria-label="Bild löschen?">
        <h4 style="margin-top: 0;">Dieses Bild unwiderruflich löschen?</h4>
        <p>Wenn du dieses Bild löschst, gibt es keinen Weg, es wiederherzustellen.</p>

        <div class="row" >
          <button data-umami-event="Bild löschen Abbruch" class="btn ghost" @click="cancelRemoval()">Abbrechen</button>
          <button data-umami-event="Bild engültig löschen Button" class="btn danger" @click="handleRemove">Bild löschen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useImageUploadStore } from '../../stores/imageStore';

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

const imgStore = useImageUploadStore();
const showConfirmRemovalModal = ref(false);
const publicIdToRemove = ref('');

onMounted(() => {
  imgStore.init(props.item.images || []);
});

// Watch for changes in store images to emit success back to the parent
watch(() => imgStore.images, () => {
  emit('success');
}, { deep: true });

function confirmRemoval(publicId: string) {
  publicIdToRemove.value = publicId;
  showConfirmRemovalModal.value = true;
}

function cancelRemoval() {
  showConfirmRemovalModal.value = false;
  publicIdToRemove.value = '';
}

async function handleUpload() {
  // Always true here as this component only manages existing items
  await imgStore.uploadImage(true);
}

async function handleRemove() {
  const img = imgStore.images.find(i => i.publicId === publicIdToRemove.value);
  if (img) {
    await imgStore.removeImg(img, props.item.id);
  }
  showConfirmRemovalModal.value = false;
  publicIdToRemove.value = '';
}
</script>

<style scoped>
.overlay.confirm {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(5px);
  background: rgba(0, 0, 0, 0.4);
}

.modal {
  width: 100%;
  max-width: 640px;
  padding: 16px;
  border-radius: 16px;
  border:1px solid var(--border);
  background: var(--lbg);
  box-shadow: var(--shadow-l);
}

.confirm-card {
  background: var(--lbg);
  padding: 16px;
  border-radius: 16px;
  max-width: 420px;
  width: 90%;
  text-align: left;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-l);
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.modal-head h3 { margin: 0; font-size: 1.05rem; }

.section {
  margin-top: 16px;
}

.section-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text);
}

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

.img-link { display: block; width: 100%; height: 100%; }

.img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}

.thumb-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 4;
}

.btn.small { padding: 4px 8px; font-size: 12px; }

.controls { display: flex; align-items: center; gap: 12px; }

.spinner { width: 18px; height: 18px; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.small { font-size: 12px; color: var(--sub); }
.msg-error { color: var(--danger); font-weight: 600; }
.images-row {
  flex-wrap: wrap;
}

@media (max-width: 480px) {
  .img-thumb { width: 88px; flex: 0 0 88px; aspect-ratio: 1 / 1; }
  .modal { padding: 16px; }
}
</style>