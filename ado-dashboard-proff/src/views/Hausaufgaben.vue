<template>
  <div class="card">
    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
      <div>
        <h2 style="margin:0;">Schultermine & Aufgaben</h2>
        <div class="small">Hausaufgaben, DALTON-Aufträge, Klassenarbeiten</div>
      </div>
      <div class="row" style="gap:8px;">
        <button class="btn ghost" v-if="user" @click="logout">Logout ({{ user.email }})</button>
        <button class="btn" v-else @click="showAuth = true">Anmelden/Registrieren</button>
      </div>
    </div>

    <div v-if="announcements.length" class="card" style="background:#1f2937; border-color:#f59e0b; margin-top:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">Wichtige Ankündigungen</h3>
        <button v-if="user?.isAdmin" class="btn ghost" style="padding:4px 8px; font-size:14px;" @click="showAnnouncementForm = true">Ankündigung hinzufügen</button>
      </div>
      <div v-for="a in announcements" :key="a._id" class="card" :style="{ borderColor: colorFor(a.color) }" style="margin-top:12px; position:relative;">
        <div style="font-weight:600;">{{ a.title }}</div>
        <div style="white-space: pre-wrap; margin-top:6px;">{{ a.content }}</div>
        <div class="small" style="margin-top:6px;">{{ new Date(a.createdAt).toLocaleString() }}</div>
        <div v-if="canManage(a.createdBy)" class="row" style="margin-top:8px;">
          <button class="btn danger" style="padding:4px 8px; font-size:12px;" @click="deleteAnnouncement(a._id)">Löschen</button>
        </div>
      </div>
    </div>

    <hr v-else />

    <div style="display:flex; gap:8px; margin-bottom:16px; margin-top:16px; flex-wrap:wrap;">
      <button class="btn" :class="{ ghost: tab !== 'HAUSAUFGABE' }" @click="tab = 'HAUSAUFGABE'">Hausaufgaben</button>
      <button class="btn" :class="{ ghost: tab !== 'DALTON' }" @click="tab = 'DALTON'">DALTON</button>
      <button class="btn" :class="{ ghost: tab !== 'PRUEFUNG' }" @click="tab = 'PRUEFUNG'">Prüfungen</button>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
      <div class="row" style="gap:8px; flex-wrap:wrap;">
        <select class="input" style="width:auto;" v-model="subjectFilter">
          <option value="">Alle Fächer</option>
          <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
        </select>
        <button v-if="user" class="btn" @click="showItemForm=true">Eintrag anlegen</button>
        <div v-if="loading" class="row small" style="align-items:center; gap:8px; color:var(--muted)">
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Lade...
        </div>
      </div>
      <div v-if="message" class="small" :style="{ color: isError ? 'var(--danger)': 'var(--primary)' }">{{ message }}</div>
    </div>

    <div style="margin-top:20px;">
      <div v-for="item in filteredItems" :key="item.id" class="card" style="margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
          <div>
            <h3 style="margin:0;">{{ item.title }}</h3>
            <div class="row small" style="margin-top:4px; gap:8px; color:var(--muted)">
              <div class="badge" style="background:#4b5563; color:white;">{{ item.subject }}</div>
              <div class="badge" :style="{ background: colorFor(item.timeColor), color: item.timeColor === 'ok' ? 'white' : 'black' }">
                Fällig: {{ new Date(item.dueDate).toLocaleDateString() }}
              </div>
            </div>
          </div>
          <div class="row" style="gap:8px; align-self:flex-end;">
            <button class="btn ghost" v-if="user" @click="showImageForm(item)">Bilder verwalten</button>
            <button class="btn ghost" v-if="canManage(item.createdBy)" @click="editItem(item)">Bearbeiten</button>
            <button class="btn danger" v-if="canManage(item.createdBy)" @click="deleteItem(item.id)">Löschen</button>
          </div>
        </div>
        <div style="white-space: pre-wrap; margin-top:12px;">{{ item.description }}</div>
        <div v-if="item.images && item.images.length" style="margin-top:12px;">
          <div style="font-weight:600;">Bilder</div>
          <div class="row" style="gap:8px; margin-top:8px;">
            <div v-for="img in item.images" :key="img.publicId" style="max-width:120px; border:1px solid var(--border); border-radius:8px; overflow:hidden;">
              <a :href="img.url" target="_blank">
                <img :src="img.url" style="width:100%; height:auto;" />
              </a>
            </div>
          </div>
        </div>
      </div>
      <div v-if="!loading && !filteredItems.length" class="card">
        Keine Einträge gefunden.
      </div>
    </div>
  </div>

  <AuthModal v-if="showAuth" @close="showAuth=false" @logged-in="onLoggedIn" />
  <ItemForm v-if="showItemForm" :type="tab" :subjects="subjects" :initial="itemToEdit" @close="showItemForm=false" @success="handleSuccess('Eintrag wurde erfolgreich erstellt.')" />
  <AnnouncementForm v-if="showAnnouncementForm" @close="showAnnouncementForm=false" @success="handleSuccess('Ankündigung wurde erfolgreich erstellt.')" />
  <ImageForm v-if="showImageFormFor" :item="showImageFormFor" @close="showImageFormFor=null" @success="handleSuccess('Bilder wurden erfolgreich aktualisiert.')" />
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import AuthModal from '../components/hw/AuthModal.vue';
import ItemForm from '../components/hw/ItemForm.vue';
import AnnouncementForm from '../components/hw/AnnouncementForm.vue';
import ImageForm from '../components/hw/ImageForm.vue'; // new component
import hw, { setHwToken } from '../hwApi';

