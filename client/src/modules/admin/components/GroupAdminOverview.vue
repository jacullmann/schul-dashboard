<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next';
import type { GroupStats } from '@/modules/admin/types';

const props = defineProps<{
  stats: GroupStats | null;
  cleaningUp: boolean;
}>();

const emit = defineEmits<{
  (e: 'cleanup'): void;
}>();
</script>

<template>
  <div class="tab-panel">
    <div class="stats-row">
      <div class="stat-tile">
        <span class="stat-value">{{ stats?.itemCount ?? '–' }}</span>
        <span class="stat-label">Aktive Einträge</span>
      </div>
      <div class="stat-tile">
        <span class="stat-value">{{ stats?.memberCount ?? '–' }}</span>
        <span class="stat-label">Mitglieder</span>
      </div>
      <div class="stat-tile">
        <span class="stat-value">{{ stats?.subsCount ?? '–' }}</span>
        <span class="stat-label">Stundenplanänderungen</span>
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
      <BaseButton @click="emit('cleanup')" :disabled="cleaningUp" variant="ghost">
        {{ cleaningUp ? 'Löscht...' : 'Bereinigen' }}
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.tab-panel { animation: fadeUp 0.2s ease; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.stat-tile {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  box-shadow: var(--shadow-input);
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
  font-size: var(--text-sub);
  color: var(--color-on-surface-muted);
}

.cleanup-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-surface);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  padding: 12px 16px;
  gap: 12px;
  margin-bottom: 24px;
}

.cleanup-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-body);
  color: var(--color-on-surface-muted);
}

@media (max-width: 640px) {
  .stats-row { grid-template-columns: 1fr 1fr; }
  .cleanup-bar { flex-direction: column; align-items: flex-start; }
  .setting-edit { flex-wrap: wrap; }
}
</style>
