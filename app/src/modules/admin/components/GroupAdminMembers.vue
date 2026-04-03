<script setup lang="ts">
import { RefreshCw, UserRoundMinus, Crown } from '@lucide/vue';
import InfoModal from '@/common/components/InfoModal.vue';
import type { GroupMember } from '@/modules/admin/types';
import { computed, ref } from 'vue';

const props = defineProps<{
  members: GroupMember[];
  bannedUsers?: { userId: string; generatedName: string; bannedAt: string }[];
  loading: boolean;
  loadingBanned?: boolean;
  isOwner?: boolean;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'change-role', userId: string, newRole: string): void;
  (e: 'remove', userId: string, name: string, ban: boolean): void;
  (e: 'revert-ban', userId: string): void;
  (e: 'transfer-ownership', userId: string): void;
}>();

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

const removeModal = ref({
  isOpen: false,
  userId: '',
  userName: '',
  ban: false
});

function openRemoveModal(userId: string, name: string) {
  removeModal.value = {
    isOpen: true,
    userId,
    userName: name,
    ban: false
  };
}

function closeRemoveModal() {
  removeModal.value.isOpen = false;
}

function confirmRemove() {
  emit('remove', removeModal.value.userId, removeModal.value.userName, removeModal.value.ban);
  closeRemoveModal();
}
</script>

<template>
  <div class="tab-panel">
    <PageHeader>
      Mitglieder

      <template #info>
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
      </template>

      <template #action>
        <BaseButton @click="emit('refresh')" :disabled="loading" variant="ghost">
          <RefreshCw :size="14" :class="{ 'spin-icon': loading }" />
          <span>Aktualisieren</span>
        </BaseButton>
      </template>
    </PageHeader>

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
          <BaseSelect
              extraClass="role-select"
              :modelValue="member.role"
              @update:modelValue="(val: string) => onRoleChange(member, val)"
              :disabled="member.role === 'admin' && !canDemoteAdmin"
              :options="[
                { label: 'Mitglied', value: 'user' },
                { label: 'Moderator', value: 'moderator' },
                { label: 'Admin', value: 'admin' },
              ]"
          />
          <button
              class="btn-icon danger"
              @click="openRemoveModal(member.userId, member.generatedName)"
              title="Aus Gruppe entfernen"
              :disabled="member.role === 'admin'"
          >
            <UserRoundMinus :size="15" />
          </button>
          <button
              v-if="isOwner && member.role === 'admin'"
              class="btn-icon transfer-btn"
              @click="emit('transfer-ownership', member.userId)"
              title="Eigentümerschaft übertragen"
          >
            <Crown :size="15" />
          </button>
        </div>
      </div>
    </div>

    <PageHeader class="mt-8">
      Banned Users
    </PageHeader>
    
    <div v-if="loadingBanned && (!bannedUsers || bannedUsers.length === 0)" class="empty-hint">Loading...</div>
    <div v-else-if="!bannedUsers || bannedUsers.length === 0" class="empty-hint">No banned users.</div>
    <div v-else class="members-list">
      <div v-for="user in bannedUsers" :key="user.userId" class="member-row">
        <div class="member-info">
          <span class="member-name">{{ user.generatedName }}</span>
          <span class="member-role-badge role-user">Banned On {{ new Date(user.bannedAt).toLocaleDateString('de-DE') }}</span>
        </div>
        <div class="member-actions">
          <BaseButton variant="ghost" @click="emit('revert-ban', user.userId)">
            Unban
          </BaseButton>
        </div>
      </div>
    </div>

    <BaseModal v-if="removeModal.isOpen" @cancel="closeRemoveModal">
      <template #title>Remove Member</template>

      <template #content>
        <p>Are you sure you want to remove <strong>{{ removeModal.userName }}</strong> from the group?</p>
        <p>Users can rejoin at any time if they have the credentials for your group. To block them from doing so you can ban them.</p>
        
        <BaseCheckbox v-model="removeModal.ban">Ban <strong>{{ removeModal.userName }}</strong> permanently</BaseCheckbox>
      </template>
      <template #action-btn>
        <BaseButton variant="danger" @click="confirmRemove">Remove</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.tab-panel { animation: fadeUp 0.2s ease; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
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
  padding: 8px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  box-shadow: var(--shadow-input);
  border-radius: var(--radius-lg);
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
  font-size: var(--text-body);
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
.role-user { color: var(--color-on-surface-muted); }

.member-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.role-select {
  width: 130px;
  font-size: var(--text-sub);
  padding: 6px 8px;
}

.empty-hint {
  text-align: center;
  padding: 32px;
  color: var(--color-on-surface-muted);
  font-size: var(--text-body);
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
  color: var(--color-on-surface-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-icon:hover { background: var(--color-surface-hover); color: var(--color-on-surface); }
.btn-icon.danger:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.btn-icon.transfer-btn:hover { background: rgba(99, 102, 241, 0.1); color: #6366f1; }
.btn-icon:disabled { opacity: 0.4; cursor: not-allowed; }

@media (max-width: 640px) {
  .member-row { flex-direction: column; align-items: flex-start; gap: 8px; }
  .member-actions { width: 100%; }
}
</style>