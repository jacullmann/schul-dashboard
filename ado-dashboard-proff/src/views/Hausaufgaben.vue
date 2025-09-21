<template>
  <div class="card">
    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
      <div>
        <h2 style="margin:0;">Schultermine & Aufgaben</h2>
        <div class="small">Hausaufgaben, DALTON-Aufträge, Klassenarbeiten</div>
      </div>
      <div class="row" style="gap:8px;">
        <button class="btn ghost" v-if="user" @click="logout">Logout ({{ user.email }})</button>
        <button class="btn" v-else @click="showAuth=true">Anmelden/Registrieren</button>
      </div>
    </div>

    <div v-if="announcements.length" class="card" :style="{ background:'#1f2937', borderColor:'#f59e0b' }">
      <h3 style="margin-top:0;">Wichtige Ankündigungen</h3>
      <div v-for="a in announcements" :key="a._id" class="card" :style="{ borderColor: colorFor(a.color) }">
        <div style="font-weight:600;">{{ a.title }}</div>
        <div style="white-space: pre-wrap; margin-top:6px;">{{ a.content }}</div>
        <div class="small" style="margin-top:6px;">{{ new Date(a.createdAt).toLocaleString() }}</div>
        <div v-if="canManage(a.createdBy)" class="row" style="margin-top:8px;">
          <button class="btn danger" @click="delAnnouncement(a._id)">Löschen</button>
        </div>
      </div>
      <div v-if="user" class="row" style="margin-top:8px;">
        <button class="btn" @click="openAnnForm=true">Neue Ankündigung</button>
      </div>
    </div>

    <div class="row" style="margin-top:12px;">
      <div class="badge" :style="tabStyle('HAUSAUFGABE')" @click="switchTab('HAUSAUFGABE')">Hausaufgaben</div>
      <div class="badge" :style="tabStyle('DALTON')" @click="switchTab('DALTON')">DALTON-Aufträge</div>
      <div class="badge" :style="tabStyle('PRUEFUNG')" @click="switchTab('PRUEFUNG')">Klassenarbeiten/Prüfungen</div>
    </div>
    <!--<div class="row" style="margin-top:12px;">
      <div class="badge"  @click="switchTab('HAUSAUFGABE')">Hausaufgaben</div>
      <div class="badge"  @click="switchTab('DALTON')">DALTON-Aufträge</div>
      <div class="badge"  @click="switchTab('PRUEFUNG')">Klassenarbeiten/Prüfungen</div>
    </div>-->

    <div class="row" style="margin-top:12px; align-items:center;">
      <div class="col">
        <select class="input" v-model="subjectFilter">
          <option value="">Alle Fächer</option>
          <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
          <option value="__OTHER__">Anderes Fach...</option>
        </select>
      </div>
      <div class="col" v-if="subjectFilter==='__OTHER__'">
        <input class="input" v-model="customSubject" placeholder="Eigenes Fach eintragen" />
      </div>
      <div>
        <button class="btn" v-if="user" @click="openForm=true">Hinzufügen</button>
      </div>
    </div>

    <div v-if="loading" class="small">Lade...</div>
    <div v-else class="row" style="margin-top:12px;">
      <div v-for="it in filteredItems" :key="it.id" class="col">
        <div class="card" :style="{ borderColor: colorForTime(it.timeColor) }">
          <div style="display:flex; justify-content:space-between;">
            <div style="font-weight:600;">{{ it.title }}</div>
            <div class="badge">{{ it.subject }}</div>
          </div>
          <div class="small" style="margin-top:6px;">Abgabe: {{ formatDate(it.dueDate) }}</div>
          <div v-if="it.description" style="margin-top:6px; white-space: pre-wrap;">{{ it.description }}</div>
          <div class="row" style="margin-top:8px; flex-wrap:wrap;" v-if="it.images?.length">
            <img v-for="img in it.images" :key="img.url" :src="img.url" style="width:100px; height:70px; object-fit:cover; border-radius:8px; border:1px solid var(--border);" />
          </div>
          <div class="row" style="margin-top:8px;" v-if="canManage(it.createdBy)">
            <button class="btn" @click="editItem(it)">Bearbeiten</button>
            <button class="btn danger" @click="deleteItem(it.id)">Löschen</button>
          </div>
        </div>
      </div>
    </div>

    <AuthModal v-if="showAuth" @close="showAuth=false" @logged-in="onLoggedIn"/>
    <ItemForm v-if="openForm" :type="tab" :subjects="subjects" @close="openForm=false" @saved="reload"/>
    <ItemForm v-if="editItemData" :type="tab" :subjects="subjects" :initial="editItemData" @close="editItemData=null" @saved="reload"/>
    <AnnouncementForm v-if="openAnnForm" @close="openAnnForm=false" @saved="loadAnnouncements"/>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import hw, { setHwToken } from '../hwApi';
