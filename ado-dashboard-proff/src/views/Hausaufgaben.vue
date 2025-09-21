<template>
  <div class="card">
    <div class="header-row">
      <div>
        <h2 class="h2">Schultermine & Aufgaben</h2>
        <div class="small">Hausaufgaben, DALTON-Aufträge, Klassenarbeiten</div>
      </div>
      <div class="row" style="gap:8px;">
        <button class="btn ghost" v-if="user" @click="logout" :disabled="busy">Logout ({{ user.email }})</button>
        <button class="btn" v-else @click="showAuth=true">Anmelden/Registrieren</button>
      </div>
    </div>

    <!-- Announcements -->
    <div v-if="announcements.length" class="card announce" :style="{ borderColor:'#f59e0b' }">
      <h3 class="h3">Wichtige Ankündigungen</h3>
      <transition-group name="fade" tag="div">
        <div v-for="a in announcements" :key="a._id" class="card" :style="{ borderColor: colorFor(a.color) }">
          <div class="title-600">{{ a.title }}</div>
          <div class="content-pre">{{ a.content }}</div>
          <div class="small" style="margin-top:6px;">{{ new Date(a.createdAt).toLocaleString() }}</div>
          <div class="row" style="margin-top:8px;" v-if="canManage(a.createdBy)">
            <button class="btn danger" @click="delAnnouncement(a._id)" :disabled="busy">Löschen</button>
          </div>
        </div>
      </transition-group>
      <div v-if="user" class="row" style="margin-top:8px;">
        <button class="btn" @click="openAnnForm=true">Neue Ankündigung</button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="row tabs">
      <div class="badge" :style="tabStyle('HAUSAUFGABE')" @click="switchTab('HAUSAUFGABE')">Hausaufgaben</div>
      <div class="badge" :style="tabStyle('DALTON')" @click="switchTab('DALTON')">DALTON-Aufträge</div>
      <div class="badge" :style="tabStyle('PRUEFUNG')" @click="switchTab('PRUEFUNG')">Klassenarbeiten/Prüfungen</div>
    </div>

    <!-- Smart subject filter -->
    <div class="row" style="margin-top:12px; align-items:center;">
      <div class="col">
        <div class="combo">
          <input class="input" v-model="subjectQuery" placeholder="Fach suchen oder eingeben (z. B. 'Geschichte')" @input="updateSuggestions" />
          <div class="suggestions" v-if="subjectQuery && suggestions.length">
            <div class="suggestion" v-for="s in suggestions" :key="s" @click="chooseSubject(s)">{{ s }}</div>
          </div>
        </div>
      </div>
      <div class="col">
        <button class="btn ghost" v-if="subjectQuery" @click="clearSubject">Filter löschen</button>
      </div>
      <div>
        <button class="btn" v-if="user" @click="openForm=true">Hinzufügen</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid">
      <div v-for="n in 6" :key="n" class="card skeleton"></div>
    </div>

    <!-- Items grid -->
    <div v-else class="grid">
      <transition-group name="fade" tag="div" class="grid">
        <div v-for="it in filteredItems" :key="it.id" class="card item" :style="{ borderColor: colorForTime(it.timeColor) }">
          <div class="item-head">
            <div class="title-600">{{ it.title }}</div>
            <div class="badge">{{ it.subject }}</div>
          </div>
          <div class="small" style="margin-top:6px;">Abgabe: {{ formatDate(it.dueDate) }}</div>
          <div v-if="it.description" class="content-pre" style="margin-top:6px;">{{ it.description }}</div>

          <div class="row imgs" v-if="it.images?.length">
            <img
                v-for="(img, idx) in it.images"
                :key="img.url + idx"
                :src="img.url"
                class="thumb"
                @click="openLightbox(it, idx)"
            />
          </div>

          <div class="row" style="margin-top:8px;">
            <button class="btn warn" @click="openPublicImageModal(it)">Bild hinzufügen</button>
            <button class="btn" v-if="canManage(it.createdBy)" @click="editItem(it)">Bearbeiten</button>
            <button class="btn danger" v-if="canManage(it.createdBy)" @click="deleteItem(it.id)" :disabled="busy">Löschen</button>
          </div>
        </div>
      </transition-group>
    </div>

    <!-- Global overlays -->
    <div v-if="globalBusy" class="overlay">
      <div class="spinner"></div>
    </div>

    <!-- Toasts -->
    <div class="toasts">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">{{ t.message }}</div>
    </div>

    <!-- Modals -->
    <AuthModal v-if="showAuth" @close="showAuth=false" @logged-in="onLoggedIn"/>
    <ItemForm v-if="openForm" :type="tab" :subjects="subjects" @close="openForm=false" @saved="onItemSaved"/>
    <ItemForm v-if="editItemData" :type="tab" :subjects="subjects" :initial="editItemData" @close="editItemData=null" @saved="onItemSaved"/>
    <AnnouncementForm v-if="openAnnForm" @close="openAnnForm=false" @saved="onAnnouncementSaved"/>

    <!-- Public image add modal -->
    <div v-if="imageModalItem" class="modal">
      <div class="modal-card">
        <div class="modal-head">
          <div class="title-600">Bild hinzufügen (öffentlich)</div>
          <button class="btn ghost" @click="imageModalItem=null">Schließen</button>
        </div>
        <div class="small">Jede:r (auch ohne Login) kann Bild-URLs ergänzen. Prüfe bitte, dass die URL ein Bild ist.</div>
        <div class="row" style="margin-top:8px;">
          <input class="input" v-model="imageUrl" placeholder="https://... .jpg/.png/.webp" />
        </div>
        <div class="row" style="margin-top:8px;">
          <input class="input" v-model="contributor" placeholder="Name (optional)" />
        </div>
        <div class="row" style="margin-top:8px;">
          <button class="btn" @click="submitPublicImage" :disabled="busy || !imageUrl">Hinzufügen</button>
          <button class="btn ghost" @click="imageModalItem=null">Abbrechen</button>
        </div>
      </div>
    </div>

    <!-- Lightbox -->
    <div v-if="lightbox.open" class="lightbox" @click.self="closeLightbox">
      <button class="lightbox-btn left" @click.stop="prevImg">‹</button>
      <img :src="currentLightboxUrl" class="lightbox-img" @click.stop />
      <button class="lightbox-btn right" @click.stop="nextImg">›</button>
      <button class="lightbox-close" @click="closeLightbox">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import hw, { setHwToken, loadingCounter } from '../hwApi';
