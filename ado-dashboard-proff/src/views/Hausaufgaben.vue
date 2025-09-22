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
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <h4 style="margin:0; flex-grow:1;">{{ a.title }}</h4>
          <button v-if="user?.isAdmin" class="btn danger" style="padding:4px 8px; font-size:12px;" @click="confirmDelete('announcement', a._id)">X</button>
        </div>
        <p style="margin-top:8px;">{{ a.content }}</p>
      </div>
    </div>

    <div class="card" style="margin-top:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">Alle Einträge</h3>
        <button class="btn" v-if="user" @click="showItemForm = true">Neuer Eintrag</button>
      </div>
      <div v-if="loading" class="row" style="margin-top:20px;">
        <div class="dot-spinner">
          <div v-for="i in 9" :key="i" class="dot"></div>
        </div>
      </div>
      <div v-else-if="items.length" class="grid" style="margin-top:20px;">
        <div v-for="item in items" :key="item._id" class="item-card">
          <div style="position:relative;">
            <div class="item-card-inner">
              <div style="position:absolute; inset:0; z-index:1; display:flex; flex-direction:column; justify-content:space-between; padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <span class="badge" :style="{ background: colorFor(item.type) }">{{ item.type }}</span>
                  <div class="row" v-if="user && (user.isAdmin || user._id === item.createdBy)">
                    <button class="btn ghost" style="padding:4px; margin-right:4px;" @click="editItem(item)"><svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>
                    <button class="btn ghost danger" style="padding:4px;" @click="confirmDelete('item', item._id)"><svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></button>
                  </div>
                </div>
                <div>
                  <h4 style="color:#fff; text-shadow:1px 1px 2px #000; margin-bottom:4px;">{{ item.title }}</h4>
                  <div class="small" style="color:#fff; text-shadow:1px 1px 2px #000;">{{ item.subject }} - bis {{ new Date(item.dueDate).toLocaleDateString() }}</div>
                </div>
              </div>
              <div class="absolute inset-0 z-0">
                <img v-if="item.images && item.images.length > 0" :src="item.images[0].url" style="width:100%; height:100%; object-fit:cover; filter:brightness(0.5); border-radius:12px;" />
              </div>
            </div>
            <div class="overlay-row">
              <button class="btn primary" @click="showImageFormFor = item">Bilder verwalten</button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="card" style="margin-top:20px; text-align:center;">
        <div class="small">Keine Einträge gefunden.</div>
      </div>
    </div>

    <teleport to="body">
      <AuthModal v-if="showAuth" @close="showAuth = false" @logged-in="onLoggedIn" />
      <ItemForm v-if="showItemForm" @close="showItemForm = false" @success="handleSuccess" :initial="itemToEdit" :type="selectedType" />
      <AnnouncementForm v-if="showAnnouncementForm" @close="showAnnouncementForm = false" @success="handleSuccess" />
      <ImageForm v-if="showImageFormFor" :item="showImageFormFor" @close="showImageFormFor = null" @success="handleSuccess" />
      <div v-if="showConfirmDelete" class="card" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:200;">
        <div class="card" style="width:100%; max-width:400px; text-align:center;">
          <h4 style="margin:0;">Sicher?</h4>
          <p style="margin-top:12px;">Möchtest du diesen Eintrag wirklich löschen?</p>
          <div class="row" style="justify-content:center; gap:12px; margin-top:16px;">
            <button class="btn danger" @click="proceedDelete()">Ja, löschen</button>
            <button class="btn ghost" @click="cancelDelete()">Abbrechen</button>
          </div>
        </div>
      </div>
    </teleport>

    <div v-if="message" class="toast-message" :class="{ 'toast-error': isError }">
      {{ message }}
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import AuthModal from './AuthModal.vue';
import ItemForm from './ItemForm.vue';
import AnnouncementForm from './AnnouncementForm.vue';
import ImageForm from './ImageForm.vue';
import hw, { setHwToken } from '../hwApi';
import { useRouter } from 'vue-router';

const router = useRouter();

interface HwItem {
  _id: string;
  type: string;
  title: string;
  subject: string;
  description: string;
  images: Array<{ url: string; publicId: string }>;
  dueDate: string;
  createdBy: string;
}

interface User {
  _id: string;
  email: string;
  isAdmin: boolean;
}

interface Announcement {
  _id: string;
  title: string;
  content: string;
  color: string;
}

const loading = ref(true);
const user = ref<User | null>(null);
const items = ref<HwItem[]>([]);
const announcements = ref<Announcement[]>([]);
const showAuth = ref(false);
const showItemForm = ref(false);
const itemToEdit = ref<HwItem | null>(null);
const showAnnouncementForm = ref(false);
const showImageFormFor = ref<HwItem | null>(null);
const message = ref('');
const isError = ref(false);
const selectedType = ref('');

// Custom Confirmation Modal State
const showConfirmDelete = ref(false);
const deleteAction = ref<{ type: 'item' | 'announcement', id: string } | null>(null);

