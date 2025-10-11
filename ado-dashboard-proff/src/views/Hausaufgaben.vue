<template>
  <div class="card">
    <div class="hw-header">
      <div>
        <h2>Dashboard</h2>
        <div style="color: #f1f1f1" class="small">Arbeite kollaborativ mit anderen und behalte alle Aufgaben im Blick.</div>
      </div>

      <div class="row header-actions">
        <button class="btn ghost" v-if="user" @click="logout">Logout ({{ user.email }})</button>
        <AccountMenu v-if="user" :email="user.email" @deleted="onAccountDeleted" @error="onAccountDeleteError" />
        <button class="btn" v-else @click="showAuth = true">Anmelden/Registrieren</button>
      </div>
    </div>

    <div class="announcements">
      <div class="announcements-head">
        <h3 v-if="announcements.length">Wichtige Ankündigungen</h3>
        <button
            v-if="user?.isAdmin"
            class="btn ghost small-btn"
            @click="showAnnouncementForm = true"
            v-ga-event="{ name: 'add_announcement', params: { method: 'admin_button', label: 'p_b' } }"
        >
          Ankündigung hinzufügen
        </button>
      </div>

      <div v-if="announcements.length" class="ann-list">
        <div v-for="a in announcements" :key="a._id" class="ann" :style="{ borderColor: colorFor(a.color) }">
          <div class="ann-title">{{ a.title }}</div>
          <div class="ann-content">{{ a.content }}</div>
          <div class="small ann-date">{{ new Date(a.createdAt).toLocaleString() }}</div>
          <div v-if="canManage(a.createdBy)" class="ann-actions">
            <button class="btn danger tiny" @click="deleteAnnouncement(a._id)">Löschen</button>
          </div>
        </div>
      </div>

      <hr v-else-if="!announcements.length" />
    </div>

    <div class="tabs-row">
      <button class="btn" :class="{ ghost: tab !== 'HAUSAUFGABE' }" @click="goTab('HAUSAUFGABE')">Hausaufgaben</button>
      <button class="btn" :class="{ ghost: tab !== 'DALTON' }" @click="goTab('DALTON')">Dalton</button>
      <button class="btn" :class="{ ghost: tab !== 'PRUEFUNG' }" @click="goTab('PRUEFUNG')">Prüfungen</button>
    </div>

    <div class="controls">
      <div class="left">
        <select class="input select-subject" v-model="subjectFilter">
          <option value="">Alle Fächer</option>
          <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
        </select>

        <button v-if="user" v-ga-event="{ name: 'add_homework_dalton_exam', params: { method: 'siegma_button', label: 'hero_cta' } }" class="btn" @click="openCreateForm">Eintrag anlegen</button>

        <div v-if="loading" class="loader">
          <div class="spinner" aria-hidden></div>
          <div>Lade...</div>
        </div>
      </div>

      <div v-if="message" class="small message" :class="{ error: isError }">{{ message }}</div>
    </div>

    <div class="items">
      <div
          v-for="item in limitedItems"
          :key="item.id"
          class="item-card"
          :class="{ collapsed: isChecked(item.id) }"
      >
        <div class="item-main">
          <div class="item-meta">
            <div style="display:flex; align-items:center; gap:8px;">
              <label class="collapse-checkbox" v-if="user">
                <input type="checkbox" :checked="isChecked(item.id)" @change="toggleCheck(item)" />
                <span class="vis-label"></span>
              </label>

              <h3 class="item-title" :title="item.title">{{ item.title }}</h3>
            </div>

            <div class="row item-badges" v-show="!isChecked(item.id)">
              <div class="badge subject-badge">{{ item.subject }}</div>
              <div class="badge time-badge" :style="{ background: colorFor(item.timeColor), color: item.timeColor === 'ok' ? 'white' : 'black' }">
                Fällig: {{ new Date(item.dueDate).toLocaleDateString() }}
              </div>
            </div>
          </div>

          <div
              class="item-menu-trigger"
              role="button"
              tabindex="0"
              @click.stop="toggleMenu(item.id)"
              @keydown.enter.prevent="toggleMenu(item.id)"
              @keydown.space.prevent="toggleMenu(item.id)"
              :aria-expanded="openMenuId === item.id ? 'true' : 'false'"
          >
            •••
          </div>

          <div class="item-menu" :class="{ open: openMenuId === item.id }" @click.stop>
            <button class="menu-btn" v-if="user" @click="onMenuAction('images', item)">Bilder verwalten</button>
            <button class="menu-btn" v-if="canManage(item.createdBy)" @click="onMenuAction('edit', item)">Bearbeiten</button>
            <button class="menu-btn danger" v-if="canManage(item.createdBy)" @click="onMenuAction('delete', item)">Löschen</button>
            <button class="menu-btn warn" title="Melden" @click="onMenuAction('report', item)">Melden</button>
          </div>
        </div>

        <transition name="collapse">
          <div v-show="!isChecked(item.id)" class="item-body">
            <span v-if="!isExpanded(item.id)">
              {{ item.description.slice(0, 200) }}
              <span v-if="item.description.length > 200">…</span>
            </span>
            <span v-else>
              {{ item.description }}
            </span>
            <button
                v-if="item.description.length > 200"
                class="btn tiny ghost"
                @click="toggleDescription(item.id)"
                style="margin-left:8px;"
            >
              {{ isExpanded(item.id) ? 'Weniger anzeigen' : 'Alles anzeigen' }}
            </button>
          </div>
        </transition>

        <transition name="collapse">
          <div v-if="item.images && item.images.length && !isChecked(item.id)" class="item-images">
            <div class="images-title">Bilder</div>
            <div class="images-row">
              <div
                  v-for="img in item.images"
                  :key="img.publicId"
                  class="thumb"
              >
                <a :href="img.url" target="_blank" rel="noopener">
                  <img :src="img.thumbUrl || makeThumb(img.url)" :alt="item.title" loading="lazy" decoding="async" />
                </a>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <div v-if="!loading && !limitedItems.length && filteredItems.length" class="card empty">
        Keine Einträge in der aktuellen Ansicht.
      </div>
      <div v-if="!loading && !filteredItems.length" class="card empty">
        Keine Einträge gefunden.
      </div>

      <div v-if="filteredItems.length > 5" class="pagination-actions">
        <button
            v-if="visibleCount < filteredItems.length"
            class="btn ghost shm"
            @click="showMore"
        >
          Mehr anzeigen
        </button>
        <button
            v-if="visibleCount > 5"
            class="btn ghost shm"
            @click="showLess"
        >
          Weniger anzeigen
        </button>
      </div>
    </div>

    <AuthModal v-if="showAuth" @close="showAuth=false" @logged-in="onLoggedIn" />
    <ItemForm
        v-if="showItemForm"
        :key="itemFormKey"
        :type="tab"
        :subjects="subjects"
        :initial="itemToEdit"
        :max-title-length="MAX_TITLE_LENGTH"
        :max-subject-length="MAX_SUBJECT_LENGTH"
        @close="showItemForm=false"
        @success="handleSuccess('Eintrag wurde erfolgreich erstellt.')"
        @error="onItemFormError"
    />
    <AnnouncementForm
        v-if="showAnnouncementForm"
        @close="showAnnouncementForm=false"
        @success="handleSuccess('Ankündigung wurde erfolgreich erstellt.')"
    />
    <ImageForm
        v-if="showImageFormFor"
        :item="showImageFormFor"
        @close="showImageFormFor=null"
        @success="handleSuccess('Bilder wurden erfolgreich aktualisiert.')"
    />

    <ConfirmDialog
        :show="showReportConfirm"
        message="Soll dieser Eintrag wirklich gemeldet werden?"
        @confirm="doReport"
        @cancel="showReportConfirm=false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthModal from '../components/hw/AuthModal.vue';
