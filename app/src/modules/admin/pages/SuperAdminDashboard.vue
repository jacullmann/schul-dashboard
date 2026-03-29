<script setup lang="ts">
import { ref, computed, onMounted, markRaw } from 'vue';
import {
  LayoutDashboard,
  Users,
  Flag,
  FileText as FileTextIcon,
  Lock,
  Unlock,
  Trash2,
  Eraser,
  Check,
  RotateCcw,
  X,
  FileText,
  Layers,
} from '@lucide/vue';
import hw from '@/api/hwApi';
import AdminLayout from '@/modules/admin/components/AdminLayout.vue';
import AdminDocEditor from '@/modules/admin/components/AdminDocEditor.vue';
import { useToast } from '@/common/composables/useToast';

const { success: toastSuccess, error: toastError } = useToast();

const activeTab = ref('overview');

const navItems = computed(() => [
  {
    id: 'overview',
    label: 'Overview',
    icon: markRaw(LayoutDashboard),
    count: 0,
  },
  { id: 'users', label: 'Users', icon: markRaw(Users), count: 0 },
  {
    id: 'reports',
    label: 'Reports',
    icon: markRaw(Flag),
    count: stats.value?.reportCount ?? 0,
    danger: true,
  },
  { id: 'groups', label: 'Groups', icon: markRaw(Layers), count: 0 },
  { id: 'doc', label: 'Doc', icon: markRaw(FileTextIcon), count: 0 },
]);

// ─── Types ──────────────────────────────────────────────────────────────────

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

interface Group {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string | null;
  createdAt: string;
  memberCount: number;
  itemCount: number;
}

interface UserActivity {
  at: string;
  type: string;
  meta: Record<string, unknown>;
}

// ─── State ──────────────────────────────────────────────────────────────────

const stats = ref<AdminStats | null>(null);
const loadingStats = ref(false);
const allUsers = ref<User[]>([]);
const reports = ref<Report[]>([]);
const groups = ref<Group[]>([]);
const loadingGroups = ref(false);
const showActivityFor = ref<string | null>(null);
const userActivities = ref<Record<string, UserActivity[]>>({});
const loadingActivities = ref<Record<string, boolean>>({});
const isCleaningUp = ref(false);

const unprocessedReports = computed(() =>
  reports.value.filter((r) => !r.processed),
);
const processedReports = computed(() =>
  reports.value.filter((r) => r.processed),
);

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ─── Data loading ────────────────────────────────────────────────────────────

async function loadStats() {
  loadingStats.value = true;
  try {
    const { data } = await hw.get('/api/admin/stats');
    stats.value = data;
  } catch (e) {
    console.error(e);
  } finally {
    loadingStats.value = false;
  }
}

async function loadAllUsers() {
  try {
    const { data } = await hw.get('/api/admin/all-users');
    allUsers.value = data;
  } catch {
    toastError('Failed to load users.');
  }
}

async function loadReports() {
  try {
    const { data } = await hw.get('/api/admin/reports');
    reports.value = data;
  } catch {
    // Silently ignore report load errors.
  }
}

async function loadGroups() {
  loadingGroups.value = true;
  try {
    const { data } = await hw.get('/api/admin/groups');
    groups.value = data;
  } catch {
    toastError('Failed to load groups.');
  } finally {
    loadingGroups.value = false;
  }
}

// ─── User actions ─────────────────────────────────────────────────────────────

async function toggleActivity(userId: string) {
  if (showActivityFor.value === userId) {
    showActivityFor.value = null;
    return;
  }
  loadingActivities.value[userId] = true;
  try {
    const { data } = await hw.get(`/api/admin/users/${userId}/activity`);
    userActivities.value[userId] = data;
    showActivityFor.value = userId;
  } catch {
    toastError('Failed to load activity.');
  } finally {
    loadingActivities.value[userId] = false;
  }
}

async function toggleBan(u: User) {
  if (u.role === 'superadmin') return;
  try {
    if (u.isBanned) {
      await hw.delete(`/api/admin/users/${u.id}/ban`);
      u.isBanned = false;
      toastSuccess('User unbanned.');
    } else {
      await hw.post(`/api/admin/users/${u.id}/ban`);
      u.isBanned = true;
      toastSuccess('User banned.');
    }
    loadStats();
  } catch {
    toastError('Action failed.');
  }
}

