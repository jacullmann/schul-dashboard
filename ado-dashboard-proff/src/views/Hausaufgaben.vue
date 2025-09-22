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
        <div style="font-weight:600; font-size:14px;">{{ a.title }}</div>
        <div class="small" style="margin-top:4px;">{{ a.content }}</div>
        <div class="small" style="margin-top:8px; font-style:italic;">— Veröffentlicht von {{ a.createdBy.displayName }} am {{ formatDate(a.createdAt) }}</div>
        <button v-if="user?.isAdmin" class="btn danger" style="position:absolute; top:8px; right:8px; padding:4px 8px; font-size:12px;" @click="confirmDeleteAnnouncement(a._id)">X</button>
      </div>
    </div>

    <div style="display:flex; align-items:center; gap:12px; margin-top:20px;">
      <h3 style="margin:0; flex-grow:1;">Alle Einträge</h3>
      <select class="input" v-model="filterSubject" style="width:120px;">
        <option value="">Alle Fächer</option>
        <option v-for="s in availableSubjects" :key="s" :value="s">{{ s }}</option>
      </select>
      <select class="input" v-model="filterType" style="width:120px;">
        <option value="">Alle Typen</option>
        <option value="hausaufgabe">Hausaufgabe</option>
        <option value="dalton">DALTON</option>
        <option value="klassenarbeit">Klassenarbeit</option>
      </select>
    </div>

    <div class="row" style="gap:12px; margin-top:12px; flex-wrap:wrap;">
      <div v-for="item in filteredItems" :key="item._id" class="card" :style="{ borderColor: colorForItem(item) }" style="width:100%; max-width:420px;">
        <div style="font-weight:600;">{{ item.title }}</div>
        <div class="small" style="margin-top:4px;">
          <div :style="{ color: colorForItem(item) }">Fällig: {{ formatDate(item.dueDate) }}</div>
          <div>Typ: **{{ labelFor(item.type) }}**</div>
          <div>Fach: **{{ item.subject }}**</div>
          <div>Von: **{{ item.createdBy.displayName }}**</div>
        </div>
        <div style="margin-top:8px; font-style:italic; font-size:14px;">{{ item.description }}</div>
        <div v-if="item.images && item.images.length" style="margin-top:12px;">
          <img :src="item.images[0].url" style="width:100%; height:auto; border-radius:8px;" />
        </div>
        <div class="row" style="margin-top:12px; gap:8px;">
          <button class="btn small" @click="editItem(item)">Bearbeiten</button>
          <button class="btn small" @click="showImageFormFor = item">Bilder</button>
          <button v-if="user?.isAdmin || item.createdBy._id === user?._id" class="btn small danger" @click="confirmDeleteItem(item._id)">Löschen</button>
        </div>
      </div>
    </div>

    <div class="row" style="justify-content:center; margin-top:20px; flex-wrap:wrap; gap:12px;">
      <button class="btn" @click="newItem('hausaufgabe')">Neue Hausaufgabe</button>
      <button class="btn" @click="newItem('dalton')">Neuer DALTON-Auftrag</button>
      <button class="btn" @click="newItem('klassenarbeit')">Neue Klassenarbeit</button>
    </div>

    <div v-if="message" :style="{ color: isError ? 'var(--danger)' : 'var(--primary)' }" style="text-align:center; margin-top:16px;">{{ message }}</div>

    <ItemForm v-if="showItemForm" :initial="itemToEdit" :type="newItemType" @close="showItemForm=false" @success="handleSuccess" />
    <AnnouncementForm v-if="showAnnouncementForm" @close="showAnnouncementForm=false" @success="handleSuccess" />
    <ImageForm v-if="showImageFormFor" :item="showImageFormFor" @close="showImageFormFor=null" @success="handleSuccess" />
    <AuthModal v-if="showAuth" @close="showAuth=false" @logged-in="onLoggedIn" />

    <div v-if="showConfirmModal" class="card" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:101;">
      <div class="card" style="width:100%; max-width:420px; text-align:center;">
        <p>{{ confirmMessage }}</p>
        <div class="row" style="margin-top:12px; gap:8px;">
          <button class="btn danger" @click="handleConfirmation(true)">Ja, löschen</button>
          <button class="btn ghost" @click="handleConfirmation(false)">Abbrechen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import relativeTime from 'dayjs/plugin/relativeTime';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.locale('de');
dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);

import hw, { setHwToken, parseJwt } from '../hwApi';
import ItemForm from './ItemForm.vue';
import ImageForm from './ImageForm.vue';
import AnnouncementForm from './AnnouncementForm.vue';
import AuthModal from './AuthModal.vue';