import ItemForm from '../components/hw/ItemForm.vue';
import AnnouncementForm from '../components/hw/AnnouncementForm.vue';
import ImageForm from '../components/hw/ImageForm.vue';
import hw, { setHwToken } from '../hwApi';
import AccountMenu from '../components/hw/AccountMenu.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue'

export interface HwItem {
  id: string;
  type: 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG';
  title: string;
  subject: string;
  description: string;
  images: Array<{ url: string; thumbUrl?: string; publicId: string; createdBy: string }>;
  dueDate: string;
  createdBy: string;
  timeColor: string;
}

const MAX_TITLE_LENGTH = 100;
const MAX_SUBJECT_LENGTH = 30;

const showAuth = ref(false);
const showItemForm = ref(false);
const showAnnouncementForm = ref(false);
const showImageFormFor = ref<any>(null);

const itemToEdit = ref<HwItem | null>(null);

const user = ref<any>(null);
const subjects = ref<string[]>([]);
const announcements = ref<any[]>([]);
const items = ref<HwItem[]>([]);
const loading = ref(true);
const subjectFilter = ref('');
const itemToEdit = ref<HwItem | null>(null);

const message = ref('');
const isError = ref(false);

// checkedItems holds item IDs that current user has checked
const checkedItems = ref(new Set<string>());