import AuthModal from '../components/hw/AuthModal.vue';
import ItemForm from '../components/hw/ItemForm.vue';
import AnnouncementForm from '../components/hw/AnnouncementForm.vue';

type ItemType = 'HAUSAUFGABE'|'DALTON'|'PRUEFUNG';

const tab = ref<ItemType>('HAUSAUFGABE');
const items = ref<any[]>([]);
const subjects = ref<string[]>([]);
const announcements = ref<any[]>([]);
const loading = ref(false);
const busy = ref(false);
const globalBusy = computed(() => loadingCounter.value > 0);

const user = ref<{ id:string; email:string; isAdmin:boolean } | null>(null);

// Toasts
type Toast = { id:number; message:string; type:'ok'|'err'|'info' };
const toasts = ref<Toast[]>([]);
let toastId = 1;
function toast(message:string, type:Toast['type']='info', ttl=3000) {
  const id = toastId++;
  toasts.value.push({ id, message, type });
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }, ttl);
}

// Subject smart filter
const subjectQuery = ref('');
const suggestions = ref<string[]>([]);
function normalize(s:string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}
function updateSuggestions() {
  const q = normalize(subjectQuery.value.trim());
  if (!q) { suggestions.value = []; return; }
  const list = subjects.value
      .filter(s => normalize(s).includes(q))
      .slice(0, 8);
  suggestions.value = list;
}
function chooseSubject(s:string) {
  subjectQuery.value = s;
  suggestions.value = [];
}
function clearSubject() {
  subjectQuery.value = '';
  suggestions.value = [];
}

const filteredItems = computed(() => {
  const q = normalize(subjectQuery.value.trim());
  if (!q) return items.value;
  return items.value.filter(i => normalize(i.subject).includes(q));
});

