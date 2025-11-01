<template>
  <div class="row">
    <div class="col">
      <div class="card" v-if="person">
        <h2 style="margin-top:0;">{{ person.title }} {{ person.nameUpper }}</h2>
        <div class="row">
          <div class="col"><div class="badge">Bewertungen: {{ person.ratingsCount }}</div></div>
          <div class="col"><div class="badge">Durchschnitt gesamt: {{ person.avgOverall?.toFixed(2) }}</div></div>
        </div>
        <hr />
        <div class="row">
          <div v-for="k in categories" :key="k" class="col">
            <div class="card">
              <div style="font-weight:600;">{{ pretty(k) }}</div>
              <div style="font-size:22px; margin-top:6px;">{{ person.categoryAverages?.[k]?.toFixed(2) ?? '—' }}</div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="card">Lade...</div>

      <div class="card" style="margin-top:16px;">
        <h3 style="margin-top:0;">Neue Bewertung</h3>
        <RatingForm :prefillTitle="person?.title" :prefillName="person?.nameUpper" @saved="reload" />
      </div>
    </div>

    <!--<div class="col">
      <div class="card">
        <h2 style="margin-top:0;">Chat</h2>
        <ChatBox v-if="person" :personId="id" />
      </div>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import api from '../api';
//import ChatBox from '../components/ChatBox.vue';
import RatingForm from '../components/RatingForm.vue';

const props = defineProps<{ id: string }>();
const person = ref<any>(null);
const categories = ['Freundlichkeit','Kompetenz','Puenktlichkeit','Fairness','Erklaeren','Organisation'];

async function load() {
  const { data } = await api.get(`/api/persons/${props.id}`);
  person.value = data;
}
function reload() { load(); }
function pretty(k: string) {
  return k === 'Puenktlichkeit' ? 'Pünktlichkeit' : k === 'Erklaeren' ? 'Erklären' : k;
}
onMounted(load);
watch(() => props.id, load);
</script>