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
        <label style="display:block; font-weight:600;">{{ pretty(k) }}: {{ Math.round(values[k]) }}</label>
        <input step="0.1" type="range" min="1" max="6" v-model.number="values[k]" />
      </div>
    </div>
    <div style="margin-top:12px;">Durchschnitt: <strong>{{ overall.toFixed(2) }}</strong></div>
    <div class="row" style="margin-top:12px; align-items:center;">
      <button data-umami-event="Personen Bewertung absenden" class="btn" type="submit" :disabled="submitting">Absenden</button>
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

const Math = window.Math;

const categories = ['Freundlichkeit','Kompetenz','Puenktlichkeit','Fairness','Erklaeren','Organisation'];
const title = ref(props.prefillTitle || '');
const name = ref(props.prefillName || '');
const values = reactive<Record<string, number>>({
  Freundlichkeit: 3, Kompetenz: 3, Puenktlichkeit: 3, Fairness: 3, Erklaeren: 3, Organisation: 3
});
const overall = computed(() => {
  const arr = categories.map(k => Math.round(values[k]));
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
    error.value = 'Diese Person hast du schon bewertet.';
    return;
  }

  submitting.value = true;
  try {
    const anon = useAnon(); anon.ensure();
    const payload = {
      title: title.value,
      name: toUpperTrim(name.value),
      categories: {
        Freundlichkeit: Math.round(values.Freundlichkeit),
        Kompetenz: Math.round(values.Kompetenz),
        Puenktlichkeit: Math.round(values.Puenktlichkeit),
        Fairness: Math.round(values.Fairness),
        Erklaeren: Math.round(values.Erklaeren),
        Organisation: Math.round(values.Organisation)
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

<style scoped>
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  width: 100%;
  height: 8px;
  margin: 10px 0;
}

input[type="range"]::-ms-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 18px;
  width: 18px;
  background: white;
  border: 1px solid white;
  border-radius: 50%;
  cursor: pointer;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 18px;
  width: 18px;
  background:white;
  border: 1px solid white;
  border-radius: 50%;
  cursor: pointer;
  margin-top: -5px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
  transition: background 0.2s, box-shadow 0.2s;
}


input[type="range"]::-moz-range-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 16px;
  width: 16px;
  background: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
  transition: background 0.2s, box-shadow 0.2s;
}


input[type="range"]::-webkit-slider-thumb:hover {
  background:white;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
}
input[type="range"]::-moz-range-thumb:hover {
  background: white;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
}

input[type="range"]::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px;
  background: #2a947d;
  border-radius: 4px;
  border: none;
}


input[type="range"]::-moz-range-track {
  width: 100%;
  height: 4px;
  background: #2a947d;
  border-radius: 4px;
  border: none;
}


input[type="range"]::-ms-track {
  width: 100%;
  height: 4px;
  background: #2a947d;
  border-radius: 4px;
  border:none;
}
</style>