async function deleteUser(id: string) {
  if (!confirm('Delete this user?')) return;
  try {
    await hw.delete(`/api/admin/users/${id}`);
    allUsers.value = allUsers.value.filter((u) => u.id !== id);
    toastSuccess('User deleted.');
    loadStats();
  } catch {
    toastError('Failed to delete user.');
  }
}

async function pruneOldLogs(u: User) {
  if (!confirm(`Delete activity logs older than 30 days for ${u.email}?`))
    return;
  try {
    await hw.delete(`/api/admin/users/${u.id}/activity/prune`);
    toastSuccess('Logs pruned.');
  } catch {
    toastError('Failed to prune logs.');
  }
}

// ─── Report actions ───────────────────────────────────────────────────────────

async function toggleReportProcessed(id: string, currentProcessed: boolean) {
  try {
    await hw.patch(`/api/admin/reports/${id}/processed`, {
      processed: !currentProcessed,
    });
    const r = reports.value.find((x) => x.id === id);
    if (r) {
      r.processed = !currentProcessed;
      r.processedAt = !currentProcessed ? new Date().toISOString() : null;
    }
    toastSuccess(!currentProcessed ? 'Marked as resolved.' : 'Reopened.');
    loadStats();
  } catch {
    toastError('Action failed.');
  }
}

