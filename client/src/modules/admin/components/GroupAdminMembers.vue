<script setup lang="ts">
import { RefreshCw, UserRoundMinus, Crown } from 'lucide-vue-next';
import InfoModal from '@/common/components/InfoModal.vue';
import type { GroupMember } from '@/modules/admin/types';
import { useGroupAdmin } from '@/modules/admin/composables/useGroupAdmin';
import { computed } from 'vue';

const props = defineProps<{
  members: GroupMember[];
  loading: boolean;
  isOwner?: boolean;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'change-role', userId: string, newRole: string): void;
  (e: 'remove', userId: string, name: string): void;
}>();

const { transferOwnership } = useGroupAdmin();
const canDemoteAdmin = computed(() => props.isOwner);

function roleLabel(role: string): string {
  const map: Record<string, string> = { admin: 'Admin', moderator: 'Moderator', user: 'Mitglied' };
  return map[role] || role;
}

function onRoleChange(member: GroupMember, newRole: string) {
  if (newRole !== member.role) {
    emit('change-role', member.userId, newRole);
  }
}
</script>

<template>
  <div class="tab-panel">
    <div class="panel-header">
      <div class="title-inf">
        <h2>Mitglieder</h2>
        <InfoModal
          tooltip="Übersicht des Mitgliedermenüs"
          title="Mitglieder"
        >
          <h3>Verwalte Mitglieder deiner Gruppe</h3>

          <h3>Mitgliedsliste</h3>
          <p>Hier siehst du eine Liste aller Mitglieder deiner Gruppe zusammen mit ihren Berechtigungen (Mitglied, Moderator, Admin). Um die Daten der Nutzer zu schützen wird ein automatisch generierter Alias angezeigt. Über das Dropdown-Menü kannst du die Rolle eines Mitglieds ändern.</p>
          
          <h3>Rollen ändern</h3>
          <p>Wenn du die Rolle eines Nutzers ändern willst, um ihm Berechtigungen zu erteilen oder zu entziehen, kannst du dies über das Dropdown-Menü, das neben jedem Mitglied steht, tun. </p>
          
          <h3>Mitglieder entfernen</h3>
          <p>Um ein Mitglied aus der Gruppe zu entfernen, klicke auf das entsprechende Symbol neben dem Dropdown-Menü. Admins können nicht entfernt werden.</p>
        </InfoModal>
      </div>
      <button class="btn ghost" @click="emit('refresh')" :disabled="loading">
        <RefreshCw :size="14" :class="{ 'spin-icon': loading }" />
        <span>Aktualisieren</span>
      </button>
    </div>

    <div v-if="loading && members.length === 0" class="empty-hint">Lädt...</div>
    <div v-else-if="members.length === 0" class="empty-hint">Keine Mitglieder gefunden.</div>

    <div v-else class="members-list">
      <div v-for="member in members" :key="member.userId" class="member-row">
        <div class="member-info">
          <span class="member-name">{{ member.generatedName }}</span>
          <span class="member-role-badge" :class="'role-' + member.role">
            {{ roleLabel(member.role) }}
          </span>
        </div>
        <div class="member-actions">
          <select
              class="input role-select"
              :value="member.role"
              @change="onRoleChange(member, ($event.target as HTMLSelectElement).value)"
              :disabled="member.role === 'admin' && !canDemoteAdmin"
          >
            <option value="user">Mitglied</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </select>
          <button
              class="btn-icon danger"
              @click="emit('remove', member.userId, member.generatedName)"
              title="Aus Gruppe entfernen"
              :disabled="member.role === 'admin'"
          >
            <UserRoundMinus :size="15" />
          </button>
          <button
              v-if="isOwner && member.role === 'admin'"
              class="btn-icon transfer-btn"
              @click="transferOwnership(member.userId)"
              title="Eigentümerschaft übertragen"
          >
            <Crown :size="15" />
          </button>
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

.title-inf {
  display: flex;
  align-items: center;
  gap: 8px;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border-surface);
  box-shadow: var(--input-shadow);
  border-radius: 10px;
  gap: 12px;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.member-name {
  font-weight: 600;
  font-size: var(--font-size-body);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-role-badge {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.role-admin { color: #6366f1; }
.role-moderator { color: #f59e0b; }
.role-user { color: var(--sub); }

.member-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.role-select {
  width: 130px;
  font-size: var(--font-size-sub);
  padding: 6px 8px;
}

.empty-hint {
  text-align: center;
  padding: 32px;
  color: var(--sub);
  font-size: var(--font-size-body);
}

.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

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

.btn-icon:hover { background: var(--bg-interactive-hover); color: var(--text-default); }
.btn-icon.danger:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.btn-icon.transfer-btn:hover { background: rgba(99, 102, 241, 0.1); color: #6366f1; }
.btn-icon:disabled { opacity: 0.4; cursor: not-allowed; }

@media (max-width: 640px) {
  .member-row { flex-direction: column; align-items: flex-start; gap: 8px; }
  .member-actions { width: 100%; }
}
</style>