const itemFormKey = ref(0);

// description expand tracking
const expandedDescriptions = ref<Set<string>>(new Set());
function isExpanded(id: string) {
  return expandedDescriptions.value.has(id);
}
function toggleDescription(id: string) {
  if (expandedDescriptions.value.has(id)) {
    expandedDescriptions.value.delete(id);
  } else {
    expandedDescriptions.value.add(id);
  }
}

// pagination
const visibleCount = ref(5);
function showMore() {
  visibleCount.value = Math.min(visibleCount.value + 5, filteredItems.value.length);
}
function showLess() {
  visibleCount.value = Math.max(5, visibleCount.value - 5);
}
const limitedItems = computed(() => filteredItems.value.slice(0, visibleCount.value));

// confirm dialog state
const showReportConfirm = ref(false)
let reportTarget: HwItem | null = null

// route + router
const route = useRoute();
const router = useRouter();

// accepted item types
type ItemType = 'HAUSAUFGABE' | 'DALTON' | 'PRUEFUNG';
function isValidType(t: any): t is ItemType {
  return t === 'HAUSAUFGABE' || t === 'DALTON' || t === 'PRUEFUNG';
}

// tab is derived from route.params.type (fallback to HAUSAUFGABE)
const tab = ref<ItemType>( isValidType(route.params.type) ? (route.params.type as ItemType) : 'HAUSAUFGABE' );

// when route param changes, update tab and reload items
watch(() => route.params.type, (v) => {
  if (isValidType(v)) {
    tab.value = v;
  } else {
    tab.value = 'HAUSAUFGABE';
  }
  reload();
});

// reset pagination when filters change
watch([subjectFilter, tab, items], () => {
  visibleCount.value = Math.min(5, filteredItems.value.length || 5);
});

// UI/helpers
const colorFor = (color: string) => {
  const map: Record<string, string> = {
    'ok': 'var(--primary)',
    'warn': 'var(--warn)',
    'danger': 'var(--danger)',
    'expired': '#4b5563',
    'info': '#3b82f6',
  };
  return map[color] || 'var(--muted)';
};

const filteredItems = computed(() => {
  let list = items.value;
  if (subjectFilter.value) list = list.filter(i => i.subject.toLowerCase() === subjectFilter.value.toLowerCase());
  return list;
});

const openMenuId = ref<string | null>(null);

function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id;
}

function onMenuAction(action: 'images' | 'edit' | 'delete' | 'report', item: HwItem) {
  openMenuId.value = null;
  if (action === 'images') return showImageForm(item);
  if (action === 'edit') return editItem(item);
  if (action === 'delete') return deleteItem(item.id);
  if (action === 'report') return reportItem(item);
}

