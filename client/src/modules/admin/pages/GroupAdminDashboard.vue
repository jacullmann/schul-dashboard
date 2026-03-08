<template>
  <div class="group-admin">
    <!-- Header Bar -->
    <header class="ga-header">
      <div class="ga-header-inner">
        <div class="ga-header-left">
          <router-link :to="`/groups/${groupId}/items/HAUSAUFGABE`" class="ga-back">
            <ArrowLeft :size="18" />
          </router-link>
          <div class="ga-header-title">
            <h1>Verwaltung</h1>
            <span class="ga-group-name">{{ groupName || 'Gruppe' }}</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Tabs -->
    <nav class="ga-tabs">
      <button
          v-for="tab in tabs"
          :key="tab.id"
          class="ga-tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
      >
        <component :is="tab.icon" :size="16" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <!-- Content -->
    <main class="ga-content">

      <!-- Overview -->
      <div v-if="activeTab === 'overview'" class="tab-panel">
        <div class="stats-row">
          <div class="stat-tile">
            <span class="stat-value">{{ stats?.itemCount ?? '–' }}</span>
            <span class="stat-label">Aktive Einträge</span>
          </div>
          <div class="stat-tile">
            <span class="stat-value">{{ stats?.subsCount ?? '–' }}</span>
            <span class="stat-label">Substitutions</span>
          </div>
          <div class="stat-tile" :class="{ warn: (stats?.oldItemsCount ?? 0) > 0 }">
            <span class="stat-value">{{ stats?.oldItemsCount ?? '–' }}</span>
            <span class="stat-label">Alte Einträge (90+ Tage)</span>
          </div>
        </div>

        <div v-if="(stats?.oldItemsCount ?? 0) > 0" class="cleanup-bar">
          <div class="cleanup-info">
            <Trash2 :size="16" />
            <span>{{ stats?.oldItemsCount }} Einträge älter als 90 Tage können gelöscht werden.</span>
          </div>
          <button class="btn ghost" @click="cleanupOldItems" :disabled="cleaningUp">
            {{ cleaningUp ? 'Löscht...' : 'Bereinigen' }}
          </button>
        </div>
      </div>

      <!-- Timetable / Substitutions -->
      <div v-if="activeTab === 'timetable'" class="tab-panel">
        <div class="panel-header">
          <h2>Substitutions</h2>
          <button class="btn ghost" @click="loadSubs" :disabled="loadingSubs">
            <RefreshCw :size="14" :class="{ 'spin-icon': loadingSubs }" />
            <span>Aktualisieren</span>
          </button>
        </div>

        <!-- Create Form -->
        <div class="sub-form-card">
          <h3>Neue Substitution</h3>
          <div class="sub-form-grid">
            <div class="form-field">
              <label>Lesson ID</label>
              <input v-model="subForm.lessonId" placeholder="UUID" class="input" />
            </div>
            <div class="form-field">
              <label>Fach</label>
              <input v-model="subForm.subject" placeholder="Optional" class="input" />
            </div>
            <div class="form-field">
              <label>Raum</label>
              <input v-model="subForm.room" placeholder="Optional" class="input" />
            </div>
            <div class="form-field">
              <label>Stunde</label>
              <input v-model.number="subForm.slot" type="number" placeholder="Optional" class="input" />
            </div>
            <div class="form-field checkbox-field">
              <label><input type="checkbox" v-model="subForm.cancelled" /> Ausfall</label>
            </div>
            <div class="form-field checkbox-field">
              <label><input type="checkbox" v-model="subForm.hide" /> Verstecken</label>
            </div>
          </div>
          <button class="btn action" @click="saveSub" :disabled="savingSub || !subForm.lessonId">
            {{ savingSub ? 'Speichert...' : 'Speichern' }}
          </button>
        </div>

        <!-- Existing Subs -->
        <div v-if="subs.length === 0 && !loadingSubs" class="empty-hint">
          Keine Substitutions vorhanden.
        </div>
        <div v-else class="subs-list">
          <div v-for="sub in subs" :key="sub.id" class="sub-row">
            <div class="sub-row-info">
              <span class="sub-row-id">{{ sub.lessonId }}</span>
              <span v-if="sub.subject" class="sub-row-tag">{{ sub.subject }}</span>
              <span v-if="sub.cancelled" class="sub-row-tag danger">Ausfall</span>
              <span v-if="sub.hide" class="sub-row-tag muted">Versteckt</span>
              <span v-if="sub.room" class="sub-row-detail">Raum: {{ sub.room }}</span>
            </div>
            <button class="btn-icon danger" @click="deleteSub(sub.id)" title="Löschen">
              <Trash2 :size="15" />
            </button>
          </div>
        </div>
      </div>

      <!-- Announcements -->
      <div v-if="activeTab === 'announcements'" class="tab-panel">
        <div class="panel-header">
          <h2>Ankündigungen</h2>
        </div>

        <!-- Create -->
        <div class="ann-form-card">
          <textarea
              v-model="annContent"
              class="input ann-textarea"
              placeholder="Neue Ankündigung verfassen..."
              rows="3"
          ></textarea>
          <div class="ann-form-footer">
            <select v-model="annColor" class="input ann-select">
              <option value="info">Info</option>
              <option value="warn">Warnung</option>
              <option value="danger">Wichtig</option>
            </select>
            <button class="btn action" @click="createAnn" :disabled="!annContent.trim() || creatingAnn">
              {{ creatingAnn ? 'Erstellt...' : 'Veröffentlichen' }}
            </button>
          </div>
        </div>

        <!-- Existing -->
        <div v-if="announcements.length === 0" class="empty-hint">
          Keine Ankündigungen vorhanden.
        </div>
        <div v-else class="ann-list">
          <div v-for="ann in announcements" :key="ann.id" class="ann-item" :class="'ann-' + ann.color">
            <div class="ann-item-body">{{ ann.content }}</div>
            <div class="ann-item-footer">
              <span class="ann-item-date">{{ formatDate(ann.createdAt) }}</span>
              <button class="btn-icon danger" @click="deleteAnn(ann.id)">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Status Messages -->
    <Transition name="toast">
      <div v-if="message" class="toast" :class="{ error: isError }">
        {{ message }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, markRaw } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeft, LayoutDashboard, CalendarDays, Megaphone, RefreshCw, Trash2 } from 'lucide-vue-next';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import hw from '@/api/hwApi';

