<script setup lang="ts">
import { ref, computed, onMounted, markRaw } from 'vue';
import {
  ArrowLeft, LayoutDashboard, Users, Flag, FileText as FileTextIcon,
  Lock, Unlock, Trash2, Eraser, Check, RotateCcw, X, FileText
} from 'lucide-vue-next';
import hw from '@/api/hwApi';
import AdminDocEditor from '@/modules/admin/components/AdminDocEditor.vue';
import { useToast } from '@/common/composables/useToast';

import type { Component } from 'vue';

type NavItem = { id: string; label: string; icon: Component; count: number };

const navItems = ref<NavItem[]>([
  { id: 'overview', label: 'Overview', icon: markRaw(LayoutDashboard), count: 0 },
  { id: 'users', label: 'Users', icon: markRaw(Users), count: 0 },
  { id: 'reports', label: 'Reports', icon: markRaw(Flag), count: 0 },
  { id: 'doc', label: 'Doc', icon: markRaw(FileTextIcon), count: 0 },
]);

const activeTab = ref('overview');

interface AdminStats {
  userCount?: number;
  itemCount?: number;
  reportCount?: number;
  bannedCount?: number;
  verifiedUsers?: number;
  unverifiedUsers?: number;
  adminCount?: number;
  newUsersThisWeek?: number;
  newItemsThisWeek?: number;
  reportCountTotal?: number;
  reportCountProcessed?: number;
  oldItemsCount?: number;
}

interface User {
  id: string;
  email: string;
  role: string;
  isBanned: boolean;
  emailVerified: boolean;
  createdAt: string;
}

interface Report {
  id: string;
  itemTitle?: string;
  category?: string;
  reason?: string;
  reporterEmail?: string;
  reportedAt: string;
  processed: boolean;
  processedAt?: string | null;
}

interface UserActivity {
  at: string;
  type: string;
  meta: Record<string, unknown>;
}

// State
const stats = ref<AdminStats | null>(null);
const loadingStats = ref(false);
const allUsers = ref<User[]>([]);
const reports = ref<Report[]>([]);
const showActivityFor = ref<string | null>(null);
const userActivities = ref<Record<string, UserActivity[]>>({});
const loadingActivities = ref<Record<string, boolean>>({});
const isCleaningUp = ref(false);


const unprocessedReports = computed(() => reports.value.filter(r => !r.processed));
const processedReports = computed(() => reports.value.filter(r => r.processed));

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toast(msg: string, error = false) {
  if (error) useToast().error(msg);
  else useToast().success(msg);
}

// ─── Data Loading ───────────────────────────────────────
async function loadStats() {
  loadingStats.value = true;
  try {
    const { data } = await hw.get('/api/admin/stats');
    stats.value = data;
    const ri = navItems.value.find(n => n.id === 'reports');
    if (ri) ri.count = data.reportCount || 0;
  } catch (e) { console.error(e); }
  finally { loadingStats.value = false; }
}

async function loadAllUsers() {
  try { const { data } = await hw.get('/api/admin/all-users'); allUsers.value = data; }
  catch { toast('Failed to load users', true); }
}

async function loadReports() {
  try { const { data } = await hw.get('/api/admin/reports'); reports.value = data; }
  catch { /* ignore */ }
}

// ─── User Actions ───────────────────────────────────────
async function toggleActivity(userId: string) {
  if (showActivityFor.value === userId) { showActivityFor.value = null; return; }
  loadingActivities.value[userId] = true;
  try {
    const { data } = await hw.get(`/api/admin/users/${userId}/activity`);
    userActivities.value[userId] = data;
    showActivityFor.value = userId;
  } catch { toast('Failed to load activity', true); }
  finally { loadingActivities.value[userId] = false; }
}