function confirmDelete(type: 'item' | 'announcement', id: string) {
  deleteAction.value = { type, id };
  showConfirmDelete.value = true;
}

async function proceedDelete() {
  if (deleteAction.value) {
    if (deleteAction.value.type === 'item') {
      await deleteItem(deleteAction.value.id);
    } else {
      await deleteAnnouncement(deleteAction.value.id);
    }
  }
  showConfirmDelete.value = false;
  deleteAction.value = null;
}

function cancelDelete() {
  showConfirmDelete.value = false;
  deleteAction.value = null;
}

function labelFor(type: string): string {
  switch (type) {
    case 'Hausaufgaben': return 'Hausaufgaben';
    case 'Klassenarbeiten': return 'Klassenarbeit';
    case 'Dalton-Auftrag': return 'DALTON-Auftrag';
    default: return type;
  }
}

function colorFor(type: string): string {
  switch (type) {
    case 'Hausaufgaben': return '#10b981';
    case 'Klassenarbeiten': return '#ef4444';
    case 'Dalton-Auftrag': return '#3b82f6';
    case 'info': return '#3b82f6';
    case 'warn': return '#f59e0b';
    case 'danger': return '#ef4444';
    default: return '#6b7280';
  }
}

async function loadMe() {
  try {
    const { data } = await hw.get('/api/auth/me');
    user.value = data.user;
  } catch (e: any) {
    if (e.response?.status === 401) {
      user.value = null;
      setHwToken(null);
    } else {
      message.value = e.response?.data?.error || 'Fehler beim Laden des Benutzers.';
      isError.value = true;
    }
  }
}

async function reload() {
  loading.value = true;
  message.value = '';
  isError.value = false;
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
  message.value = msg || 'Aktion erfolgreich.';
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

async function deleteAnnouncement(id: string) {
  try {
    await hw.delete(`/api/announcements/${id}`);
    handleSuccess('Ankündigung erfolgreich gelöscht.');
  } catch (e: any) {
    message.value = e.response?.data?.error || 'Fehler beim Löschen.';
    isError.value = true;
  }
}

onMounted(() => {
  loadMe();
  reload();
});

</script>

<style scoped>
.item-card {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  background-color: var(--card-bg);
  border: 1px solid var(--border);
}

.item-card-inner {
  height: 250px;
  width: 100%;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
}

.grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.badge {
  color: #fff;
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
}

.row {
  display: flex;
  align-items: center;
}

.overlay-row {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  display: flex;
  justify-content: center;
  z-index: 10;
}
.toast-message {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: var(--primary);
  color: #fff;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  animation: fade-in-up 0.5s ease-out;
}
.toast-error {
  background-color: var(--danger);
}
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dot-spinner {
  --uib-size: 2.8rem;
  --uib-speed: 1s;
  --uib-color: var(--primary);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: var(--uib-size);
  width: var(--uib-size);
}

.dot-spinner__dot {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: 100%;
  width: 100%;
}

.dot-spinner__dot::before {
  content: '';
  height: 20%;
  width: 20%;
  border-radius: 50%;
  background-color: var(--uib-color);
  transform: scale(0);
  opacity: 0.5;
  animation: pulse0112 calc(var(--uib-speed) * 1.11) ease-in-out infinite;
  box-shadow: 0 0 20px rgba(18, 31, 53, 0.3);
}

.dot-spinner__dot:nth-child(2) {
  transform: rotate(45deg);
}

.dot-spinner__dot:nth-child(2)::before {
  animation-delay: calc(var(--uib-speed) * -0.89);
}

.dot-spinner__dot:nth-child(3) {
  transform: rotate(90deg);
}

.dot-spinner__dot:nth-child(3)::before {
  animation-delay: calc(var(--uib-speed) * -0.78);
}

.dot-spinner__dot:nth-child(4) {
  transform: rotate(135deg);
}

.dot-spinner__dot:nth-child(4)::before {
  animation-delay: calc(var(--uib-speed) * -0.67);
}

.dot-spinner__dot:nth-child(5) {
  transform: rotate(180deg);
}

.dot-spinner__dot:nth-child(5)::before {
  animation-delay: calc(var(--uib-speed) * -0.56);
}

.dot-spinner__dot:nth-child(6) {
  transform: rotate(225deg);
}

.dot-spinner__dot:nth-child(6)::before {
  animation-delay: calc(var(--uib-speed) * -0.45);
}

.dot-spinner__dot:nth-child(7) {
  transform: rotate(270deg);
}

.dot-spinner__dot:nth-child(7)::before {
  animation-delay: calc(var(--uib-speed) * -0.34);
}

.dot-spinner__dot:nth-child(8) {
  transform: rotate(315deg);
}

.dot-spinner__dot:nth-child(8)::before {
  animation-delay: calc(var(--uib-speed) * -0.23);
}

@keyframes pulse0112 {
  0%,
  100% {
    transform: scale(0);
    opacity: 0.5;
  }

  50% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