function formatDate(d:any) { return new Date(d).toLocaleString(); }
function colorFor(c:string) { return c==='danger' ? '#ef4444' : c==='warn' ? '#f59e0b' : '#22c55e'; }
function colorForTime(c:string) { return c==='danger' ? '#ef4444' : c==='warn' ? '#f59e0b' : '#22c55e'; }

function tabStyle(t:ItemType) {
  const active = tab.value === t;
  return { cursor:'pointer', background: active ? '#0b1220' : '#0b122000', borderColor: active ? '#22c55e' : 'var(--border)' };
}
function switchTab(t:ItemType) {
  if (tab.value === t) return;
  tab.value = t;
  reload();
}

function canManage(createdBy:string) {
  if (!user.value) return false;
  return user.value.isAdmin || user.value.id === createdBy;
}

async function loadMe() {
  try {
    const { data } = await hw.get('/api/auth/me');
    if (data?.ok) user.value = { id: data.id, email: data.email, isAdmin: !!data.isAdmin };
    else user.value = null;
  } catch {
    user.value = null;
  }
}
async function loadSubjects() {
  const { data } = await hw.get('/api/subjects');
  subjects.value = data?.subjects || [];
}
async function loadAnnouncements() {
  const { data } = await hw.get('/api/announcements');
  announcements.value = data?.announcements || [];
}
async function reload() {
  loading.value = true;
  try {
    const { data } = await hw.get('/api/items', { params: { type: tab.value } });
    items.value = data?.items || [];
  } catch (e:any) {
    toast(e?.error || 'Fehler beim Laden', 'err');
  } finally {
    loading.value = false;
  }
}
function onLoggedIn(token:string) {
  setHwToken(token);
  showAuth.value = false;
  // Perceived speed: set minimal user from token email if available in future; for now just load
  loadMe();
  reload();
}
function logout() {
  setHwToken(null);
  user.value = null;
  toast('Abgemeldet', 'ok', 1500);
}

function onItemSaved() {
  openForm.value = false;
  editItemData.value = null;
  toast('Gespeichert', 'ok');
  reload();
}
function onAnnouncementSaved() {
  openAnnForm.value = false;
  toast('Ankündigung erstellt', 'ok');
  loadAnnouncements();
}

// Actions
function editItem(it:any) { editItemData.value = it; }
async function deleteItem(id:string) {
  if (!confirm('Wirklich löschen?')) return;
  busy.value = true;
  try {
    await hw.delete(`/api/items/${id}`);
    toast('Gelöscht', 'ok');
    reload();
  } catch (e:any) {
    toast(e?.error || 'Fehler beim Löschen', 'err', 4000);
  } finally {
    busy.value = false;
  }
}
async function delAnnouncement(id:string) {
  busy.value = true;
  try {
    await hw.delete(`/api/announcements/${id}`);
    toast('Ankündigung gelöscht', 'ok');
    loadAnnouncements();
  } catch (e:any) {
    toast(e?.error || 'Fehler beim Löschen', 'err', 4000);
  } finally {
    busy.value = false;
  }
}

// Public image add
const imageModalItem = ref<any|null>(null);
const imageUrl = ref('');
const contributor = ref('');
function openPublicImageModal(it:any) {
  imageModalItem.value = it;
  imageUrl.value = '';
  contributor.value = '';
}
async function submitPublicImage() {
  if (!imageModalItem.value) return;
  busy.value = true;
  try {
    await hw.post(`/api/items/${imageModalItem.value.id}/images-public`, {
      images: [imageUrl.value],
      contributor: contributor.value || undefined,
    });
    toast('Bild hinzugefügt (nachladen)...', 'ok', 2500);
    imageModalItem.value = null;
    reload();
  } catch (e:any) {
    toast(e?.error || 'Konnte Bild nicht hinzufügen', 'err', 4000);
  } finally {
    busy.value = false;
  }
}