async function toggleBan(u: User) {
  if (u.role === 'superadmin') return;
  try {
    if (u.isBanned) {
      await hw.delete(`/api/admin/users/${u.id}/ban`);
      u.isBanned = false; toast('User unbanned');
    } else {
      await hw.post(`/api/admin/users/${u.id}/ban`);
      u.isBanned = true; toast('User banned');
    }
    loadStats();
  } catch { toast('Action failed', true); }
}

async function deleteUser(id: string) {
  if (!confirm('Delete this user?')) return;
  try {
    await hw.delete(`/api/admin/users/${id}`);
    allUsers.value = allUsers.value.filter(u => u.id !== id);
    toast('User deleted'); loadStats();
  } catch { toast('Failed to delete user', true); }
}

async function pruneOldLogs(u: User) {
  if (!confirm(`Delete logs older than 30 days for ${u.email}?`)) return;
  try {
    await hw.delete(`/api/admin/users/${u.id}/activity/prune`);
    toast('Logs pruned');
  } catch { toast('Failed to prune logs', true); }
}

// ─── Reports ────────────────────────────────────────────
async function toggleReportProcessed(id: string, currentProcessed: boolean) {
  try {
    await hw.patch(`/api/admin/reports/${id}/processed`, { processed: !currentProcessed });
    const r = reports.value.find(x => x.id === id);
    if (r) { r.processed = !currentProcessed; r.processedAt = !currentProcessed ? new Date().toISOString() : null; }
    toast(!currentProcessed ? 'Marked as resolved' : 'Reset to open');
    loadStats();
  } catch { toast('Action failed', true); }
}

async function deleteReport(id: string) {
  if (!confirm('Delete this report?')) return;
  try {
    await hw.delete(`/api/admin/reports/${id}`);
    reports.value = reports.value.filter(r => r.id !== id);
    toast('Report deleted'); loadStats();
  } catch { toast('Failed to delete report', true); }
}

// ─── Cleanup ────────────────────────────────────────────
async function cleanupOldItems() {
  if (!confirm('Delete all entries older than 90 days?')) return;
  isCleaningUp.value = true;
  try {
    const { data } = await hw.delete('/api/admin/cleanup/old-items');
    toast(data.message || 'Cleanup complete');
    loadStats();
  } catch { toast('Cleanup failed', true); }
  finally { isCleaningUp.value = false; }
}

onMounted(() => {
  loadStats();
  loadAllUsers();
  loadReports();
});
</script>