async function deleteReport(id: string) {
  if (!confirm('Delete this report?')) return;
  try {
    await hw.delete(`/api/admin/reports/${id}`);
    reports.value = reports.value.filter((r) => r.id !== id);
    toastSuccess('Report deleted.');
    loadStats();
  } catch {
    toastError('Failed to delete report.');
  }
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

async function cleanupOldItems() {
  if (!confirm('Delete all entries older than 90 days?')) return;
  isCleaningUp.value = true;
  try {
    const { data } = await hw.delete('/api/admin/cleanup/old-items');
    toastSuccess(data.message || 'Cleanup complete.');
    loadStats();
  } catch {
    toastError('Cleanup failed.');
  } finally {
    isCleaningUp.value = false;
  }
}

// ─── Group actions ────────────────────────────────────────────────────────────

async function deleteGroup(g: Group) {
  if (
    !confirm(
      `Delete group "${g.name}"?\n\nThis will permanently delete the group and all associated data. This cannot be undone.`,
    )
  )
    return;
  try {
    await hw.delete(`/api/admin/groups/${g.id}`);
    groups.value = groups.value.filter((x) => x.id !== g.id);
    toastSuccess(`Group "${g.name}" deleted.`);
  } catch {
    toastError('Failed to delete group.');
  }
}

onMounted(() => {
  loadStats();
  loadAllUsers();
  loadReports();
  loadGroups();
});
</script>

<template>
  <AdminLayout
    title="Super Admin"
    back-to="/home"
    :nav-items="navItems"
    :active-tab="activeTab"
    @update:active-tab="activeTab = $event"
  >
    <!-- ═══ OVERVIEW ═══ -->
    <template v-if="activeTab === 'overview'">
      <h2 class="page-title">Dashboard Overview</h2>

      <div v-if="loadingStats" class="center-loader">
        <BaseSpinner on="ghost" size="24px" />
      </div>
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
          <div
            class="stat-card"
            :class="{ alert: (stats.reportCount ?? 0) > 0 }"
          >
            <div class="stat-val">{{ stats.reportCount }}</div>
            <div class="stat-lbl">Open Reports</div>
          </div>
          <div
            class="stat-card"
            :class="{ warn: (stats.bannedCount ?? 0) > 0 }"
          >
            <div class="stat-val">{{ stats.bannedCount }}</div>
            <div class="stat-lbl">Banned</div>
          </div>
        </div>

        <div class="sub-stats">
          <div class="sub-stat-group">
            <h3>User Statistics</h3>
            <div class="sub-stats-grid">
              <div class="sub-stat">
                <span class="sub-val">{{ stats.verifiedUsers }}</span>
                <span class="sub-lbl">Verified</span>
              </div>
              <div class="sub-stat">
                <span class="sub-val">{{ stats.unverifiedUsers }}</span>
                <span class="sub-lbl">Unverified</span>
              </div>
              <div class="sub-stat">
                <span class="sub-val">{{ stats.adminCount }}</span>
                <span class="sub-lbl">Admins</span>
              </div>
              <div class="sub-stat">
                <span class="sub-val">{{ stats.newUsersThisWeek }}</span>
                <span class="sub-lbl">New (7 days)</span>
              </div>
            </div>
          </div>
          <div class="sub-stat-group">
            <h3>Activity (7 days)</h3>
            <div class="sub-stats-grid">
              <div class="sub-stat">
                <span class="sub-val">{{ stats.newItemsThisWeek }}</span>
                <span class="sub-lbl">New Entries</span>
              </div>
              <div class="sub-stat">
                <span class="sub-val">{{ stats.reportCountTotal }}</span>
                <span class="sub-lbl">Total Reports</span>
              </div>
              <div class="sub-stat">
                <span class="sub-val">{{ stats.reportCountProcessed }}</span>
                <span class="sub-lbl">Processed</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="(stats.oldItemsCount ?? 0) > 0" class="cleanup-card">
          <div>
            <strong>Cleanup:</strong> {{ stats.oldItemsCount }} entries older
            than 90 days
          </div>
          <BaseButton
            @click="cleanupOldItems"
            :disabled="isCleaningUp"
            variant="ghost"
          >
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
              <th>Registered</th>
              <th style="text-align: right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="u in allUsers"
              :key="u.id"
              :class="{ 'row-banned': u.isBanned }"
            >
              <td>
                <div class="cell-email">{{ u.email }}</div>
                <div class="cell-id">{{ u.id }}</div>
              </td>
              <td>
                <span v-if="u.role === 'superadmin'" class="badge badge-purple"
                  >Admin</span
                >
                <span v-else-if="u.isBanned" class="badge badge-red"
                  >Banned</span
                >
                <span v-else class="badge badge-green">Active</span>
                <span v-if="!u.emailVerified" class="badge badge-yellow"
                  >Unverified</span
                >
              </td>
              <td class="cell-date">{{ fmtDate(u.createdAt) }}</td>
              <td>
                <div class="cell-actions">
                  <button
                    class="btn-icon"
                    @click="toggleActivity(u.id)"
                    title="Activity log"
                  >
                    <FileText :size="15" />
                  </button>
                  <button
                    v-if="u.role !== 'superadmin'"
                    class="btn-icon"
                    @click="toggleBan(u)"
                    :title="u.isBanned ? 'Unban' : 'Ban'"
                  >
                    <Lock v-if="!u.isBanned" :size="15" />
                    <Unlock v-else :size="15" />
                  </button>
                  <button
                    class="btn-icon"
                    @click="pruneOldLogs(u)"
                    title="Prune old logs"
                  >
                    <Eraser :size="15" />
                  </button>
                  <button
                    v-if="u.role !== 'superadmin'"
                    class="btn-icon danger"
                    @click="deleteUser(u.id)"
                    title="Delete"
                  >
                    <Trash2 :size="15" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Activity drawer -->
      <Transition name="drawer">
        <div
          v-if="showActivityFor"
          class="drawer-overlay"
          @click.self="showActivityFor = null"
        >
          <div class="drawer-panel">
            <div class="drawer-header">
              <h3>Activity Log</h3>
              <button class="btn-icon" @click="showActivityFor = null">
                <X :size="18" />
              </button>
            </div>
            <div
              v-if="loadingActivities[showActivityFor]"
              class="center-loader"
            >
              <BaseSpinner on="ghost" size="24px" />
            </div>
            <ul v-else class="log-list">
              <li v-for="(act, i) in userActivities[showActivityFor]" :key="i">
                <span class="log-time">{{
                  new Date(act.at).toLocaleString()
                }}</span>
                <span class="log-type">{{ act.type }}</span>
                <pre class="log-meta">{{
                  JSON.stringify(act.meta, null, 2)
                }}</pre>
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
            <div
              v-for="r in unprocessedReports"
              :key="r.id"
              class="report-card"
            >
              <div class="report-top">
                <strong>{{ r.itemTitle }}</strong>
                <span
                  class="badge"
                  :class="
                    r.category === 'illegal' ? 'badge-red' : 'badge-yellow'
                  "
                >
                  {{ r.category === 'illegal' ? 'Illegal' : 'Misinformation' }}
                </span>
              </div>
              <div class="report-reason" v-if="r.reason">"{{ r.reason }}"</div>
              <div class="report-meta">
                From: {{ r.reporterEmail }} · {{ fmtDate(r.reportedAt) }}
              </div>
              <div class="report-actions">
                <BaseButton
                  class="tiny"
                  @click="toggleReportProcessed(r.id, false)"
                  variant="ghost"
                >
                  <Check :size="13" /> Resolve
                </BaseButton>
                <BaseButton
                  class="tiny"
                  @click="deleteReport(r.id)"
                  variant="ghost"
                >
                  <Trash2 :size="13" /> Delete
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
        <div
          v-if="processedReports.length"
          class="report-section processed-section"
        >
          <h3 class="sub-heading muted">
            Processed ({{ processedReports.length }})
          </h3>
          <div class="card-grid">
            <div
              v-for="r in processedReports"
              :key="r.id"
              class="report-card processed"
            >
              <div class="report-top">
                <strong>{{ r.itemTitle }}</strong>
                <span class="badge badge-green">Resolved</span>
              </div>
              <div class="report-meta">
                {{ r.reporterEmail }} · {{ fmtDate(r.reportedAt) }}
              </div>
              <div class="report-actions">
                <BaseButton
                  class="tiny"
                  @click="toggleReportProcessed(r.id, true)"
                  variant="ghost"
                >
                  <RotateCcw :size="13" /> Reopen
                </BaseButton>
                <BaseButton
                  class="tiny"
                  @click="deleteReport(r.id)"
                  variant="ghost"
                >
                  <Trash2 :size="13" /> Delete
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- ═══ GROUPS ═══ -->
    <template v-if="activeTab === 'groups'">
      <div class="page-header">
        <h2 class="page-title">Group Management</h2>
        <BaseButton @click="loadGroups" variant="ghost">Refresh</BaseButton>
      </div>

      <div v-if="loadingGroups" class="center-loader">
        <BaseSpinner on="ghost" size="24px" />
      </div>
      <div v-else-if="!groups.length" class="empty-msg">No groups found.</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Owner</th>
              <th>Members</th>
              <th>Entries</th>
              <th>Created</th>
              <th style="text-align: right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in groups" :key="g.id">
              <td>
                <div class="cell-email">{{ g.name }}</div>
                <div class="cell-id">{{ g.id }}</div>
              </td>
              <td>
                <div class="cell-email">{{ g.ownerEmail ?? '—' }}</div>
                <div class="cell-id">{{ g.ownerId }}</div>
              </td>
              <td>{{ g.memberCount }}</td>
              <td>{{ g.itemCount }}</td>
              <td class="cell-date">{{ fmtDate(g.createdAt) }}</td>
              <td>
                <div class="cell-actions">
                  <button
                    class="btn-icon danger"
                    @click="deleteGroup(g)"
                    title="Delete group"
                  >
                    <Trash2 :size="15" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ═══ DOC ═══ -->
    <template v-if="activeTab === 'doc'">
      <div class="doc-wrapper">
        <AdminDocEditor />
      </div>
    </template>
  </AdminLayout>
</template>

<style scoped>
.page-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header .page-title {
  margin: 0;
}

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

.stat-card.alert {
  border-color: rgba(239, 68, 68, 0.3);
}
.stat-card.warn {
  border-color: rgba(245, 158, 11, 0.3);
}

.stat-val {
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1;
}
.stat-lbl {
  font-size: var(--text-sub);
  color: var(--color-on-surface-muted);
  margin-top: 4px;
}

.sub-stats {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 28px;
}
.sub-stat-group h3 {
  font-size: var(--text-title);
  font-weight: 600;
  margin: 0 0 12px;
}
.sub-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.sub-stat {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  box-shadow: var(--shadow-input);
  border-radius: 10px;
  padding: 12px;
  text-align: center;
}

.sub-val {
  font-size: 1.15rem;
  font-weight: 700;
  display: block;
}
.sub-lbl {
  font-size: var(--text-sub);
  color: var(--color-on-surface-muted);
}

.cleanup-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: var(--color-surface);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  font-size: var(--text-body);
  gap: 12px;
}