interface HwItem {
  _id: string;
  type: 'hausaufgabe' | 'dalton' | 'klassenarbeit';
  title: string;
  subject: string;
  description: string;
  dueDate: string;
  createdBy: { _id: string; email: string; displayName: string; isAdmin: boolean };
  images: { url: string; publicId: string }[];
}

interface Announcement {
  _id: string;
  title: string;
  content: string;
  color: 'info' | 'warn' | 'danger';
  createdAt: string;
  createdBy: { _id: string; email: string; displayName: string; isAdmin: boolean };
}

interface User {
  _id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
}

const user = ref<User | null>(null);
const announcements = ref<Announcement[]>([]);
const items = ref<HwItem[]>([]);
const loading = ref(true);
const message = ref('');
const isError = ref(false);
const showAuth = ref(false);
const showItemForm = ref(false);
const showAnnouncementForm = ref(false);
const showImageFormFor = ref<HwItem | null>(null);
const newItemType = ref<'hausaufgabe' | 'dalton' | 'klassenarbeit'>('hausaufgabe');
const itemToEdit = ref<HwItem | null>(null);

const filterSubject = ref('');
const filterType = ref('');

const showConfirmModal = ref(false);
const confirmMessage = ref('');
const confirmAction = ref<(() => Promise<void>) | null>(null);

const availableSubjects = computed(() => {
  const subjects = new Set<string>();
  items.value.forEach(item => subjects.add(item.subject));
  return Array.from(subjects).sort();
});

const filteredItems = computed(() => {
  return items.value
      .filter(item => {
        const bySubject = !filterSubject.value || item.subject === filterSubject.value;
        const byType = !filterType.value || item.type === filterType.value;
        return bySubject && byType;
      })
      .sort((a, b) => dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix());
});

function colorFor(type: string): string {
  switch (type) {
    case 'info': return '#3b82f6';
    case 'warn': return '#f59e0b';
    case 'danger': return '#ef4444';
    default: return '#9ca3af';
  }
}

function labelFor(type: string): string {
  switch (type) {
    case 'hausaufgabe': return 'Hausaufgabe';
    case 'dalton': return 'DALTON-Auftrag';
    case 'klassenarbeit': return 'Klassenarbeit';
    default: return '';
  }
}

function colorForItem(item: HwItem): string {
  if (dayjs(item.dueDate).isBefore(dayjs())) {
    return '#ef4444';
  }
  return '#1f2937';
}

function formatDate(date: string): string {
  const d = dayjs(date);
  return d.format('DD.MM.YYYY, HH:mm') + ' (' + d.fromNow() + ')';
}

async function loadMe() {
  try {
    const { data } = await hw.get('/api/auth/me');
    user.value = data;
  } catch (e: any) {
    console.error('Failed to load user info', e.response?.data?.error);
    user.value = null;
  }
}

async function reload() {
  loading.value = true;
  try {
    const [itemsRes, announcementsRes] = await Promise.all([
      hw.get('/api/items'),
      hw.get('/api/announcements')
    ]);
    items.value = itemsRes.data;
    announcements.value = announcementsRes.data;
  } catch (e: any) {
    message.value = e.response?.data?.error || 'Fehler beim Laden der Daten.';
    isError.value = true;
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

function newItem(type: 'hausaufgabe' | 'dalton' | 'klassenarbeit') {
  itemToEdit.value = null;
  newItemType.value = type;
  showItemForm.value = true;
}

function confirmDeleteItem(id: string) {
  confirmMessage.value = 'Soll dieser Eintrag wirklich gelöscht werden?';
  confirmAction.value = async () => {
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
  };
  showConfirmModal.value = true;
}

function confirmDeleteAnnouncement(id: string) {
  confirmMessage.value = 'Soll diese Ankündigung wirklich gelöscht werden?';
  confirmAction.value = async () => {
    loading.value = true;
    try {
      await hw.delete(`/api/announcements/${id}`);
      handleSuccess('Ankündigung erfolgreich gelöscht.');
    } catch (e: any) {
      message.value = e.response?.data?.error || 'Fehler beim Löschen.';
      isError.value = true;
    } finally {
      loading.value = false;
    }
  };
  showConfirmModal.value = true;
}

function handleConfirmation(confirmed: boolean) {
  showConfirmModal.value = false;
  if (confirmed && confirmAction.value) {
    confirmAction.value();
  }
  confirmAction.value = null;
}

onMounted(() => {
  const token = localStorage.getItem('hwToken');
  if (token) {
    setHwToken(token);
    loadMe();
  }
  reload();
});
</script>