export interface HwItem {
  id: string;
  type: 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG';
  title: string;
  subject: string;
  description: string;
  images: Array<{ url: string; publicId: string; createdBy: string }>;
  dueDate: string;
  createdBy: string;
  timeColor: string;
}

const showAuth = ref(false);
const showItemForm = ref(false);
const showAnnouncementForm = ref(false);
const showImageFormFor = ref<any>(null);

const user = ref<any>(null);
const tab = ref<'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG'>('HAUSAUFGABE');
const subjects = ref<string[]>([]);
const announcements = ref<any[]>([]);
const items = ref<HwItem[]>([]);
const loading = ref(true);
const subjectFilter = ref('');
const itemToEdit = ref<HwItem | null>(null);

const message = ref('');
const isError = ref(false);

const colorFor = (color: string) => {
  const map = {
    'ok': 'var(--primary)',
    'warn': 'var(--warn)',
    'danger': 'var(--danger)',
    'expired': '#4b5563',
    'info': '#3b82f6',
  };
  return map[color] || 'var(--muted)';
};

const filteredItems = computed(() => {
  if (!subjectFilter.value) return items.value;
  return items.value.filter(i => i.subject.toLowerCase() === subjectFilter.value.toLowerCase());
});

function canManage(createdBy: string) {
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
  try {
    const { data } = await hw.get('/api/items', { params: { type: tab.value } });
    items.value = data;
  } catch (e) {
    console.error('Failed to load items:', e);
  } finally {
    loading.value = false;
  }
}

function handleSuccess(msg: string) {
  message.value = msg;
  isError.value = false;
  setTimeout(() => message.value = '', 5000);
  showItemForm.value = false;
  showAnnouncementForm.value = false;
  showImageFormFor.value = null;
  reload();
}

function onLoggedIn(token: string) {
  setHwToken(token);
  showAuth.value = false;
  loadMe();
  reload();
}

function logout() {
  setHwToken(null);
  user.value = null;
}

function editItem(item: HwItem) {
  itemToEdit.value = item;
  showItemForm.value = true;
}

async function deleteItem(id: string) {
  if (confirm('Soll dieser Eintrag wirklich gelöscht werden?')) {
    loading.value = true;
    try {
      await hw.delete(`/api/items/${id}`);
      handleSuccess('Eintrag erfolgreich gelöscht.');
    } catch (e: any) {
      message.value = e.response?.data?.error || 'Fehler beim Löschen.';
      isError.value = true;
    } finally {
      loading.value = false;
    }
  }
}

async function deleteAnnouncement(id: string) {
  if (confirm('Soll diese Ankündigung wirklich gelöscht werden?')) {
    try {
      await hw.delete(`/api/announcements/${id}`);
      handleSuccess('Ankündigung erfolgreich gelöscht.');
    } catch (e: any) {
      message.value = e.response?.data?.error || 'Fehler beim Löschen.';
      isError.value = true;
    }
  }
}

function showImageForm(item: HwItem) {
  showImageFormFor.value = item;
}

onMounted(() => {
  loadMe();
  loadSubjects();
  loadAnnouncements();
  reload();
});

watch(tab, reload);
</script>