<template>
  <div class="sa-layout">
    <!-- Header -->
    <header class="sa-header">
      <div class="sa-header-inner">
        <div class="sa-header-left">
          <router-link to="/home" class="sa-back">
            <ArrowLeft :size="18" />
          </router-link>
          <h1 class="sa-title">Super Admin</h1>
        </div>
      </div>
    </header>

    <div class="sa-body">
      <!-- Sidebar -->
      <aside class="sa-sidebar">
        <nav class="sa-nav">
          <button
              v-for="item in navItems"
              :key="item.id"
              class="sa-nav-item"
              :class="{ active: activeTab === item.id }"
              @click="activeTab = item.id"
          >
            <component :is="item.icon" :size="18" class="sa-nav-icon" />
            <span class="sa-nav-label">{{ item.label }}</span>
            <span v-if="item.count > 0" class="sa-nav-badge" :class="{ danger: item.id === 'reports' }">
              {{ item.count }}
            </span>
          </button>
        </nav>
      </aside>

      <!-- Main -->
      <main class="sa-main">

        <!-- ═══ OVERVIEW ═══ -->
        <template v-if="activeTab === 'overview'">
          <h2 class="page-title">Dashboard Overview</h2>

          <div v-if="loadingStats" class="center-loader"><div class="spinner"></div></div>
          <template v-else-if="stats">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-val">{{ stats.userCount }}</div>
                <div class="stat-lbl">Users</div>
              </div>
              <div class="stat-card">
                <div class="stat-val">{{ stats.itemCount }}</div>
                <div class="stat-lbl">Entries</div>
              </div>
              <div class="stat-card" :class="{ alert: (stats.reportCount ?? 0) > 0 }">
                <div class="stat-val">{{ stats.reportCount }}</div>
                <div class="stat-lbl">Open Reports</div>
              </div>
              <div class="stat-card" :class="{ warn: (stats.bannedCount ?? 0) > 0 }">
                <div class="stat-val">{{ stats.bannedCount }}</div>
                <div class="stat-lbl">Banned</div>
              </div>
            </div>

            <div class="sub-stats">
              <div class="sub-stat-group">
                <h3>User Statistics</h3>
                <div class="sub-stats-grid">
                  <div class="sub-stat"><span class="sub-val">{{ stats.verifiedUsers }}</span><span class="sub-lbl">Verified</span></div>
                  <div class="sub-stat"><span class="sub-val">{{ stats.unverifiedUsers }}</span><span class="sub-lbl">Unverified</span></div>
                  <div class="sub-stat"><span class="sub-val">{{ stats.adminCount }}</span><span class="sub-lbl">Admins</span></div>
                  <div class="sub-stat"><span class="sub-val">{{ stats.newUsersThisWeek }}</span><span class="sub-lbl">New (7 days)</span></div>
                </div>
              </div>
              <div class="sub-stat-group">
                <h3>Activity (7 days)</h3>
                <div class="sub-stats-grid">
                  <div class="sub-stat"><span class="sub-val">{{ stats.newItemsThisWeek }}</span><span class="sub-lbl">New Entries</span></div>
                  <div class="sub-stat"><span class="sub-val">{{ stats.reportCountTotal }}</span><span class="sub-lbl">Total Reports</span></div>
                  <div class="sub-stat"><span class="sub-val">{{ stats.reportCountProcessed }}</span><span class="sub-lbl">Processed</span></div>
                </div>
              </div>
            </div>

            <!-- Cleanup -->
            <div v-if="(stats.oldItemsCount ?? 0) > 0" class="cleanup-card">
              <div>
                <strong>Cleanup:</strong> {{ stats.oldItemsCount }} entries older than 90 days
              </div>
              <BaseButton @click="cleanupOldItems" :disabled="isCleaningUp" variant="ghost">
                <Trash2 :size="14" />
                {{ isCleaningUp ? 'Deleting…' : 'Clean up' }}
              </BaseButton>
            </div>
          </template>
        </template>

        <!-- ═══ USERS ═══ -->
        <template v-if="activeTab === 'users'">
          <div class="page-header">
            <h2 class="page-title">User Management</h2>
            <BaseButton @click="loadAllUsers" variant="ghost">Refresh</BaseButton>
          </div>

          <div class="table-wrap">
            <table class="data-table">
              <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Created</th>
                <th style="text-align:right">Actions</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="u in allUsers" :key="u.id" :class="{ 'row-banned': u.isBanned }">
                <td>
                  <div class="cell-email">{{ u.email }}</div>
                  <div class="cell-id">{{ u.id }}</div>
                </td>
                <td>
                  <span v-if="u.role === 'superadmin'" class="badge badge-purple">Admin</span>
                  <span v-else-if="u.isBanned" class="badge badge-red">Banned</span>
                  <span v-else class="badge badge-green">Active</span>
                  <span v-if="!u.emailVerified" class="badge badge-yellow">Unverified</span>
                </td>
                <td class="cell-date">{{ fmtDate(u.createdAt) }}</td>
                <td>
                  <div class="cell-actions">
                    <button class="btn-icon" @click="toggleActivity(u.id)" title="Activity log">
                      <FileText :size="15" />
                    </button>
                    <button v-if="u.role !== 'superadmin'" class="btn-icon" @click="toggleBan(u)" :title="u.isBanned ? 'Unban' : 'Ban'">
                      <Lock v-if="!u.isBanned" :size="15" />
                      <Unlock v-else :size="15" />
                    </button>
                    <button class="btn-icon" @click="pruneOldLogs(u)" title="Prune old logs">
                      <Eraser :size="15" />
                    </button>
                    <button v-if="u.role !== 'superadmin'" class="btn-icon danger" @click="deleteUser(u.id)" title="Delete">
                      <Trash2 :size="15" />
                    </button>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          <!-- Activity Drawer -->
          <Transition name="drawer">
            <div v-if="showActivityFor" class="drawer-overlay" @click.self="showActivityFor = null">
              <div class="drawer-panel">
                <div class="drawer-header">
                  <h3>Activity Log</h3>
                  <button class="btn-icon" @click="showActivityFor = null"><X :size="18" /></button>
                </div>
                <div v-if="loadingActivities[showActivityFor]" class="center-loader"><div class="spinner"></div></div>
                <ul v-else class="log-list">
                  <li v-for="(act, i) in userActivities[showActivityFor]" :key="i">
                    <span class="log-time">{{ new Date(act.at).toLocaleString() }}</span>
                    <span class="log-type">{{ act.type }}</span>
                    <pre class="log-meta">{{ JSON.stringify(act.meta, null, 2) }}</pre>
                  </li>
                </ul>
              </div>
            </div>
          </Transition>
        </template>

        <!-- ═══ REPORTS ═══ -->
        <template v-if="activeTab === 'reports'">
          <h2 class="page-title">Reported Content</h2>

          <div v-if="!reports.length" class="empty-msg">No reports found.</div>
          <template v-else>
            <div v-if="unprocessedReports.length" class="report-section">
              <h3 class="sub-heading">Open ({{ unprocessedReports.length }})</h3>
              <div class="card-grid">
                <div v-for="r in unprocessedReports" :key="r.id" class="report-card">
                  <div class="report-top">
                    <strong>{{ r.itemTitle }}</strong>
                    <span class="badge" :class="r.category === 'illegal' ? 'badge-red' : 'badge-yellow'">
                      {{ r.category === 'illegal' ? 'Illegal' : 'Misinformation' }}
                    </span>
                  </div>
                  <div class="report-reason" v-if="r.reason">"{{ r.reason }}"</div>
                  <div class="report-meta">
                    From: {{ r.reporterEmail }} · {{ fmtDate(r.reportedAt) }}
                  </div>
                  <div class="report-actions">
                    <BaseButton class="tiny" @click="toggleReportProcessed(r.id, false)" variant="ghost">
                      <Check :size="13" /> Resolve
                    </BaseButton>
                    <BaseButton class="tiny" @click="deleteReport(r.id)" variant="ghost">
                      <Trash2 :size="13" /> Delete
                    </BaseButton>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="processedReports.length" class="report-section processed-section">
              <h3 class="sub-heading muted">Processed ({{ processedReports.length }})</h3>
              <div class="card-grid">
                <div v-for="r in processedReports" :key="r.id" class="report-card processed">
                  <div class="report-top">
                    <strong>{{ r.itemTitle }}</strong>
                    <span class="badge badge-green">Resolved</span>
                  </div>
                  <div class="report-meta">{{ r.reporterEmail }} · {{ fmtDate(r.reportedAt) }}</div>
                  <div class="report-actions">
                    <BaseButton class="tiny" @click="toggleReportProcessed(r.id, true)" variant="ghost">
                      <RotateCcw :size="13" /> Reopen
                    </BaseButton>
                    <BaseButton class="tiny" @click="deleteReport(r.id)" variant="ghost">
                      <Trash2 :size="13" /> Delete
                    </BaseButton>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </template>

        <!-- ═══ DOC ═══ -->
        <template v-if="activeTab === 'doc'">
          <div class="doc-wrapper">
            <AdminDocEditor />
          </div>
        </template>

      </main>
    </div>
  </div>
