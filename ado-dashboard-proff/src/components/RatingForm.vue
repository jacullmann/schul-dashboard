<template>
  <form @submit.prevent="submit">
    <div class="row">
      <div class="col">
        <label>Anrede</label>
        <select v-model="title" class="input" required>
          <option disabled value="">Bitte wählen</option>
          <option>Herr</option>
          <option>Frau</option>
        </select>
      </div>
      <div class="col">
        <label>NAME (GROSSBUCHSTABEN)</label>
        <input class="input" v-model="name" placeholder="Z. B. MEIER" required />
      </div>
    </div>
    <hr />
    <div class="row">
      <div class="col" v-for="k in categories" :key="k">
        <label style="display:block; font-weight:600;">{{ pretty(k) }}: {{ values[k] }}</label>
        <input type="range" min="1" max="6" v-model.number="values[k]" />
      </div>
    </div>
    <div style="margin-top:12px;">Durchschnitt: <strong>{{ overall.toFixed(2) }}</strong></div>
    <div class="row" style="margin-top:12px; align-items:center;">
      <button class="btn" type="submit" :disabled="submitting">Absenden</button>
      <div v-if="error" class="small" style="color:var(--danger)">{{ error }}</div>
      <div v-if="ok" class="small" style="color:var(--primary)">Gespeichert</div>
    </div>
  </form>
</template>


<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from 'vue';
import api from '../api';
import { useAnon } from '../store/useAnon';

const props = defineProps<{ prefillTitle?: string; prefillName?: string }>();
const emit = defineEmits<{ (e:'saved'): void }>();

const categories = ['Freundlichkeit','Kompetenz','Puenktlichkeit','Fairness','Erklaeren','Organisation'];
const title = ref(props.prefillTitle || '');
const name = ref(props.prefillName || '');
const values = reactive<Record<string, number>>({
  Freundlichkeit: 3, Kompetenz: 3, Puenktlichkeit: 3, Fairness: 3, Erklaeren: 3, Organisation: 3
});
const overall = computed(() => {
  const arr = categories.map(k => values[k]);
  return arr.reduce((a,b)=>a+b,0)/arr.length;
});
const submitting = ref(false);
const error = ref('');
const ok = ref(false);

watchEffect(() => {
  if (props.prefillTitle) title.value = props.prefillTitle;
  if (props.prefillName) name.value = props.prefillName;
});

function toUpperTrim(s: string) {
  return s.trim().replace(/\s+/g, ' ').toUpperCase();
}
function pretty(k: string) {
  return k === 'Puenktlichkeit' ? 'Pünktlichkeit' : k === 'Erklaeren' ? 'Erklären' : k;
}

// Hilfsfunktion: Prüfen ob schon bewertet
function hasRecentRating(personKey: string): boolean {
  const item = localStorage.getItem('rated_' + personKey);
  if (!item) return false;
  const lastTime = parseInt(item, 10);
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  return now - lastTime < oneDay;
}
function saveRatingTimestamp(personKey: string) {
  localStorage.setItem('rated_' + personKey, String(Date.now()));
}

async function submit() {
  error.value = '';
  ok.value = false;

  const personKey = toUpperTrim(title.value + '_' + name.value);
  if (hasRecentRating(personKey)) {
    error.value = 'Diese Person hast du schon bewertet. Bitte warte 1 Tag.';
    return;
  }

  submitting.value = true;
  try {
    const anon = useAnon(); anon.ensure();
    const payload = {
      title: title.value,
      name: toUpperTrim(name.value),
      categories: {
        Freundlichkeit: values.Freundlichkeit,
        Kompetenz: values.Kompetenz,
        Puenktlichkeit: values.Puenktlichkeit,
        Fairness: values.Fairness,
        Erklaeren: values.Erklaeren,
        Organisation: values.Organisation
      },
      anonUserId: anon.id
    };
    await api.post('/api/ratings', payload);
    saveRatingTimestamp(personKey);
    ok.value = true;
    emit('saved');
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Fehler beim Speichern';
  } finally {
    submitting.value = false;
    setTimeout(() => ok.value = false, 2000);
  }
}
</script>