function reportItem(item: HwItem) {
  reportTarget = item
  showReportConfirm.value = true
}

function onDocumentClick(e: MouseEvent) {
  if (!openMenuId.value) return;
  openMenuId.value = null;
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
  loadMe();
  loadSubjects();
  loadAnnouncements();
  reload();
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick);
});

function canManage(createdBy: string) {
  if (!user.value) return false;
  return user.value.isAdmin || user.value.id === createdBy;
}

async function loadMe() {
  try {
    const { data } = await hw.get('/api/auth/me');
    user.value = data;
    await loadCheckedForMe();
  } catch {
    user.value = null;
    checkedItems.value = new Set();
  }
}

async function loadCheckedForMe() {
  if (!user.value) {
    checkedItems.value = new Set();
    return;
  }
  try {
    const { data } = await hw.get('/api/checks/me');
    checkedItems.value = new Set(data.itemIds || []);
  } catch (e) {
    console.error('loadCheckedForMe error', e);
    checkedItems.value = new Set();
  }
}

async function loadSubjects() {
  try {
    const { data } = await hw.get('/api/subjects');
    subjects.value = data;
  } catch (e) {
    console.error('loadSubjects error', e);
  }
}
async function loadAnnouncements() {
  try {
    const { data } = await hw.get('/api/announcements');
    announcements.value = data;
  } catch (e) {
    console.error('loadAnnouncements error', e);
  }
}

async function reload() {
  loading.value = true;
  try {
    const { data } = await hw.get('/api/items', { params: { type: tab.value } });
    items.value = data;
    // reset expansions on reload
    expandedDescriptions.value = new Set();
  } catch (e) {
    console.error('Failed to load items:', e);
  } finally {
    loading.value = false;
    visibleCount.value = Math.min(5, filteredItems.value.length || 5);
  }
}

function onAccountDeleted() {
  setHwToken(null);
  user.value = null;
  checkedItems.value = new Set();
  message.value = 'Account erfolgreich gelöscht.';
  isError.value = false;
  reload();
  setTimeout(() => { message.value = ''; }, 5000);
}

function onAccountDeleteError(msg: string) {
  message.value = msg;
  isError.value = true;
  setTimeout(() => { message.value = ''; isError.value = false; }, 5000);
}

function handleSuccess(msg: string) {
  message.value = msg;
  isError.value = false;
  itemFormKey.value += 1;
  setTimeout(() => message.value = '', 5000);
  showItemForm.value = false;
  showAnnouncementForm.value = false;
  showImageFormFor.value = null;
  reload();
}

// receive error from ItemForm (length limits etc.)
function onItemFormError(msg: string) {
  message.value = msg || 'Bitte Eingaben prüfen.';
  isError.value = true;
  setTimeout(() => { message.value = ''; isError.value = false; }, 5000);
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
  checkedItems.value = new Set();
}

function editItem(item: HwItem) {
  itemToEdit.value = item;
  showItemForm.value = true;
}

