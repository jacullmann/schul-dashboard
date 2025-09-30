<template>
  <div class="card">
    <div class="hw-header">
      <div>
        <h2>Schultermine &amp; Aufgaben</h2>
        <div class="small">Hausaufgaben, DALTON-Aufträge, Klassenarbeiten</div>
      </div>

      <div class="row header-actions">
        <button class="btn ghost" v-if="user" @click="logout">Logout ({{ user.email }})</button>
        <button class="btn" v-else @click="showAuth = true">Anmelden/Registrieren</button>
      </div>
    </div>

    <div class="announcements">
      <div class="announcements-head">
        <h3>Wichtige Ankündigungen</h3>
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
      <button class="btn" :class="{ ghost: tab !== 'DALTON' }" @click="tab = 'DALTON'">DALTON</button>
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
      <div v-for="item in filteredItems" :key="item.id" class="item-card" :class="{ collapsed: item.checked }">
        <div class="item-main">
          <div class="item-meta">
            <div style="display:inline-flex; align-items:center; gap:8px;">
              <div style="width:14px; height:14px; border:1px solid var(--border); border-radius:4px; background:transparent; display:inline-block; vertical-align:middle;"></div>
              <h3 class="item-title" style="display:inline-block; margin:0;">{{ item.title }}</h3>
            </div>

            <div class="row item-badges">
              <div class="badge subject-badge">{{ item.subject }}</div>
              <div class="badge time-badge" :style="{ background: colorFor(item.timeColor), color: item.timeColor === 'ok' ? 'white' : 'black' }">
                Fällig: {{ new Date(item.dueDate).toLocaleDateString() }}
              </div>
            </div>
          </div>

          <div class="item-menu-wrap">
            <div class="item-menu-trigger" aria-hidden>
              •••
            </div>

            <div class="item-menu">
              <button class="menu-btn" v-if="user" @click="showImageForm(item)">Bilder verwalten</button>
              <button class="menu-btn" v-if="canManage(item.createdBy)" @click="editItem(item)">Bearbeiten</button>
              <button class="menu-btn danger" v-if="canManage(item.createdBy)" @click="deleteItem(item.id)">Löschen</button>
              <button class="menu-btn warn" title="Melden" @click="reportItem(item)">Melden</button>
            </div>
          </div>
        </div>

        <div class="item-body">
          <div class="item-controls-row">
            <label v-if="user" class="checkbox-label">
              <input type="checkbox" :checked="item.checked" @change="toggleChecked(item)" />
              <span class="checkbox-fake"></span>
              <span class="checkbox-text">Erledigt</span>
            </label>
          </div>

          <div class="item-desc" v-show="!item.checked">
            {{ item.description }}
          </div>

          <div v-if="item.images && item.images.length" class="item-images" v-show="!item.checked">
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
        </div>
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
  checked?: boolean;
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
  const map: Record<string,string> = {
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
    // data already contains checked for logged-in users (backend)
    items.value = data.map((i:any) => ({ ...i }));
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
      message.value = e.response?.data?.error || 'Fehler beim Anlegen.';
      isError.value = true;
    }
  }
}

// Formspree: setze hier deine Form ID (z.B. "f/abcd1234")
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

// Toggle checked state for an item (calls backend /api/checked/toggle)
async function toggleChecked(item: HwItem) {
  if (!user.value) {
    showAuth.value = true;
    return;
  }
  // optimistic UI
  const previous = item.checked;
  item.checked = !previous;
  try {
    const { data } = await hw.post('/api/checked/toggle', { itemId: item.id });
    item.checked = !!data.checked;
  } catch (e:any) {
    console.error('toggleChecked error', e);
    // rollback on error
    item.checked = previous;
    message.value = e.response?.data?.error || 'Fehler beim Setzen des Häkchens.';
    isError.value = true;
    setTimeout(() => message.value = '', 5000);
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
/* kleine Ergänzungen für Checkbox und Collapse-Animation */

/* Basis: item-card wie vorher */
.item-card {
  border-radius: 12px;
  padding: 14px;
  background: linear-gradient(180deg, rgba(255,255,255,0.01), transparent);
  border: 1px solid rgba(255,255,255,0.03);
  transition: box-shadow 160ms ease, transform 160ms ease;
  overflow: hidden;
}

/* Controls row inside card */
.item-controls-row {
  display:flex;
  align-items:center;
  gap:12px;
  margin-bottom:8px;
}

/* Checkbox label */
.checkbox-label {
  display:inline-flex;
  align-items:center;
  gap:8px;
  cursor:pointer;
  user-select:none;
}
.checkbox-label input { display:none; }
.checkbox-fake {
  width:18px;
  height:18px;
  border:2px solid var(--border);
  border-radius:4px;
  background:transparent;
  display:inline-block;
  position:relative;
  transition: background 180ms ease, border-color 180ms ease;
}
.checkbox-label input:checked + .checkbox-fake {
  background: var(--primary);
  border-color: var(--primary);
}
.checkbox-fake::after {
  content: '';
  position:absolute;
  left:4px;
  top:1px;
  width:6px;
  height:10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  opacity: 0;
  transition: opacity 160ms ease;
}
.checkbox-label input:checked + .checkbox-fake::after { opacity: 1; }

.checkbox-text { font-size:13px; color:var(--muted); }

/* Collapse behaviour when checked: reduce card height, hide description and images */
.item-card.collapsed {
  padding: 8px 14px;
  transition: max-height 300ms ease, padding 260ms ease;
}
.item-card .item-desc,
.item-card .item-images {
  transition: opacity 260ms ease, max-height 260ms ease;
}
.item-card.collapsed .item-desc,
.item-card.collapsed .item-images {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  pointer-events: none;
}

/* Keep title and badges visible. If you want smaller visual size, reduce font-size for collapsed state */
.item-card.collapsed .item-title {
  font-size: 1.02rem;
}

/* Smoothly animate the card shrinking visually by limiting the max-height of the card itself */
.item-card {
  max-height: 1000px;
}
.item-card.collapsed {
  max-height: 86px; /* adjusts how compact the collapsed card looks */
}

/* keep images row styles from original */
.images-row { display:flex; flex-wrap:wrap; gap:8px; }
.thumb {
  width:120px; height:120px; border-radius:8px; overflow:hidden;
  border:1px solid var(--border);
  display:flex; align-items:center; justify-content:center;
  background: rgba(0,0,0,0.12);
}
.thumb img { width:100%; height:100%; object-fit:cover; display:block; }

/* existing styles preserved below (trimmed) */
.small { font-size: 12px; color: var(--muted); }
.msg-ok { color: var(--primary); font-weight: 600; }
.msg-error { color: var(--danger); font-weight: 600; }
</style>
