<script setup lang="ts">
import { onMounted } from 'vue';
import { Trash2 } from '@lucide/vue';
import { useSuperAdminGroups } from '../composables/useSuperAdminGroups';
import { useSuperAdminFormat } from '../composables/useSuperAdminFormat';

const { groups, loadingGroups, loadGroups, deleteGroup } =
  useSuperAdminGroups();
const { fmtDate } = useSuperAdminFormat();

onMounted(loadGroups);
</script>

<template>
  <div class="page-header">
    <h2 class="page-title">Group Management</h2>
    <BaseButton variant="ghost" @click="loadGroups">Refresh</BaseButton>
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
          <th>Tasks</th>
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
                title="Delete group"
                @click="deleteGroup(g)"
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
.empty-msg {
  text-align: center;
  color: var(--color-on-ghost-muted);
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
</style>
