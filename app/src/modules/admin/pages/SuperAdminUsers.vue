<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Lock, Unlock, Eraser, Trash2, FileText, X } from '@lucide/vue';
import { useSuperAdminUsers } from '../composables/useSuperAdminUsers';
import { useSuperAdminFormat } from '../composables/useSuperAdminFormat';

const {
  users,
  activities,
  loadingActivities,
  loadUsers,
  fetchActivity,
  toggleBan,
  deleteUser,
  pruneOldLogs,
} = useSuperAdminUsers();
const { fmtDate } = useSuperAdminFormat();

const showActivityFor = ref<string | null>(null);

async function toggleActivity(userId: string) {
  if (showActivityFor.value === userId) {
    showActivityFor.value = null;
    return;
  }
  if (await fetchActivity(userId)) showActivityFor.value = userId;
}

onMounted(loadUsers);
</script>

<template>
  <div class="page-header">
    <h2 class="page-title">User Management</h2>
    <BaseButton variant="ghost" @click="loadUsers">Refresh</BaseButton>
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
          v-for="u in users"
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
            <span v-else-if="u.isBanned" class="badge badge-red">Banned</span>
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
                title="Activity log"
                @click="toggleActivity(u.id)"
              >
                <FileText :size="15" />
              </button>
              <button
                v-if="u.role !== 'superadmin'"
                class="btn-icon"
                :title="u.isBanned ? 'Unban' : 'Ban'"
                @click="toggleBan(u)"
              >
                <Lock v-if="!u.isBanned" :size="15" />
                <Unlock v-else :size="15" />
              </button>
              <button
                class="btn-icon"
                title="Prune old logs"
                @click="pruneOldLogs(u)"
              >
                <Eraser :size="15" />
              </button>
              <button
                v-if="u.role !== 'superadmin'"
                class="btn-icon danger"
                title="Delete"
                @click="deleteUser(u.id)"
              >
                <Trash2 :size="15" />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

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
        <div v-if="loadingActivities[showActivityFor]" class="center-loader">
          <BaseSpinner on="ghost" size="24px" />
        </div>
        <ul v-else class="log-list">
          <li v-for="(act, i) in activities[showActivityFor]" :key="i">
            <span class="log-time">{{
              new Date(act.at).toLocaleString()
            }}</span>
            <span class="log-type">{{ act.type }}</span>
            <pre class="log-meta">{{ JSON.stringify(act.meta, null, 2) }}</pre>
          </li>
        </ul>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0;
}

.center-loader {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-ghost-border);
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
  border-bottom: 1px solid var(--color-ghost-border);
}
.data-table th {
  background: var(--color-surface);
  color: var(--color-on-ghost-muted);
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
  color: var(--color-on-ghost-muted);
  font-family: monospace;
}
.cell-date {
  font-size: var(--text-sm);
  color: var(--color-on-ghost-muted);
  white-space: nowrap;
}
.cell-actions {
  display: flex;
  gap: 2px;
  justify-content: flex-end;
}

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

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: var(--color-on-ghost-muted);
  cursor: pointer;
  transition: all 0.12s;
}
.btn-icon:hover {
  background: var(--color-surface-hover);
  color: var(--color-on-ghost);
}
.btn-icon.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

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
  border-left: 1px solid var(--color-ghost-border);
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
  border-bottom: 1px solid var(--color-ghost-border);
  padding: 10px 0;
}
.log-time {
  font-size: 0.75rem;
  color: var(--color-on-ghost-muted);
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
  color: var(--color-on-ghost-muted);
  margin-top: 4px;
  overflow-x: auto;
}
</style>