const route = useRoute();
const { groupName } = useAppAuth();

const groupId = computed(() => route.params.groupId as string);

const tabs = [
  { id: 'overview', label: 'Übersicht', icon: markRaw(LayoutDashboard) },
  { id: 'timetable', label: 'Stundenplan', icon: markRaw(CalendarDays) },
  { id: 'announcements', label: 'Ankündigungen', icon: markRaw(Megaphone) },
];
const activeTab = ref('overview');

interface Stats {
  itemCount?: number;
  subsCount?: number;
  oldItemsCount?: number;
}

interface Sub {
  id: string;
  lessonId: string;
  subject?: string;
  cancelled?: boolean;
  hide?: boolean;
  room?: string;
  slot?: number;
}

interface Announcement {
  id: string;
  content: string;
  color: string;
  createdAt: string;
}

// State
const stats = ref<Stats | null>(null);
const subs = ref<Sub[]>([]);
const announcements = ref<Announcement[]>([]);
const loadingSubs = ref(false);
const savingSub = ref(false);
const cleaningUp = ref(false);
const creatingAnn = ref(false);
const message = ref('');
const isError = ref(false);

const subForm = ref({
  lessonId: '',
  subject: '',
  room: '',
  slot: null as number | null,
  cancelled: false,
  hide: false,
});

const annContent = ref('');
const annColor = ref('warn');