</template>

<style scoped>
.sa-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-canvas);
  color: var(--color-on-surface);
}

/* ─── Header ─────────────────────────────────────────── */
.sa-header {
  height: 56px;
  border-bottom: 1px solid var(--color-canvas-border);
  background: var(--color-canvas);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 200;
}

.sa-header-inner {
  height: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sa-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sa-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  color: var(--color-sub);
  transition: all 0.15s;
}
.sa-back:hover { background: var(--color-surface-hover); color: var(--color-on-surface); }

.sa-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
}

/* ─── Body ───────────────────────────────────────────── */
.sa-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* ─── Sidebar ────────────────────────────────────────── */
.sa-sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-canvas-border);
  background: var(--color-canvas);
  padding: 12px 8px;
  overflow-y: auto;
}

.sa-nav { display: flex; flex-direction: column; gap: 2px; }

.sa-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--color-sub);
  font-size: var(--text-body);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s;
  text-align: left;
  width: 100%;
}
.sa-nav-item:hover { background: var(--color-surface-hover); color: var(--color-on-surface); }
.sa-nav-item.active { background: var(--ghost--hover); color: var(--color-on-surface); font-weight: 600; }

.sa-nav-icon { flex-shrink: 0; }
.sa-nav-label { flex: 1; }

.sa-nav-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 8px;
  background: var(--color-surface-hover);
  color: var(--color-sub);
}
.sa-nav-badge.danger { background: rgba(239,68,68,0.2); color: #ef4444; }

/* ─── Main ───────────────────────────────────────────── */
.sa-main {
  flex: 1;
  padding: 28px 32px 64px;
  overflow-y: auto;
  min-width: 0;
}

.page-title { font-size: 1.4rem; font-weight: 700; margin: 0 0 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header .page-title { margin: 0; }

/* ─── Stats ──────────────────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 28px;
}

.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  box-shadow: var(--shadow-input);
  border-radius: 12px;
  padding: 18px 16px;
  text-align: center;
}
.stat-card.alert { border-color: rgba(239,68,68,0.3); }
.stat-card.warn { border-color: rgba(245,158,11,0.3); }

.stat-val { font-size: 1.6rem; font-weight: 700; line-height: 1; }
.stat-lbl { font-size: var(--text-sub); color: var(--color-sub); margin-top: 4px; }

.sub-stats { display: flex; flex-direction: column; gap: 24px; margin-bottom: 28px; }
.sub-stat-group h3 { font-size: var(--text-title); font-weight: 600; margin: 0 0 12px; }
.sub-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }

.sub-stat {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  box-shadow: var(--shadow-input);
  border-radius: 10px;
  padding: 12px;
  text-align: center;
}
.sub-val { font-size: 1.15rem; font-weight: 700; display: block; }
.sub-lbl { font-size: var(--text-sub); color: var(--color-sub); }

.cleanup-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: var(--color-surface);
  border: 1px solid rgba(245,158,11,0.3);
  border-radius: 10px;
  font-size: var(--text-body);
  gap: 12px;
}
.cleanup-card .btn { display: inline-flex; align-items: center; gap: 6px; }

/* ─── Table ──────────────────────────────────────────── */
.table-wrap { overflow-x: auto; border: 1px solid var(--color-surface-border); box-shadow: var(--shadow-input); border-radius: 12px; }

.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 11px 14px; text-align: left; border-bottom: 1px solid var(--color-canvas-border); }
.data-table th { background: var(--color-surface); color: var(--color-sub); font-weight: 500; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
.data-table tr:last-child td { border-bottom: none; }
.row-banned { opacity: 0.6; }

.cell-email { font-weight: 500; }
.cell-id { font-size: 0.65rem; color: var(--color-sub); font-family: monospace; }
.cell-date { font-size: var(--text-sub); color: var(--color-sub); white-space: nowrap; }
.cell-actions { display: flex; gap: 2px; justify-content: flex-end; }

.badge { padding: 2px 7px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-right: 4px; }
.badge-green { background: rgba(16,185,129,0.15); color: #10b981; }
.badge-yellow { background: rgba(245,158,11,0.15); color: #f59e0b; }
.badge-red { background: rgba(239,68,68,0.15); color: #ef4444; }
.badge-purple { background: rgba(99,102,241,0.15); color: #6366f1; }

/* ─── Shared ─────────────────────────────────────────── */
.btn-icon {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 6px;
  background: transparent; border: none; color: var(--color-sub);
  cursor: pointer; transition: all 0.12s;
}
.btn-icon:hover { background: var(--color-surface-hover); color: var(--color-on-surface); }
.btn-icon.danger:hover { background: rgba(239,68,68,0.1); color: #ef4444; }

.btn.tiny { padding: 4px 10px; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px; }
.btn.tiny.danger { color: #ef4444; }

.empty-msg { text-align: center; color: var(--color-sub); padding: 40px; }

.sub-heading { font-size: 0.95rem; font-weight: 600; margin: 0 0 12px; }
.sub-heading.muted { color: var(--color-sub); }

/* ─── Reports ───────────────────────────────── */
.report-section { margin-bottom: 32px; }
.processed-section { opacity: 0.7; }
.processed-section:hover { opacity: 1; transition: opacity 0.2s; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 10px;
}

.report-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  box-shadow: var(--shadow-input);
  border-radius: 10px;
  padding: 14px 16px;
}
.report-card.processed { opacity: 0.8; }

.report-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.report-reason { color: var(--color-sub); font-size: var(--text-body); line-height: 1.4; margin-bottom: 8px; }
.report-meta { font-size: var(--text-sub); color: var(--color-sub); margin-bottom: 10px; }
.report-actions { display: flex; gap: 6px; }

/* ─── Drawer ─────────────────────────────────────────── */
.drawer-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 9000;
  display: flex; justify-content: flex-end;
}

.drawer-panel {
  width: 400px; max-width: 90vw;
  background: var(--color-canvas);
  border-left: 1px solid var(--color-canvas-border);
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.drawer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.drawer-header h3 { margin: 0; }

.drawer-enter-active { transition: opacity 0.2s; }
.drawer-enter-active .drawer-panel { transition: transform 0.25s ease; }
.drawer-enter-from { opacity: 0; }
.drawer-enter-from .drawer-panel { transform: translateX(100%); }
.drawer-leave-active { transition: opacity 0.3s; }
.drawer-leave-active .drawer-panel { transition: transform 0.25s ease; }
.drawer-leave-to { opacity: 0; }
.drawer-leave-to .drawer-panel { transform: translateX(100%); }

.log-list { list-style: none; padding: 0; }
.log-list li { border-bottom: 1px solid var(--color-canvas-border); padding: 10px 0; }
.log-time { font-size: 0.75rem; color: var(--color-sub); display: block; }
.log-type { font-weight: 500; }
.log-meta { background: var(--color-surface); padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; color: var(--color-sub); margin-top: 4px; overflow-x: auto; }

/* ─── Doc ────────────────────────────────────────────── */
.doc-wrapper { flex: 1; min-height: 0; display: flex; flex-direction: column; }

/* ─── Misc ───────────────────────────────────────────── */
.center-loader { display: flex; justify-content: center; padding: 40px; }
.spinner { width: 24px; height: 24px; border: 2px solid var(--color-canvas-border); border-top-color: var(--color-on-surface); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── Responsive ─────────────────────────────────────── */
@media (max-width: 900px) {
  .sa-body { flex-direction: column; }
  .sa-sidebar {
    width: 100%; border-right: none; border-bottom: 1px solid var(--color-canvas-border);
    padding: 8px; overflow-x: auto;
  }
  .sa-nav { flex-direction: row; gap: 4px; }
  .sa-nav-item { white-space: nowrap; padding: 8px 12px; justify-content: center; }
  .sa-nav-label { display: none; }
  .sa-nav-badge { display: none; }
  .sa-main { padding: 20px 16px 48px; }
  .drawer-panel { width: 100%; }
}
</style>