/* ─── Table ─────────────────────────────────────────────────────────────────── */
.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-surface-border);
  box-shadow: var(--shadow-input);
  border-radius: 12px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th,
.data-table td {
  padding: 11px 14px;
  text-align: left;
  border-bottom: 1px solid var(--color-canvas-border);
}
.data-table th {
  background: var(--color-surface);
  color: var(--color-on-surface-muted);
  font-weight: 500;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.data-table tr:last-child td {
  border-bottom: none;
}
.row-banned {
  opacity: 0.6;
}

.cell-email {
  font-weight: 500;
}
.cell-id {
  font-size: 0.65rem;
  color: var(--color-on-surface-muted);
  font-family: monospace;
}
.cell-date {
  font-size: var(--text-sub);
  color: var(--color-on-surface-muted);
  white-space: nowrap;
}
.cell-actions {
  display: flex;
  gap: 2px;
  justify-content: flex-end;
}

/* ─── Badges ─────────────────────────────────────────────────────────────────── */
.badge {
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-right: 4px;
}
.badge-green {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}
.badge-yellow {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}
.badge-red {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.badge-purple {
  background: rgba(99, 102, 241, 0.15);
  color: #6366f1;
}

/* ─── Icon buttons ───────────────────────────────────────────────────────────── */
.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: var(--color-on-surface-muted);
  cursor: pointer;
  transition: all 0.12s;
}

.btn-icon:hover {
  background: var(--color-surface-hover);
  color: var(--color-on-surface);
}
.btn-icon.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
.btn.tiny {
  padding: 4px 10px;
  font-size: 0.78rem;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.btn.tiny.danger {
  color: #ef4444;
}

/* ─── Reports ───────────────────────────────── */
.report-section {
  margin-bottom: 32px;
}
.processed-section {
  opacity: 0.7;
}
.processed-section:hover {
  opacity: 1;
  transition: opacity 0.2s;
}

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

.report-card.processed {
  opacity: 0.8;
}
.report-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.report-reason {
  color: var(--color-on-surface-muted);
  font-size: var(--text-body);
  line-height: 1.4;
  margin-bottom: 8px;
}
.report-meta {
  font-size: var(--text-sub);
  color: var(--color-on-surface-muted);
  margin-bottom: 10px;
}
.report-actions {
  display: flex;
  gap: 6px;
}

/* ─── Drawer ─────────────────────────────────────────────────────────────────── */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 9000;
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: 400px;
  max-width: 90vw;
  background: var(--color-canvas);
  border-left: 1px solid var(--color-canvas-border);
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.drawer-header h3 {
  margin: 0;
}

.drawer-enter-active {
  transition: opacity 0.2s;
}
.drawer-enter-active .drawer-panel {
  transition: transform 0.25s ease;
}
.drawer-enter-from {
  opacity: 0;
}
.drawer-enter-from .drawer-panel {
  transform: translateX(100%);
}
.drawer-leave-active {
  transition: opacity 0.3s;
}
.drawer-leave-active .drawer-panel {
  transition: transform 0.25s ease;
}
.drawer-leave-to {
  opacity: 0;
}
.drawer-leave-to .drawer-panel {
  transform: translateX(100%);
}

.log-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.log-list li {
  border-bottom: 1px solid var(--color-canvas-border);
  padding: 10px 0;
}
.log-time {
  font-size: 0.75rem;
  color: var(--color-on-surface-muted);
  display: block;
}
.log-type {
  font-weight: 500;
}
.log-meta {
  background: var(--color-surface);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  color: var(--color-on-surface-muted);
  margin-top: 4px;
  overflow-x: auto;
}

/* ─── Doc ────────────────────────────────────────────────────────────────────── */
.doc-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* ─── Misc ───────────────────────────────────────────────────────────────────── */
.center-loader {
  display: flex;
  justify-content: center;
  padding: 40px;
}
.empty-msg {
  text-align: center;
  color: var(--color-on-surface-muted);
  padding: 40px;
}
.sub-heading {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 12px;
}
.sub-heading.muted {
  color: var(--color-on-surface-muted);
}
.tiny {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