import AuthModal from '../components/hw/AuthModal.vue';
import ItemForm from '../components/hw/ItemForm.vue';
import AnnouncementForm from '../components/hw/AnnouncementForm.vue';

type ItemType = 'HAUSAUFGABE'|'DALTON'|'PRUEFUNG';

const tab = ref<ItemType>('HAUSAUFGABE');
const items = ref<any[]>([]);
const subjects = ref<string[]>([]);
const announcements = ref<any[]>([]);
const subjectFilter = ref('');
const customSubject = ref('');
const loading = ref(false);

const user = ref<{ id:string; email:string; isAdmin:boolean } | null>(null);

const showAuth = ref(false);
const openForm = ref(false);
const editItemData = ref<any|null>(null);
const openAnnForm = ref(false);

function formatDate(d:any) { return new Date(d).toLocaleString(); }
function colorFor(c:string) { return c==='danger' ? '#ef4444' : c==='warn' ? '#f59e0b' : '#22c55e'; }
function colorForTime(c:string) { return c==='danger' ? '#ef4444' : c==='warn' ? '#f59e0b' : '#22c55e'; }

function tabStyle(t:ItemType) {
  const active = tab.value === t;
  return { cursor:'pointer', color: active ? 'white' : '#b0b0b0', borderColor: active ? '#22c55e' : 'var(--border)' };
}
function switchTab(t:ItemType) {
  tab.value = t; reload();
}

const filteredItems = computed(() => {
  const sel = subjectFilter.value === '__OTHER__' ? customSubject.value.trim() : subjectFilter.value;
  return items.value.filter(i => !sel || i.subject.toLowerCase() === sel.toLowerCase());
});

function canManage(createdBy:string) {
  if (!user.value) return false;
  return user.value.isAdmin || user.value.id === createdBy;
}
async function loadMe() {
  try {
    const { data } = await hw.get('/api/auth/me');
    user.value = data;
  } catch {
    user.value = null;
  }
}
async function loadSubjects() {
  const { data } = await hw.get('/api/subjects');
  subjects.value = data;
}
async function loadAnnouncements() {
  const { data } = await hw.get('/api/announcements');
  announcements.value = data;
}
async function reload() {
  loading.value = true;
  const { data } = await hw.get('/api/items', { params: { type: tab.value } });
  items.value = data;
  loading.value = false;
}
function onLoggedIn(token:string) {
  setHwToken(token);
  showAuth.value = false;
  loadMe();
  reload();
}
function logout() {
  setHwToken(null);
  user.value = null;
}

function editItem(it:any) { editItemData.value = it; }
async function deleteItem(id:string) {
  await hw.delete(`/api/items/${id}`);
  reload();
}
async function delAnnouncement(id:string) {
  await hw.delete(`/api/announcements/${id}`);
  loadAnnouncements();
}

onMounted(async () => {
  await Promise.all([loadMe(), loadSubjects(), loadAnnouncements()]);
  reload();
});
</script>