function showMessage(msg: string, error = false) {
  message.value = msg;
  isError.value = error;
  setTimeout(() => { message.value = ''; }, 4000);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function loadStats() {
  try {
    const { data } = await hw.get('/api/group-admin/stats');
    stats.value = data;
  } catch { /* ignore */ }
}

async function loadSubs() {
  loadingSubs.value = true;
  try {
    const { data } = await hw.get('/api/group-admin/timetable/subs');
    subs.value = data;
  } catch {
    showMessage('Fehler beim Laden', true);
  } finally {
    loadingSubs.value = false;
  }
}

async function saveSub() {
  if (!subForm.value.lessonId) return;
  savingSub.value = true;
  try {
    const payload: Record<string, unknown> = { lessonId: subForm.value.lessonId };
    if (subForm.value.subject) payload.subject = subForm.value.subject;
    if (subForm.value.room) payload.room = subForm.value.room;
    if (subForm.value.slot) payload.slot = subForm.value.slot;
    if (subForm.value.cancelled) payload.cancelled = true;
    if (subForm.value.hide) payload.hide = true;

    await hw.post('/api/group-admin/timetable/subs', payload);
    subForm.value = { lessonId: '', subject: '', room: '', slot: null, cancelled: false, hide: false };
    await loadSubs();
    showMessage('Substitution gespeichert');
  } catch {
    showMessage('Fehler beim Speichern', true);
  } finally {
    savingSub.value = false;
  }
}

async function deleteSub(id: string) {
  if (!confirm('Substitution löschen?')) return;
  try {
    await hw.delete(`/api/group-admin/timetable/subs/${id}`);
    subs.value = subs.value.filter(s => s.id !== id);
    showMessage('Gelöscht');
  } catch {
    showMessage('Fehler beim Löschen', true);
  }
}

async function cleanupOldItems() {
  if (!confirm('Alle Einträge älter als 90 Tage löschen?')) return;
  cleaningUp.value = true;
  try {
    const { data } = await hw.delete('/api/group-admin/cleanup/old-items');
    showMessage(data.message || 'Bereinigung abgeschlossen');
    await loadStats();
  } catch {
    showMessage('Fehler bei der Bereinigung', true);
  } finally {
    cleaningUp.value = false;
  }
}

async function loadAnnouncements() {
  try {
    const { data } = await hw.get('/api/timetable/announcements');
    announcements.value = data;
  } catch { /* ignore */ }
}

async function createAnn() {
  if (!annContent.value.trim()) return;
  creatingAnn.value = true;
  try {
    await hw.post('/api/group-admin/announcements', {
      content: annContent.value.trim(),
      color: annColor.value,
    });
    annContent.value = '';
    await loadAnnouncements();
    showMessage('Ankündigung erstellt');
  } catch {
    showMessage('Fehler beim Erstellen', true);
  } finally {
    creatingAnn.value = false;
  }
}

async function deleteAnn(id: string) {
  if (!confirm('Ankündigung löschen?')) return;
  try {
    await hw.delete(`/api/group-admin/announcements/${id}`);
    announcements.value = announcements.value.filter(a => a.id !== id);
    showMessage('Gelöscht');
  } catch {
    showMessage('Fehler beim Löschen', true);
  }
}

onMounted(() => {
  loadStats();
  loadSubs();
  loadAnnouncements();
});
</script>

<style scoped>
.group-admin {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}

/* ─── Header ─────────────────────────────────────────── */
.ga-header {
  border-bottom: 1px solid var(--border);
  background: var(--lbg);
  position: sticky;
  top: 0;
  z-index: 100;
}

.ga-header-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  align-items: center;
}

.ga-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.ga-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  color: var(--sub);
  transition: background 0.15s, color 0.15s;
}

.ga-back:hover {
  background: var(--gg);
  color: var(--text);
}

.ga-header-title h1 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

.ga-group-name {
  font-size: var(--font-size-sub);
  color: var(--sub);
  font-weight: 500;
}

/* ─── Tabs ───────────────────────────────────────────── */
.ga-tabs {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border);
}

