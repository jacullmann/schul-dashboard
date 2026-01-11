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
              v-for="img in store.images"
              :key="img.publicId"
              class="img-thumb"
          >
            <a :href="img.url" target="_blank" rel="noopener" class="img-link">
              <img
                  :src="img.thumbUrl || store.makeThumb(img.url)"
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
        <button data-umami-event="Bilder hochladen Button" class="btn ghost" @click="uploadImg" :disabled="store.uploading">
          <svg v-if="store.uploading" class="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Bild hochladen
        </button>
        <div
            v-if="store.uploadError"
            class="small"
            :class="isSuccessMessage ? 'msg-ok' : 'msg-error'"
            style="margin-left:12px;"
        >
          {{ store.uploadError }}
        </div>
      </div>
    </div>

    <div v-if="showConfirmRemovalModal" class="overlay confirm">
      <div class="modal card rlc confirm-card" role="dialog" aria-modal="true" aria-label="Bild löschen?">
        <h4 style="margin-top: 0;">Dieses Bild unwiderruflich löschen?</h4>
        <p>Wenn du dieses Bild löschst, gibt es keinen Weg, es wiederherzustellen.</p>

        <div class="row" >
          <button data-umami-event="Bild löschen Abbruch" class="btn ghost" @click="cancelRemoval()">Abbrechen</button>
          <button data-umami-event="Bild engültig löschen Button" class="btn danger" @click="removeImg(publicIdToRemove)">Bild löschen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useImageUploadStore } from '../../stores/imageStore'; // Adjust path if necessary (e.g. '../stores/imageStore')

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

// Initialize Store
const store = useImageUploadStore();

// Watch for item changes to initialize the store with current images
watch(() => store.images, (newVal, oldVal) => {
  if (!store.uploading && oldVal && newVal.length !== oldVal.length) {
    emit('success');
  }
}, { deep: true });

// Local UI state for the confirmation modal
const showConfirmRemovalModal = ref(false);
const publicIdToRemove = ref('');

// Helper to style the message based on store content
const isSuccessMessage = computed(() => {
  return store.uploadError && store.uploadError.includes('erfolgreich');
});

function confirmRemoval(publicId: string) {
  publicIdToRemove.value = publicId;
  showConfirmRemovalModal.value = true;
}

function cancelRemoval() {
  showConfirmRemovalModal.value = false;
  publicIdToRemove.value = '';
}

function uploadImg() {
  // Trigger upload in Edit Mode (true)
  store.uploadImage(true, props.item.id);
}

async function removeImg(publicId: string) {
  showConfirmRemovalModal.value = false;

  // Find the full image object required by the store
  const imgToRemove = store.images.find(i => i.publicId === publicId);

  if (imgToRemove) {
    await store.removeImg(imgToRemove, props.item.id);
    // Determine success based on store state (optional, or rely on store's internal message)
    if (!store.uploadError || isSuccessMessage.value) {
      emit('success');
    }
  }
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

/* Modal card styling (keeps visual style local) */
.modal {
  width: 100%;
  max-width: 640px;
  padding: 16px;
  border-radius: 16px;
  border:1px solid var(--border);
  background: var(--lbg);
  box-shadow: var(--shadow-l);
}

/* Confirm modal variant */
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
/* Header */
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.modal-head h3 { margin: 0; font-size: 1.05rem; }

/* Section */
.section {
  margin-top: 16px;
}

.section-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text);
}

/* Images grid row */

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
.small { font-size: 12px; color: var(--sub); }
.msg-ok { color: var(--primary); font-weight: 600; }
.msg-error { color: var(--danger); font-weight: 600; }
.images-row {
  flex-wrap: wrap;
}
/* responsive */
@media (max-width: 480px) {
  .img-thumb { width: 88px; flex: 0 0 88px; aspect-ratio: 1 / 1; }
  .modal { padding: 16px; }
}
</style>