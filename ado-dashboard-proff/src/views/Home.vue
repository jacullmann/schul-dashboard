<template>
  <div class="row">
    <div class="col">
      <div class="card">
        <h2 style="margin-top:0;">Personen</h2>
        <div class="row">
          <div class="col"><input class="input" v-model="q" placeholder="Suche nach NAME"/></div>
          <div class="col">
            <select v-model="title" class="input">
              <option value="">Alle Anreden</option>
              <option>Herr</option>
              <option>Frau</option>
            </select>
          </div>
          <div class="col">
            <select v-model="sort" class="input">
              <option value="name">Sortierung: Name</option>
              <option value="avg">Sortierung: Durchschnitt</option>
              <option value="count">Sortierung: Anzahl</option>
            </select>
          </div>
          <div><button data-umami-event="Benoten Seite Filter aktualisieren" class="btn" @click="load">Aktualisieren</button></div>
        </div>
        <hr />
        <div v-if="loading">Lade...</div>
        <div v-else class="row">
          <div v-for="p in persons" :key="p.id" class="col">
            <div class="card">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-weight:600;">{{ p.title }} {{ p.nameUpper }}</div>
                <div class="badge">{{ p.ratingsCount }} Bewertungen</div>
              </div>
              <div style="margin-top:6px;">Durchschnitt: <strong>{{ p.avgOverall.toFixed(2) }}</strong></div>
              <div style="margin-top:12px;">
                <router-link  class="btn ghost" :to="`/person/${p.id}`">Details</router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="col">
      <div class="card">
        <h2 style="margin-top:0;">Neue Bewertung</h2>
        <RatingForm @saved="onSaved" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../api';
import RatingForm from '../components/RatingForm.vue';

const q = ref('');
const title = ref('');
const sort = ref('name');
const persons = ref<any[]>([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  const { data } = await api.get('/api/persons', { params: { q: q.value, title: title.value || undefined, sort: sort.value } });
  persons.value = data;
  loading.value = false;
}
function onSaved() {
  load();
}
onMounted(load);
</script>
