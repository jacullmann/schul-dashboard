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
  <div v-else class="overflow-x-auto">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>ID</th>
          <th>Owner</th>
          <th>Members</th>
          <th>Tasks</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="g in groups" :key="g.id">
          <td>{{ g.name }}</td>
          <td>{{ g.id }}</td>
          <td>{{ g.ownerEmail ?? '—' }}</td>
          <td>{{ g.memberCount }}</td>
          <td>{{ g.itemCount }}</td>
          <td>{{ fmtDate(g.createdAt) }}</td>
          <td class="py-0! px-2! min-w-0!">
            <BaseTooltip content="Delete group">
              <BaseButton
                variant="ghost"
                size="sm"
                :icon="Trash2"
                @click="deleteGroup(g)"
              />
            </BaseTooltip>
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
