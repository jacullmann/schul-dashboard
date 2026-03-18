<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next';
import type { GroupStats } from '@/modules/admin/types';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  stats: GroupStats | null;
  cleaningUp: boolean;
  editingGroupName: boolean;
  groupName: string;
  newGroupName: string;
  savingGroupName: boolean;
}>();

const emit = defineEmits<{
  (e: 'cleanup'): void;
  (e: 'start-edit'): void;
  (e: 'cancel-edit'): void;
  (e: 'save-edit'): void;
  (e: 'update:newGroupName', value: string): void;
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
      <button class="btn ghost" @click="emit('cleanup')" :disabled="cleaningUp">
        {{ cleaningUp ? 'Löscht...' : 'Bereinigen' }}
      </button>
    </div>

    <!-- Group Settings -->
    <div class="settings-card">
      <h3>Gruppen-Einstellungen</h3>
      <div class="setting-row">
        <label>Gruppenname</label>
        <div v-if="!editingGroupName" class="setting-value">
          <span>{{ groupName }}</span>
          <button class="btn ghost tiny" @click="emit('start-edit')">{{ t('global.buttons.edit') }}</button>
        </div>
        <div v-else class="setting-edit">
          <input 
            :value="newGroupName"
            @input="emit('update:newGroupName', ($event.target as HTMLInputElement).value)"
            class="input" 
            placeholder="Neuer Gruppenname" 
            @keyup.enter="emit('save-edit')" 
          />
          <button class="btn action" @click="emit('save-edit')" :disabled="savingGroupName || !newGroupName.trim()">
            {{ savingGroupName ? 'Speichert...' : t('global.buttons.save') }}
          </button>
          <button class="btn ghost" @click="emit('cancel-edit')">{{ t('global.buttons.cancel') }}</button>
        </div>
      </div>
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
  background: var(--bg-surface);
  border: 1px solid var(--border-surface);
  box-shadow: var(--input-shadow);
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
  background: var(--bg-surface);
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
  font-size: var(--font-size-body);
  color: var(--sub);
}

.settings-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-surface);
  box-shadow: var(--input-shadow);
  border-radius: 12px;
  padding: 20px;
  margin-top: 20px;
}

.settings-card h3 {
  font-size: var(--font-size-title);
  font-weight: 600;
  margin: 0 0 16px;
}

.setting-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-row label {
  font-size: var(--font-size-sub);
  color: var(--sub);
  font-weight: 500;
}

.setting-value {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-value span {
  font-weight: 600;
}

.setting-edit {
  display: flex;
  gap: 8px;
  align-items: center;
}

.setting-edit .input {
  flex: 1;
  max-width: 300px;
}

@media (max-width: 640px) {
  .stats-row { grid-template-columns: 1fr 1fr; }
  .cleanup-bar { flex-direction: column; align-items: flex-start; }
  .setting-edit { flex-wrap: wrap; }
}
</style>