// open create with simple guard demonstrating max limits (frontend only)
function openCreateForm() {
  // optional: we could pre-check something here if needed
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

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mdkwadva';

async function doReport() {
  showReportConfirm.value = false
  if (!reportTarget) return

  const item = reportTarget
  reportTarget = null

  message.value = 'Eintrag wird gemeldet...'
  isError.value = false
  const payload = {
    itemId: item.id,
    itemTitle: item.title,
    reportedAt: new Date().toISOString(),
    reporterEmail: user.value?.email || ''
  }
  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Item gemeldet
ID: ${payload.itemId}
Titel: ${payload.itemTitle}
Gemeldet am: ${payload.reportedAt}
Meldet von: ${payload.reporterEmail}`
      })
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      message.value = 'Eintrag erfolgreich gemeldet. Wir nehmen das sehr ernst und schauen uns den Eintrag genau an.'
      isError.value = false
    } else {
      const errMsg = data?.error || (Array.isArray(data?.errors) ? data.errors.map((e:any)=>e.message).join('; ') : 'Fehler beim Senden.')
      message.value = 'Fehler beim Melden: ' + errMsg
      isError.value = true
    }
  } catch (e:any) {
    message.value = 'Fehler beim Melden. Bitte versuche es später erneut.'
    isError.value = true
    console.error('reportItem error', e)
  } finally {
    setTimeout(() => { message.value = ''; isError.value = false }, 7000)
  }
}

function showImageForm(item: HwItem) {
  showImageFormFor.value = item;
}

function makeThumb(url: string) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    const uploadIdx = parts.findIndex(p => p === 'upload');
    if (uploadIdx !== -1) {
      parts.splice(uploadIdx + 1, 0, 'f_auto,q_auto:low,w_240');
      u.pathname = parts.join('/');
    }
    return u.toString();
  } catch {
    return url;
  }
}

// checked helpers
function isChecked(itemId: string) {
  return checkedItems.value.has(itemId);
}

async function toggleCheck(item: HwItem) {
  if (!user.value) return;
  const id = item.id;
  try {
    if (isChecked(id)) {
      await hw.delete(`/api/items/${id}/check`);
      checkedItems.value.delete(id);
    } else {
      await hw.post(`/api/items/${id}/check`);
      checkedItems.value.add(id);
    }
  } catch (e: any) {
    console.error('toggleCheck error', e);
    message.value = e.response?.data?.error || 'Fehler beim Setzen des Status.';
    isError.value = true;
    setTimeout(() => { message.value = ''; isError.value = false; }, 4000);
  }
}

// Navigate to route for a tab (keeps URL in sync and supports reload/bookmark)
function goTab(t: ItemType) {
  router.push({ name: 'ItemsByType', params: { type: t } });
}
</script>

<style scoped>
/* Header */
.hw-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.hw-header h2 { margin: 0 0 2px 0; font-size: 1.25rem; }
.header-actions { align-items: center; }

/* Announcements */
.announcements { margin-top: 18px; }
.announcements-head { display:flex; justify-content:space-between; align-items:center; gap:12px; }
.ann-list { margin-top: 12px; }
.ann {
  border-radius: 10px;
  padding: 12px;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}
.ann + .ann { margin-top: 10px; }
.ann-title { font-weight: 700; }
.ann-content { white-space: pre-wrap; margin-top: 6px; color: var(--text); }
.ann-date { margin-top: 6px; color: var(--muted); }
.ann-actions { margin-top: 8px; }

/* Tabs */
.tabs-row { display:flex; gap:8px; margin: 16px 0; flex-wrap:wrap; }

/* Controls */
.controls { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
.controls .left { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.select-subject { width:auto; min-width:160px; }
.small-btn { padding:6px 8px; font-size:13px; }

/* Loader */
.loader { display:flex; align-items:center; gap:8px; color:var(--muted); }
.spinner {
  width:18px; height:18px; border-radius:50%;
  box-shadow: 0 -3px 0 var(--primary) inset;
  animation: spinPulse 1.2s linear infinite;
  transform-origin: 50% 50%;
}
@keyframes spinPulse {
  0% { transform: rotate(0deg) scale(1); box-shadow: 0 -3px 0 var(--primary) inset; }
  50% { transform: rotate(180deg) scale(0.9); box-shadow: 0 -3px 0 rgba(255,255,255,0.06) inset; }
  100% { transform: rotate(360deg) scale(1); box-shadow: 0 -3px 0 var(--primary) inset; }
}

/* Items */
.items { margin-top: 18px; display:flex; flex-direction:column; gap:12px; }
.item-card {
  border-radius: 12px;
  padding: 14px;
  background: var(--jj);
  border: 1px solid rgba(255,255,255,0.03);
  transition: transform 160ms ease, box-shadow 160ms ease;
  overflow: visible;
}

/* Collapsed state */
.item-card.collapsed {
  padding: 8px 12px;
  transition: padding 320ms ease, max-height 320ms ease;
}

/* Item main row */
.item-main { position: relative; display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
.item-meta { flex:1; min-width: 0; }
.item-title { margin:0 0 6px 0; font-size:1.05rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* Checkbox visual */
.collapse-checkbox {
  display:inline-flex;
  align-items:center;
  margin-right:6px;
  cursor:pointer;
}
.collapse-checkbox input { display:none; }
.collapse-checkbox .vis-label {
  width:18px; height:18px; border-radius:4px; border: 2px solid white;;
  display:inline-block; background:transparent; position:relative;
}
.collapse-checkbox input:checked + .vis-label {
  background: var(--primary);
  border-color: var(--primary);
}
.collapse-checkbox .vis-label::after {
  content: ''; position:absolute; left:4px; top:1px; width:6px; height:10px; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg); opacity:0;
}
.collapse-checkbox input:checked + .vis-label::after { opacity:1; }

/* Badges */
.item-badges { margin-top:4px; gap:8px; align-items:center; }
.subject-badge { background:#4b5563; color:white; padding:4px 8px; border-radius:6px; }
.time-badge { padding:4px 8px; border-radius:6px; }

/* Dropdown menu */
.item-menu {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 160px;

  background: rgba(26,26,26,0.95);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px;

  display: none;
  flex-direction: column;
  align-items: stretch;

  gap: 6px;
  z-index: 1000;

  opacity: 0;
  transform: translateY(-6px) scale(0.98);
  pointer-events: none;
  transition: opacity 160ms ease, transform 160ms ease;
}
.item-menu.open {
  display: flex;
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.menu-btn {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 8px;
  color: var(--text);
  border-radius: 8px;
  cursor: pointer;
}
.menu-btn:hover { background: rgba(255,255,255,0.02); color: white; }
.menu-btn.danger { background: var(--danger); color: white; }
.menu-btn.warn { background: var(--warn); color: #1f1300; }

/* Body and images */
.item-body {
  white-space: pre-wrap;
  margin-top:10px;
  color: var(--text);
  white-space: pre-wrap;        /* behält Zeilenumbrüche, erlaubt Umbruch */
  word-break: break-word;       /* bricht lange Wörter, wenn nötig */
  overflow-wrap: anywhere;      /* erlaubt Umbruch an beliebiger Stelle bei sehr langen Wörtern */
  hyphens: auto;
}
.item-images { margin-top:12px; }
.images-title { font-weight:600; margin-bottom:8px; }
.images-row { display:flex; flex-wrap:wrap; gap:8px; }
.thumb {
  width:120px; height:120px; border-radius:8px; overflow:hidden;
  border:1px solid var(--border);
  display:flex; align-items:center; justify-content:center;
  background: rgba(0,0,0,0.12);
}
.thumb img { width:100%; height:100%; object-fit:cover; display:block; }

/* Empty state */
.empty { text-align:center; color:var(--muted); padding:24px; }

/* Collapse transition (height + opacity) */
.collapse-enter-active, .collapse-leave-active {
  transition: max-height 320ms ease, opacity 320ms ease, padding 320ms ease;
}
.collapse-enter-from, .collapse-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.collapse-enter-to, .collapse-leave-from {
  max-height: 800px;
  opacity: 1;
}

/* Message */
.message { font-weight:600; }
.message.error { color: var(--danger); }

/* Tiny utility */
.tiny { padding:4px 8px; font-size:12px; }

/* menu trigger */
.item-menu-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 34px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--muted);
  transition: background 120ms ease, color 120ms ease, transform 120ms ease;
}
.item-menu-trigger:hover {
  background: rgba(255,255,255,0.02);
  color: var(--text);
  transform: translateY(-1px);
}

/* Pagination actions */
.pagination-actions {
  margin-top: 16px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.shm:hover{ background-color:inherit }
</style>
