<template>
  <div class="card" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:100;">
    <div class="card" style="width:100%; max-width:520px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">Neue Ankündigung</h3>
        <button data-umami-event="Ankündigung erstellen Menü schließen" class="btn ghost" @click="$emit('close')" :disabled="submitting">Schließen</button>
      </div>
      <div style="margin-top:8px;">
        <input class="input" v-model="title" placeholder="Titel" />
      </div>
      <div style="margin-top:8px;">
        <textarea class="input" rows="4" v-model="content" placeholder="Inhalt"></textarea>
      </div>
      <div style="margin-top:8px;">
        <select class="input" v-model="color">
          <option value="info">Info</option>
          <option value="warn">Wichtig</option>
          <option value="danger">Dringend</option>
        </select>
      </div>
      <div class="row" style="margin-top:12px; align-items:center;">
        <button data-umami-event="Ankündigung hinzufügen" class="btn" @click="submit" :disabled="submitting">
          <svg v-if="submitting" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Anlegen
        </button>
        <div v-if="message" class="small" :style="{ color: isError ? 'var(--danger)': 'var(--primary)' }">{{ message }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import hw from '../../hwApi';

const emit = defineEmits(['close', 'success']);

const title = ref('');
const content = ref('');
const color = ref('warn');
const submitting = ref(false);
const message = ref('');
const isError = ref(false);

async function submit() {
  submitting.value = true;
  message.value = '';
  isError.value = false;
  try {
    await hw.post('/api/announcements', {
      title: title.value,
      content: content.value,
      color: color.value,
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