// Lightbox
const lightbox = ref<{ open:boolean; item:any|null; index:number }>({ open:false, item:null, index:0 });
const currentLightboxUrl = computed(() => {
  const it = lightbox.value.item;
  if (!it) return '';
  return it.images?.[lightbox.value.index]?.url || '';
});
function openLightbox(it:any, idx:number) {
  lightbox.value = { open:true, item:it, index:idx };
}
function closeLightbox() {
  lightbox.value.open = false;
}
function prevImg() {
  const it = lightbox.value.item;
  if (!it) return;
  lightbox.value.index = (lightbox.value.index - 1 + it.images.length) % it.images.length;
}
function nextImg() {
  const it = lightbox.value.item;
  if (!it) return;
  lightbox.value.index = (lightbox.value.index + 1) % it.images.length;
}

// UI state
const showAuth = ref(false);
const openForm = ref(false);
const editItemData = ref<any|null>(null);
const openAnnForm = ref(false);

// Faster perceived login on reload
onMounted(async () => {
  // show skeletons immediately
  loading.value = true;
  await Promise.all([loadMe(), loadSubjects(), loadAnnouncements()]);
  await reload();
});

// Keep suggestions updated when subjects change
watch(subjects, updateSuggestions);
</script>

<style scoped>
.header-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.h2 { margin:0; }
.h3 { margin-top:0; }
.title-600 { font-weight:600; }
.content-pre { white-space: pre-wrap; margin-top:6px; }
.announce { background:#1f2937; }

.tabs { margin-top:12px; }

.grid {
  display:grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap:12px;
  margin-top:12px;
}

.item-head { display:flex; justify-content:space-between; align-items:center; gap:8px; }
.imgs { margin-top:8px; flex-wrap:wrap; }
.thumb {
  width:110px; height:78px; object-fit:cover; border-radius:8px; border:1px solid var(--border);
  cursor: zoom-in; transition: transform .15s ease;
}
.thumb:hover { transform: scale(1.02); }

.combo { position:relative; }
.suggestions {
  position:absolute; z-index:10; top:100%; left:0; right:0;
  background:#0b1220; border:1px solid var(--border); border-radius:10px; margin-top:4px; max-height:220px; overflow:auto;
}
.suggestion { padding:8px 10px; cursor:pointer; }
.suggestion:hover { background:#0f1a33; }

.overlay {
  position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
  background:rgba(0,0,0,.25);
}
.spinner {
  width:36px; height:36px; border:3px solid #2a364e; border-top-color: var(--primary);
  border-radius:50%; animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.skeleton {
  height:140px;
  background: linear-gradient(90deg, #0b1220 25%, #0e1628 37%, #0b1220 63%);
  background-size: 400% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}
@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

.toasts {
  position: fixed; bottom: 16px; right: 16px; display:flex; flex-direction:column; gap:8px;
}
.toast {
  padding:10px 12px; border-radius:10px; border:1px solid var(--border); background:#0b1220;
}
.toast.ok { border-color: #22c55e55; }
.toast.err { border-color: #ef444455; }
.toast.info { border-color: #f59e0b55; }

.modal {
  position: fixed; inset:0; background: rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center;
}
.modal-card {
  width: min(560px, 96vw);
  background: linear-gradient(180deg, #0b1220, #0b1220), var(--card);
  border: 1px solid var(--border); border-radius: 12px; padding: 16px;
}
.modal-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }

.lightbox {
  position: fixed; inset:0; background: rgba(0,0,0,.8); display:flex; align-items:center; justify-content:center;
}
.lightbox-img { max-width:90vw; max-height:90vh; border-radius:8px; border:1px solid #222; }
.lightbox-btn {
  position: absolute; top:50%; transform: translateY(-50%);
  background: #0b1220; color:var(--text); border:1px solid var(--border); border-radius: 999px;
  width:38px; height:38px; cursor:pointer; display:flex; align-items:center; justify-content:center;
}
.lightbox-btn.left { left: 16px; }
.lightbox-btn.right { right: 16px; }
.lightbox-close {
  position: absolute; top: 12px; right: 12px; background:#0b1220; border:1px solid var(--border);
  border-radius: 999px; width:36px; height:36px; cursor:pointer; color:var(--text);
}

.fade-enter-active, .fade-leave-active { transition: all .18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(4px); }
</style>
