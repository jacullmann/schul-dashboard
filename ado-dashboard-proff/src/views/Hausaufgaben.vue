<template>
  <div class="card">
    <div class="hw-header">
      <div>
        <h2>Dashboard</h2>
        <div style="color: #f1f1f1" class="small">Arbeite kollaborativ mit anderen und behalte alle Aufgaben im Blick.</div>
      </div>

      <div class="row header-actions">
        <button class="btn ghost" v-if="user" @click="logout">Logout ({{ user.email }})</button>
        <AccountMenu
            v-if="user"
            :email="user.email"
            :user-data="user"
            @deleted="onAccountDeleted"
            @error="onAccountDeleteError"
            @open-setup="openSetupModal"
        />
        <button data-umami-event="Dashboard Anmelden/Registrieren Button" class="btn" v-else @click="showAuth = true">Anmelden/Registrieren</button>
      </div>
    </div>

    <div class="announcements">
      <div class="announcements-head">
        <h3 v-if="announcements.length">Wichtige Ankündigungen</h3>
        <button
            v-if="user?.isAdmin"
            data-umami-event="Dashboard Admin Ankündigung hinzufügen"
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
          <!--<div class="small ann-date">{{ new Date(a.createdAt).toLocaleString() }}</div>-->
          <div v-if="canManage(a.createdBy)" class="ann-actions">
            <button data-umami-event="Dashboard Admin Ankündigung löschen" class="btn danger tiny" @click="deleteAnnouncement(a._id)">Löschen</button>
          </div>
        </div>
      </div>

      <hr v-else-if="!announcements.length" />
    </div>

    <div class="tabs-row">
      <button data-umami-event="Dashboard Hausaufgaben Reiter" class="btn rei" :class="{ ghost: tab !== 'HAUSAUFGABE' }" @click="goTab('HAUSAUFGABE')">Hausaufgaben</button>
      <button data-umami-event="Dashboard Dalton Reiter" class="btn rei" :class="{ ghost: tab !== 'DALTON' }" @click="goTab('DALTON')">Dalton</button>
      <button data-umami-event="Dashboard Prüfung Reiter" class="btn rei" :class="{ ghost: tab !== 'PRUEFUNG' }" @click="goTab('PRUEFUNG')">Prüfungen</button>
    </div>

    <div class="controls">
      <div class="left">
        <div class="row-two">
          <select class="input select-subject" v-model="subjectFilter">
            <option value="">Alle Fächer</option>
            <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
          </select>
          <OldNewSwitch v-model="showOldEntries" />
        </div>

        <button v-if="user" v-ga-event="{ name: 'add_homework_dalton_exam', params: { method: 'siegma_button', label: 'hero_cta' } }" class="btn mg" @click="openCreateForm">Eintrag anlegen</button>

        <div v-if="loading" class="loader">
          <LoadingSpinner color="#fff" size="1.2em" />
          <div style="color: #aaaaaa">Lade...</div>
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
              <div
                  class="badge time-badge"
                  :style="(() => { const s = colorStyles(item.timeColor); return { background: s.background, color: s.color }; })()"
              >
                {{ new Date(item.dueDate).toLocaleDateString() }}
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
            <button data-umami-event="Dashboard Bilder verwalten Button" class="menu-btn" v-if="user" @click="onMenuAction('images', item)">
              <div class="fixall">
                <Images />
                Bilder verwalten
              </div>
            </button>
            <button data-umami-event="Dashboard bearbeiten Button" class="menu-btn" v-if="canManage(item.createdBy)" @click="onMenuAction('edit', item)">
              <div class="fixall">
              <Pencil />
              Bearbeiten
              </div>
            </button>
            <button data-umami-event="Dashboard Eintrag melden Button" class="menu-btn warn" title="Melden" @click="onMenuAction('report', item)">
              <div class="fixall">
              <Flag />
              Melden
              </div>
            </button>
            <button data-umami-event="Dashboard Eintrag löschen Button" class="menu-btn danger" v-if="canManage(item.createdBy)" @click="onMenuAction('delete', item)">
              <div class="fixall">
              <Trash />
              Löschen
              </div>
            </button>
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
                data-umami-event="Dashboard mehr anzeigen/weniger anzeigen"
                style="margin-left:8px;"
            >
              {{ isExpanded(item.id) ? 'Weniger anzeigen' : 'Alles anzeigen' }}
            </button>
          </div>
        </transition>

        <transition name="collapse">
          <!-- Angepasste Bilder-Logik: nur 2 initial anzeigen; Overlay auf 2. mit +N; Klick auf Overlay zeigt alle -->
          <div v-if="item.images && item.images.length && !isChecked(item.id)" class="item-images">
            <div class="images-title">Bilder</div>
            <div class="images-row">
              <!-- wenn noch nicht auf "mehr" geklickt: nur erste zwei thumbnails zeigen -->
              <template v-if="!isRevealed(item.id)">
                <div
                    v-for="(img, idx) in item.images.slice(0, 2)"
                    :key="img.publicId"
                    class="thumb thumb-with-overlay-wrapper"
                >
                  <a :href="img.url" target="_blank" rel="noopener">
                    <img :src="img.thumbUrl || makeThumb(img.url)" :alt="item.title" loading="lazy" decoding="async" />
                  </a>

                  <!-- Overlay nur beim zweiten Bild und wenn insgesamt > 2 -->
                  <button
                      v-if="idx === 1 && item.images.length > 2"
                      class="img-overlay"
                      @click.stop.prevent="revealImages(item.id)"
                      aria-label="Weitere Bilder anzeigen"
                      title="Weitere Bilder anzeigen"
                  >
                    <div class="overlay-blur"></div>
                    <div class="overlay-content">+{{ item.images.length - 1 }}</div>
                  </button>
                </div>
              </template>

              <!-- wenn reveal aktiv: alle Bilder wie vorher zeigen (keine Overlays) -->
              <template v-else>
                <div
                    v-for="img in item.images"
                    :key="img.publicId"
                    class="thumb"
                >
                  <a :href="img.url" target="_blank" rel="noopener">
                    <img :src="img.thumbUrl || makeThumb(img.url)" :alt="item.title" loading="lazy" decoding="async" />
                  </a>
                </div>
              </template>
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

      <div v-if="user?.isAdmin && reports.length" class="reports-section">
        <h3>Gemeldete Einträge</h3>
        <div class="reports-list">
          <div v-for="report in reports" :key="report._id" class="report-card">
            <div class="report-header">
              <strong>{{ report.itemTitle }}</strong>
              <span class="report-date">{{ new Date(report.reportedAt).toLocaleString() }}</span>
            </div>
            <div class="report-meta">
              <span>Eintrag ID: {{ report.itemId }}</span>
              <span v-if="report.reporterEmail !== 'anonymous'">Gemeldet von: {{ report.reporterEmail }}</span>
              <span v-else>Anonym gemeldet</span>
            </div>
            <div v-if="report.reason" class="report-reason">
              <strong>Grund:</strong> {{ report.reason }}
            </div>
          </div>
        </div>
      </div>
      <div v-if="user?.isAdmin" class="reports-section">
        <h3>Sorgen</h3>
        <div class="reports-list">
          <ul class="listsorgen">
            <li v-for="(item, i) in entriessorgen" :key="item._id" class="sorge-item">
              <div class="sorge-content">
                {{ item.message }}
                <span class="sorge-date">{{ new Date(item.createdAt).toLocaleString() }}</span>
              </div>
              <button
                  class="btn danger tiny"
                  @click="deleteSorge(item._id)"
                  data-umami-event="Sorgen Eintrag löschen"
                  title="Sorgen-Eintrag löschen"
              >
                Löschen
              </button>
            </li>
          </ul>
        </div>
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
        message="Diesen Eintrag melden?"
        :show-reason-input="true"
        v-model:reason="reportReason"
        @confirm="doReport"
        @cancel="cancelReport"
    />
    <CompleteSetup
        v-if="user"
        :visible="showSetupModal"
        :is-setup="user && !user.doneSetup"
        :initial-data="{
            enrKurs: user.enrKurs || 0,
            wpuKurs1: user.wpuKurs1 || 0,
            wpuKurs2: user.wpuKurs2 || 0,
            theater: user.theater || 0
        }"
        @close="showSetupModal = false"
        @success="onSetupSuccess"
        @update:user="onSetupSuccess"
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
import LoadingSpinner from "../components/LoadingSpinner.vue";
import OldNewSwitch from "../components/NewOldSwitch.vue"
import CompleteSetup from "../components/hw/CompleteSetup.vue";
import {Images, Image, Flag, Pencil, UserPen, Trash, AlertTriangle} from 'lucide-vue-next';

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