.ga-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: none;
  border: none;
  color: var(--sub);
  font-size: var(--font-size-body);
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s;
}

.ga-tab:hover { color: var(--text); }

.ga-tab.active {
  color: var(--text);
  border-bottom-color: var(--text);
}

/* ─── Content ────────────────────────────────────────── */
.ga-content {
  max-width: 960px;
  margin: 0 auto;
  padding: 28px 20px 64px;
}

.tab-panel { animation: fadeUp 0.2s ease; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-header h2 {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
}

.panel-header .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-sub);
}

/* ─── Stats ──────────────────────────────────────────── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.stat-tile {
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: 12px;
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-tile.warn { border-color: rgba(245, 158, 11, 0.3); }

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: var(--font-size-sub);
  color: var(--sub);
}

.cleanup-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--vlbg);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  padding: 12px 16px;
  gap: 12px;
}

.cleanup-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-body);
  color: var(--sub);
}

/* ─── Sub Form ───────────────────────────────────────── */
.sub-form-card {
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.sub-form-card h3 {
  font-size: var(--font-size-title);
  font-weight: 600;
  margin: 0 0 16px;
}

.sub-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.form-field label {
  display: block;
  font-size: var(--font-size-sub);
  color: var(--sub);
  margin-bottom: 4px;
  font-weight: 500;
}

.checkbox-field label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-body);
  cursor: pointer;
  padding-top: 20px;
}

/* ─── Subs List ──────────────────────────────────────── */
.subs-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: 10px;
  gap: 8px;
}

.sub-row-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.sub-row-id {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--sub);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub-row-tag {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--gg);
  color: var(--text);
}

.sub-row-tag.danger {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.sub-row-tag.muted {
  background: var(--gg);
  color: var(--sub);
}

.sub-row-detail {
  font-size: var(--font-size-sub);
  color: var(--sub);
}

/* ─── Announcements ──────────────────────────────────── */
.ann-form-card {
  margin-bottom: 24px;
}

.ann-textarea {
  width: 100%;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  margin-bottom: 10px;
}

.ann-form-footer {
  display: flex;
  gap: 10px;
  align-items: center;
}

.ann-select {
  width: 120px;
}

.ann-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ann-item {
  padding: 14px 16px;
  border-radius: 10px;
  border-left: 3px solid var(--border);
  background: var(--vlbg);
}

.ann-info { border-left-color: #3b82f6; }
.ann-warn { border-left-color: #f59e0b; }
.ann-danger { border-left-color: #ef4444; }

.ann-item-body {
  font-size: var(--font-size-body);
  line-height: 1.5;
  margin-bottom: 8px;
}

.ann-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ann-item-date {
  font-size: var(--font-size-sub);
  color: var(--sub);
}

/* ─── Shared ─────────────────────────────────────────── */
.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--sub);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-icon:hover { background: var(--gg); color: var(--text); }
.btn-icon.danger:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

.empty-hint {
  text-align: center;
  padding: 32px;
  color: var(--sub);
  font-size: var(--font-size-body);
}

.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── Toast ──────────────────────────────────────────── */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--text);
  color: var(--bg);
  padding: 10px 20px;
  border-radius: 10px;
  font-size: var(--font-size-body);
  font-weight: 500;
  z-index: 9999;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}

.toast.error {
  background: #ef4444;
  color: #fff;
}

.toast-enter-active { animation: toastIn 0.25s ease; }
.toast-leave-active { animation: toastIn 0.2s ease reverse; }
@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(12px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* ─── Responsive ─────────────────────────────────────── */
@media (max-width: 640px) {
  .ga-content { padding: 20px 12px 48px; }
  .sub-form-grid { grid-template-columns: 1fr; }
  .stats-row { grid-template-columns: 1fr; }
  .ga-tabs { overflow-x: auto; }
  .cleanup-bar { flex-direction: column; align-items: flex-start; }
}
</style>