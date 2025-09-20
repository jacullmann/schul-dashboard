<template>
  <div class="card" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center;">
    <div class="card" style="width:100%; max-width:520px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">Neue Ankündigung</h3>
        <button class="btn ghost" @click="$emit('close')">Schließen</button>
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
      <div class="row" style="margin-top:12px;">
        <button class="btn" @click="submit">Anlegen</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import hw from '../../hwApi';

const emit = defineEmits<{ (e:'close'): void; (e:'saved'): void }>();
const title = ref(''); const content = ref(''); const color = ref('warn');

async function submit() {
  await hw.post('/api/announcements', { title: title.value, content: content.value, color: color.value });
  emit('saved'); emit('close');
}
</script>
