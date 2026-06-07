<script setup lang="ts">
import { onMounted } from 'vue';
import { Trash2 } from '@lucide/vue';
import { useSuperAdminStats } from '../composables/useSuperAdminStats';

const { stats, loadingStats, isCleaningUp, loadStats, cleanupOldItems } =
  useSuperAdminStats();

onMounted(loadStats);
</script>

<template>
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
        <strong>Cleanup:</strong> {{ stats.oldItemsCount }} entries older than
        90 days
      </div>
      <BaseButton
        :disabled="isCleaningUp"
        variant="ghost"
        :icon="Trash2"
        @click="cleanupOldItems"
      >
        {{ isCleaningUp ? 'Deleting…' : 'Clean up' }}
      </BaseButton>
    </div>
  </template>
</template>

<style scoped>
.page-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 24px;
}

.center-loader {
  display: flex;
  justify-content: center;
  padding: 40px;
}

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
  font-size: var(--text-sm);
  color: var(--color-on-ghost-muted);
  margin-top: 4px;
}

.sub-stats {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 28px;
}
.sub-stat-group h3 {
  font-size: var(--text-lg);
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
  font-size: var(--text-sm);
  color: var(--color-on-ghost-muted);
}

.cleanup-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: var(--color-surface);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  font-size: var(--text-base);
  gap: 12px;
}
</style>
