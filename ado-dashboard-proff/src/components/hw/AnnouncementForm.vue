<template>
  <div class="card rlc" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:100;">
    <div class="card rlc" style="width:100%; max-width:520px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">Neue Ankündigung</h3>
        <button data-umami-event="Ankündigung erstellen Menü schließen" class="btn ghost" @click="$emit('close')" :disabled="submitting">Schließen</button>
      </div>
      <div style="margin-top:8px;">
        <textarea ref="textareaRef" class="input" rows="4" v-model="content" placeholder="Inhalt"></textarea>
      </div>
      <div style="margin-top:8px;">
        <select class="input hover" v-model="color">
          <option value="info">Info</option>
          <option value="warn">Wichtig</option>
          <option value="danger">Dringend</option>
        </select>
      </div>
      <div style="margin-top:8px;">
        <label style="display:flex; align-items:center; gap:8px; color:var(--text);">
          <input type="checkbox" v-model="showAsPopup" />
          Als Popup anzeigen für alle benutzer
        </label>
      </div>
      <div class="row" style="margin-top:12px; align-items:center;">
        <button data-umami-event="Ankündigung hinzufügen" class="btn" @click="submit" :disabled="submitting">
          <LoadingSpinner v-if="submitting" size="1.1em" />
          <span v-else>Absenden</span>
        </button>
        <div v-if="message" class="small" :style="{ color: isError ? 'var(--danger)': 'var(--primary)' }">{{ message }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import hw from '@/hwApi';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const emit = defineEmits(['close', 'success']);

const textareaRef = ref<HTMLTextAreaElement | null>(null);

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !submitting.value) {
    emit('close');
  }
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !submitting.value) {
    submit();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  textareaRef.value?.focus();
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
});

const content = ref('');
const color = ref('warn');
const showAsPopup = ref(false); // NEU: Popup-Option
const submitting = ref(false);
const message = ref('');
const isError = ref(false);

async function submit() {
  submitting.value = true;
  message.value = '';
  isError.value = false;
  try {
    await hw.post('/api/announcements', {
      content: content.value,
      color: color.value,
      showAsPopup: showAsPopup.value,
    });
    message.value = 'Ankündigung erfolgreich angelegt.';
    isError.value = false;
    emit('success');
  } catch (e: any) {
    message.value = e.response?.data?.error || 'Fehler beim Anlegen.';
    isError.value = true;
  } finally {
    submitting.value = false;
  }
}
</script>