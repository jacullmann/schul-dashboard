<template>
  <div class="card">
    <div class="hw-header">
      <div>
        <h2>Dashboard</h2>
        <div class="small">Arbeite kollaborativ mit anderen und behalte alle Aufgaben im Blick.</div>
      </div>

      <div class="row header-actions">
        <button class="btn ghost" v-if="user" @click="logout">Logout ({{ user.email }})</button>
        <button class="btn" v-else @click="showAuth = true">Anmelden/Registrieren</button>
      </div>
    </div>

    <div class="announcements">
      <div class="announcements-head">
        <h3 v-if="announcements.length" >Wichtige Ankündigungen</h3>
        <button
            v-if="user?.isAdmin"
            class="btn ghost small-btn"
            @click="showAnnouncementForm = true"
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
      <button class="btn" :class="{ ghost: tab !== 'HAUSAUFGABE' }" @click="tab = 'HAUSAUFGABE'">Hausaufgaben</button>
      <button class="btn" :class="{ ghost: tab !== 'DALTON' }" @click="tab = 'DALTON'">Dalton</button>
      <button class="btn" :class="{ ghost: tab !== 'PRUEFUNG' }" @click="tab = 'PRUEFUNG'">Prüfungen</button>
    </div>

    <div class="controls">
      <div class="left">
        <select class="input select-subject" v-model="subjectFilter">
          <option value="">Alle Fächer</option>
          <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
        </select>

        <button v-if="user" class="btn" @click="showItemForm=true">Eintrag anlegen</button>

        <div v-if="loading" class="loader">
          <div class="spinner" aria-hidden></div>
          <div>Lade...</div>
        </div>
      </div>

      <div v-if="message" class="small message" :class="{ error: isError }">{{ message }}</div>
    </div>

    <div class="items">
      <div v-for="item in filteredItems" :key="item.id" class="item-card" :class="{ collapsed: isChecked(item.id) }">
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
              aria-expanded="openMenuId === item.id ? 'true' : 'false'"
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
          <div v-show="!isChecked(item.id)" class="item-body">{{ item.description }}</div>
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

      <div v-if="!loading && !filteredItems.length" class="card empty">
        Keine Einträge gefunden.
      </div>
    </div>

    <AuthModal v-if="showAuth" @close="showAuth=false" @logged-in="onLoggedIn" />
    <ItemForm
        v-if="showItemForm"
        :type="tab"
        :subjects="subjects"
        :initial="itemToEdit"
        @close="showItemForm=false"
        @success="handleSuccess('Eintrag wurde erfolgreich erstellt.')"
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import AuthModal from '../components/hw/AuthModal.vue';
import ItemForm from '../components/hw/ItemForm.vue';
import AnnouncementForm from '../components/hw/AnnouncementForm.vue';
import ImageForm from '../components/hw/ImageForm.vue';
import hw, { setHwToken } from '../hwApi';

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

// checkedItems holds item IDs that current user has checked
const checkedItems = ref(new Set<string>());

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
  let list = items.value;
  if (subjectFilter.value) list = list.filter(i => i.subject.toLowerCase() === subjectFilter.value.toLowerCase());
  return list;
});
// neues reactive state für offenes Menü
const openMenuId = ref<string | null>(null);

// Toggle-Funktion
function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id;
}

// gemeinsame Handler für Menüaktionen (schließt das Menü nach Aktion)
function onMenuAction(action: 'images' | 'edit' | 'delete' | 'report', item: HwItem) {
  openMenuId.value = null;
  if (action === 'images') return showImageForm(item);
  if (action === 'edit') return editItem(item);
  if (action === 'delete') return deleteItem(item.id);
  if (action === 'report') return reportItem(item);
}

// Klick ausserhalb schließt das Menü
function onDocumentClick(e: MouseEvent) {
  // Wenn kein Menü offen, nichts tun
  if (!openMenuId.value) return;
  // Wenn ein Menü offen, schließen (Template stoppt Event wenn Klick innerhalb)
  openMenuId.value = null;
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
  // bereits vorhandene onMounted-Aufrufe beibehalten
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
    // preserve checked state for items that still exist
    // (we keep checkedItems as-is; UI queries will only check existing items)
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
  checkedItems.value = new Set();
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

// Formspree endpoint (unchanged)
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mdkwadva';

async function reportItem(item: HwItem) {
  message.value = 'Eintrag wird gemeldet...';
  isError.value = false;
  const payload = {
    itemId: item.id,
    itemTitle: item.title,
    reportedAt: new Date().toISOString(),
    reporterEmail: user.value?.email || ''
  };
  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Item gemeldet\nID: ${payload.itemId}\nTitel: ${payload.itemTitle}\nGemeldet am: ${payload.reportedAt}\nMeldet von: ${payload.reporterEmail}`
      })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      message.value = 'Eintrag erfolgreich gemeldet. Wir nehmen das sehr ernst und schauen uns den Eintrag genau an.';
      isError.value = false;
    } else {
      const errMsg = data?.error || (Array.isArray(data?.errors) ? data.errors.map((e:any)=>e.message).join('; ') : 'Fehler beim Senden.');
      message.value = 'Fehler beim Melden: ' + errMsg;
      isError.value = true;
    }
  } catch (e:any) {
    message.value = 'Fehler beim Melden. Bitte versuche es später erneut.';
    isError.value = true;
    console.error('reportItem error', e);
  } finally {
    setTimeout(() => { message.value = ''; isError.value = false; }, 7000);
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
      // uncheck
      await hw.delete(`/api/items/${id}/check`);
      checkedItems.value.delete(id);
    } else {
      // check
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

onMounted(() => {
  loadMe();
  loadSubjects();
  loadAnnouncements();
  reload();
});

watch(tab, reload);
</script>

<style scoped>
/* Card tweaks (kept from original) */

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
  background: linear-gradient(180deg, rgba(255,255,255,0.01), transparent);
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
.item-main { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
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
  width:18px; height:18px; border-radius:4px; border:1px solid var(--border);
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

/* entferne oder passe die bisherigen transition-delay Regeln weg */
/* Basis bleibt wie gehabt */
.item-menu {
  position: absolute;
  top: 38px;
  right: 0;
  min-width: 160px;
  background: rgba(26,26,26,0.95);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  opacity: 0;
  transform: translateY(-6px) scale(0.98);
  pointer-events: none;

  transition: opacity 160ms ease, transform 160ms ease;
  z-index: 1000;
}

/* sichtbar wenn open-Klasse gesetzt */
.item-menu.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}


.menu-btn {
  text-align:left;
  background: transparent;
  border: none;
  padding:8px;
  color: var(--text);
  border-radius:8px;
  cursor:pointer;
}
.menu-btn:hover { background: rgba(255,255,255,0.02); color: white; }
.menu-btn.danger { background: var(--danger); color: white; }
.menu-btn.warn { background: var(--warn); color: #1f1300; }

/* Body and images */
.item-body { white-space: pre-wrap; margin-top:10px; color: var(--text); }
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
</style>