const MAX_TITLE_LENGTH = 50;
const MAX_SUBJECT_LENGTH = 30;

const entriessorgen = ref([]);

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

const showOldEntries = ref(false);

const showSetupModal = ref(false);

const reports = ref<any[]>([]);


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
const reportReason = ref('')

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

watch(() => user.value?.isAdmin, (isAdmin) => {
  if (isAdmin) {
    loadReports();
  } else {
    reports.value = [];
  }
});

watch(showOldEntries, () => {
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

// returns { background: string, color: string }
const colorStyles = (timeColor: string) => {
  // expired -> grau hintergrund, weiße schrift
  if (timeColor === 'expired') {
    return { background: '#4b5563', color: 'white' };
  }

  // very soon (danger) oder in den nächsten Tagen (warn) -> behalten wie vorher
  if (timeColor === 'danger') {
    return { background: 'var(--danger)', color: 'white' };
  }
  if (timeColor === 'warn') {
    return { background: 'var(--warn)', color: 'black' };
  }

  // info -> blue like before
  if (timeColor === 'info') {
    return { background: '#3b82f6', color: 'white' };
  }

  // ok (oder alles, was weiter weg ist) -> weißer Hintergrund, schwarze Schrift
  return { background: 'white', color: 'black' };
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
  reportReason.value = '' // NEU: Grund zurücksetzen
  showReportConfirm.value = true
}

function onDocumentClick(e: MouseEvent) {
  if (!openMenuId.value) return;
  openMenuId.value = null;
}


function onSetupSuccess(updatedUser: any) {
  // Aktualisiert die lokalen User-Daten mit den neuen Werten (doneSetup: true, Kurse)
  user.value = {
    ...user.value,
    ...updatedUser // Mergt die aktualisierten Felder
  };
  showSetupModal.value = false;
  handleSuccess('Kurseinstellungen erfolgreich gespeichert.');
}

function openSetupModal() {
  if (user.value) {
    showSetupModal.value = true;
  }
}


async function loadReports() {
  if (!user.value?.isAdmin) return;

  try {
    const { data } = await hw.get('/api/admin/reports');
    reports.value = data;
  } catch (e) {
    console.error('loadReports error', e);
  }
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

function cancelReport() {
  showReportConfirm.value = false
  reportTarget = null
  reportReason.value = ''
}

async function loadMe() {
  try {
    const { data } = await hw.get('/api/auth/me');
    user.value = data; // user.value enthält jetzt doneSetup und die Kurse
    await loadCheckedForMe();

    // NEU: Wenn Setup nicht abgeschlossen und User eingeloggt ist, zeige das Setup-Modal
    if (user.value && !user.value.doneSetup) {
      showSetupModal.value = true;
    }

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

  // NEU: Query-Parameter basierend auf dem Switch-Zustand erstellen
  const params: Record<string, any> = { type: tab.value };
  if (showOldEntries.value) {
    params.filter = 'old';
  }

  try {
    // API-Aufruf mit den neuen Query-Parametern
    const { data } = await hw.get('/api/items', { params });
    items.value = data;
    // reset expansions on reload
    expandedDescriptions.value = new Set();
    // reset revealed images on reload so page load shows 2 images again
    revealedImages.value = new Set();
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

  itemToEdit.value = null;
  // optional: we could pre-check something here if needed
  showItemForm.value = true;
}

async function deleteItem(id: string) {
  if (confirm('Wenn du diesen Eintrag löschst, werden dieser und alle dazugehörigen Bilder gelöscht.')) {
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


async function doReport() {
  if (!reportTarget) return;

  const item = reportTarget;
  const reason = reportReason.value; // Den Grund aus dem ref holen

  // Dialog schließen und Daten zurücksetzen, BEVOR der Request startet
  cancelReport();

  message.value = 'Eintrag wird gemeldet...';
  isError.value = false;

  const payload = {
    itemId: item.id,
    itemTitle: item.title,
    reason: reason,
  };

  try {
    await hw.post('/api/reports', payload);

    message.value = 'Eintrag erfolgreich gemeldet. Wir nehmen das sehr ernst und schauen uns den Eintrag genau an.';
    isError.value = false;

  } catch (e: any) {
    const errMsg = e.response?.data?.error || 'Fehler beim Senden.';
    message.value = 'Fehler beim Melden: ' + errMsg;
    isError.value = true;
    console.error('reportItem error', e);
  } finally {
    setTimeout(() => { message.value = ''; isError.value = false }, 7000);
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
      parts.splice(uploadIdx + 1, 0, 'f_auto,q_auto:low,w_240,h_240,c_fill');
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


const revealedImages = ref(new Set<string>());

function isRevealed(itemId: string) {
  return revealedImages.value.has(itemId);
}

function revealImages(itemId: string) {
  revealedImages.value.add(itemId);
}


// Löschen eines Sorgen-Eintrags
async function deleteSorge(id: string) {
  if (!confirm('Möchtest du diesen Sorgen-Eintrag wirklich löschen?')) {
    return;
  }

  try {
    await hw.delete(`/anon/sorgenfind/${id}`);
    // Nach erfolgreichem Löschen die Liste neu laden
    await loadSorgen();
    handleSuccess('Sorgen-Eintrag erfolgreich gelöscht.');
  } catch (e: any) {
    const errMsg = e.response?.data?.error || 'Fehler beim Löschen.';
    message.value = 'Fehler: ' + errMsg;
    isError.value = true;
    console.error('deleteSorge error', e);
    setTimeout(() => { message.value = ''; isError.value = false; }, 5000);
  }
}

// Sorgen laden Funktion extrahieren (falls noch nicht vorhanden)
async function loadSorgen() {
  try {
    const res = await hw.get('/anon/sorgenfind');
    entriessorgen.value = res.data;
  } catch (e) {
    console.error('Konnte Sorgen nicht laden');
  }
}

onMounted(() => {
  if (user.value?.isAdmin) {
    loadReports();
  }
});

onMounted(async () => {
  await loadSorgen()
});

</script>

<style scoped>
/* Header */
.hw-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-direction: column;
  text-align: left;
}
.hw-header h2 { margin: 0 0 2px 0}
.header-actions { align-items: center; display: flex; flex-direction: row; flex-wrap: wrap}

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
.tabs-row { display:flex; gap:8px; margin: 16px 0;  flex-wrap: wrap;flex-direction: row }

/* Controls */
.controls { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
.controls .left { display:flex; gap:8px; align-items:center; flex-wrap:wrap; height: 100% }
.select-subject { width:auto; min-width:160px; height: 37px }
.small-btn { padding:6px 8px; font-size:13px; }

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
  content: '';
  position: absolute;
  width: 5px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  opacity: 0;
  left: 50%;
  top: 38%;
  transform: translate(-50%, -45%) rotate(45deg);
}
.collapse-checkbox input:checked + .vis-label::after { opacity:1; }

/* Badges */
.item-badges { margin-top:4px; gap:8px; align-items:center; }
.subject-badge { background:#414141; color:white; padding:4px 8px; border-radius:6px; }
.time-badge { padding:4px 8px; border-radius:6px; }

.item-menu {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 160px;
  background: #404040;
  border: none;
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
  margin-bottom: 0;
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
  padding: 8px 12px;
  color: var(--text);
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
}
.menu-btn .fixall {
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1;
}

.menu-btn .fixall svg {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
}
.menu-btn:hover { background: #555555; color: white; }
.menu-btn.danger { background: transparent; color: #ef4444; }
.menu-btn.warn { background: transparent; color: white; }

.menu-btn.danger:hover { background: #555555; }
.menu-btn.warn:hover { background: #555555; }

/* Body and images */
.item-body {
  white-space: pre-wrap;
  margin-top:10px;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  hyphens: auto;
}
.item-images { margin-top:12px; }
.images-title { font-weight:600; margin-bottom:8px; }
.images-row { display:flex; flex-wrap:wrap; gap:8px; position:relative; }
.thumb {
  width:120px; height:120px; border-radius:8px; overflow:hidden;
  border:none;
  display:flex; align-items:center; justify-content:center;
  background: rgba(0,0,0,0.12);
  position:relative;
}
.thumb img { width:100%; height:100%; object-fit:cover; display:block; }

/* Wrapper to allow overlay positioning on the second thumb */
.thumb-with-overlay-wrapper { position: relative; }

/* Overlay styling (leichtes graues, leicht unscharfes Overlay wie WhatsApp) */
.img-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  background: transparent;
  z-index: 10;
}
.img-overlay .overlay-blur {
  position: absolute;
  inset: 0;
  background: rgba(60,60,60,0.6); /* graues halbtransparent */
  backdrop-filter:  saturate(90%);
  -webkit-backdrop-filter: saturate(90%);
  border-radius: 8px;
}
.img-overlay .overlay-content {
  position: relative;
  color: white;
  font-weight: 700;
  font-size: 18px;
  z-index: 11;
  text-shadow: 0 1px 0 rgba(0,0,0,0.4);
  pointer-events: none;
}

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
  color: var(--text);
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


.loader {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted); /* Farbe für den Text "Lade..." */
}
.row-two {
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  gap: 10px;
  position: relative;

}
.rei {


}
.finishsetup {
  position: absolute;
  z-index: 100000;
  width: 100%;
  height: 100%;
  margin: 2px;

}


/* Reports Section */
.reports-section {
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.reports-section h3 {
  margin-bottom: 16px;
  color: var(--danger);
}

.reports-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-card {
  background: rgba(255, 0, 0, 0.05);
  border: 1px solid var(--danger);
  border-radius: 8px;
  padding: 12px;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.report-header strong {
  color: var(--text);
  flex: 1;
  margin-right: 12px;
}

.report-date {
  color: var(--muted);
  font-size: 0.85em;
  white-space: nowrap;
}

.report-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 0.9em;
  color: var(--muted);
  flex-wrap: wrap;
}

.report-reason {
  background: rgba(255, 255, 255, 0.05);
  padding: 8px;
  border-radius: 4px;
  font-size: 0.9em;
  color: var(--text);
}

.listsorgen {
  display: flex;
  gap: 12px;
  flex-direction: column;
  overflow: hidden;
}

li {
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}

.sorge-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 8px;
}

.sorge-content {
  flex: 1;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.sorge-date {
  display: block;
  font-size: 0.8em;
  color: var(--muted);
  margin-top: 4px;
}

.listsorgen {
  display: flex;
  gap: 12px;
  flex-direction: column;
  overflow: hidden;
  margin: 0;
  padding: 0;
  list-style: none;
}


@media (max-width: 500px ) {
  .row-two {
    flex-direction: column;
    align-items: flex-start;
    margin-top: 15px;
    margin-bottom: 30px;
  }
  .rei {


  }

  .mg {
    margin-top: 20px;
  }

}
</style>