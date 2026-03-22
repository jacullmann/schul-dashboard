<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { UserRoundPlus, Plus, ShieldUser, Folder, FolderOpen, ChevronRight, UsersRound } from 'lucide-vue-next';
import JoinGroupModal from '@/modules/auth/components/JoinGroupModal.vue';
import CreateGroupModal from '@/modules/auth/components/CreateGroupModal.vue';
import hw from '@/api/hwApi';
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const router = useRouter();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const { activeGroupId, userGroups, switchActiveGroup } = useAppAuth();

const showJoinModal = ref(false);
const showCreateModal = ref(false);
const loading = ref(false);
const navigatingGroupId = ref<string | null>(null);
const allGroups = ref<Array<{ id: string; name: string; memberCount: number; created_at: string }>>([]);

const isSuperadmin = computed(() => user.value?.role === 'superadmin');

const displayName = computed(() => {
  if (!user.value?.email) return '';
  return user.value.email.split('@')[0];
});

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 6) return 'groups.home.goodNight';
  if (h < 12) return 'groups.home.goodMorning';
  if (h < 18) return 'groups.home.goodDay';
  return 'groups.home.goodEvening';
});

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    admin: 'Admin',
    mod: 'Moderator',
    moderator: 'Moderator',
    user: 'Mitglied',
    superadmin: 'Super Admin',
  };
  return map[role] || role;
}

async function navigateToGroup(groupId: string) {
  if (navigatingGroupId.value) return; // Prevent double-clicks
  navigatingGroupId.value = groupId;

  try {
    // If this is already the active group, just navigate
    if (groupId === activeGroupId.value) {
      await router.push(`/groups/${groupId}/items/all`);
      return;
    }

    // Switch the active group first
    const res = await switchActiveGroup(groupId);
    if (res.ok) {
      // Now navigate — the router guard will see the updated activeGroupId
      await router.push(`/groups/${groupId}/items/all`);
    } else {
      console.error('Failed to switch group:', res.error);
    }
  } catch (err) {
    console.error('Navigation error:', err);
  } finally {
    navigatingGroupId.value = null;
  }
}

async function loadAllGroups() {
  if (!isSuperadmin.value) return;
  loading.value = true;
  try {
    const { data } = await hw.get('/api/admin/groups');
    allGroups.value = data;
  } catch (err) {
    console.error('Failed to load groups:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadAllGroups();
});
</script>

<template>
  <div class="home-page">
    <!-- Welcome Banner -->
    <section class="welcome-banner">
      <div class="welcome-content">
        <div class="welcome-text">
          <h1 class="welcome-title">
            {{ t(greeting) }}<span v-if="user">, </span><span v-if="user" class="welcome-name">{{ displayName }}</span>
          </h1>
          <p class="welcome-sub">
            {{ isSuperadmin
              ? 'Du hast Zugriff auf alle Gruppen. Wähle eine aus oder verwalte das System.'
              : userGroups.length
                  ? 'Wähle eine Gruppe aus, um loszulegen.'
                  : 'Tritt einer Gruppe bei oder erstelle eine neue.'
            }}
          </p>
        </div>
        <div class="welcome-actions">
          <button class="btn action" @click="showJoinModal = true">
            <UserRoundPlus :size="16" />
            <span>{{ t('groups.home.joinGroup') }}</span>
          </button>
          <button class="btn ghost" @click="showCreateModal = true">
            <Plus :size="16" />
            <span>{{ t('groups.home.createGroup') }}</span>
          </button>
          <router-link v-if="isSuperadmin" to="/admin" class="btn ghost">
            <ShieldUser :size="16" />
            <span>Super Admin</span>
          </router-link>
        </div>
      </div>
    </section>

    <!-- Superadmin: All Groups -->
    <section v-if="isSuperadmin && allGroups.length > 0" class="groups-section">
      <div class="section-header">
        <h2 class="section-title">{{ t('groups.home.allGroups') }}</h2>
        <span class="section-badge">{{ allGroups.length }}</span>
      </div>
      <div class="groups-grid">
        <button
            v-for="group in allGroups"
            :key="group.id"
            class="group-card"
            :class="{ active: group.id === activeGroupId }"
            @click="navigateToGroup(group.id)"
            :disabled="navigatingGroupId === group.id"
        >
          <span class="group-card-icon">
            <component :is="group.id === activeGroupId ? FolderOpen : Folder" :size="24" />
          </span>
          <div class="group-card-body">
            <span class="group-card-name">{{ group.name }}</span>
            <span class="group-card-meta">
              {{ group.memberCount ?? '?' }} {{ t('groups.home.members') }}
            </span>
          </div>
          <ChevronRight :size="16" class="group-card-arrow" />
        </button>
      </div>
    </section>

    <!-- Regular User: My Groups -->
    <section v-if="userGroups.length > 0" class="groups-section">
      <div class="section-header">
        <h2 class="section-title">{{ t('groups.home.yourGroups') }}</h2>
        <span class="section-badge">{{ userGroups.length }}</span>
      </div>
      <div class="groups-grid">
        <button
            v-for="group in userGroups"
            :key="group.id"
            class="group-card"
            :class="{ active: group.id === activeGroupId }"
            @click="navigateToGroup(group.id)"
            :disabled="navigatingGroupId === group.id"
        >
          <span class="group-card-icon">
            <component :is="group.id === activeGroupId ? FolderOpen : Folder" :size="24" />
          </span>
          <span class="group-card-body">
            <span class="group-card-name">{{ group.name }}</span>
            <span class="group-card-role" :class="'role-' + group.role">
              {{ roleLabel(group.role) }}
            </span>
            <span v-if="group.generatedName" class="group-card-username">{{ group.generatedName }}</span>
          </span>
          <ChevronRight :size="16" class="group-card-arrow" />
        </button>
      </div>
    </section>

    <!-- Empty State -->
    <section v-if="!isSuperadmin && userGroups.length === 0 && !loading" class="empty-section">
      <div class="empty-state-card">
        <UsersRound :size="40" class="empty-icon" />
        <h3>{{ t('groups.home.noGroups') }}</h3>
        <p>{{ t('groups.home.joinGroupText') }}</p>
        <div class="empty-actions">
          <button class="btn action" @click="showJoinModal = true">{{ t('groups.home.joinGroup') }}</button>
          <button class="btn ghost" @click="showCreateModal = true">{{ t('groups.home.createGroup') }}</button>
        </div>
      </div>
    </section>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <!-- Modals -->
    <JoinGroupModal v-if="showJoinModal" @close="showJoinModal = false" />
    <CreateGroupModal v-if="showCreateModal" @close="showCreateModal = false" />
  </div>
</template>

<style scoped>
.home-page {
  padding: 0;
}

.welcome-banner {
  margin-bottom: 32px;
}

.welcome-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.welcome-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-default);
  margin: 0 0 6px;
  line-height: 1.2;
}

.welcome-name {
  background: var(--gradient-bismuth);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.welcome-sub {
  color: var(--sub);
  font-size: var(--font-size-body);
  margin: 0;
  line-height: 1.5;
}

.welcome-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.groups-section {
  margin-bottom: 36px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.section-title {
  font-size: var(--font-size-h3);
  font-weight: 700;
  color: var(--text-default);
  margin: 0;
}

.section-badge {
  background: var(--bg-interactive-hover);
  color: var(--sub);
  font-size: var(--font-size-sub);
  font-weight: 600;
  padding: 2px 10px;
  border-radius: var(--border-radius-full);
}

.groups-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-surface);
  box-shadow: var(--input-shadow);
  border-radius: var(--border-radius-xl);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
  text-align: left;
  width: 100%;
  color: var(--text-default);
}

.group-card:disabled {
  opacity: 0.7;
  cursor: wait;
}

.group-card:hover:not(:disabled) {
  background: var(--ghost--hover);
}

.group-card.active {
  border-color: var(--text-default);
  background: var(--text-default);
}

.group-card.active:hover {
  background: var(--action-hover)
}

.group-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 8px;
  color: var(--sub);
  flex-shrink: 0;
  transition: color 0.15s ease;
}

.group-card:hover:not(:disabled) .group-card-icon {
  color: var(--text-default);
}

.group-card.active .group-card-icon {
  color: var(--bg-canvas);
}

.group-card.active:hover .group-card-icon {
  color: var(--bg-canvas);
}

.group-card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.group-card-name {
  font-weight: 600;
  font-size: var(--font-size-body);
  color: var(--text-default);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-card.active .group-card-name {
  color: var(--bg-canvas);
}

.group-card-meta {
  font-size: var(--font-size-sub);
  color: var(--sub);
}

.group-card.active .group-card-meta {
  color: var(--bg-interactive-hover);
}

.group-card-role {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.role-admin { color: #6366f1; }
.role-mod, .role-moderator { color: #f59e0b; }
.role-user { color: var(--sub); }
.role-superadmin { color: #ef4444; }

.group-card-username {
  font-size: 0.7rem;
  color: var(--sub);
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-card-arrow {
  color: var(--sub);
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.group-card:hover:not(:disabled) .group-card-arrow {
  opacity: 1;
  transform: translateX(2px);
}

.empty-section {
  margin-top: 40px;
}

.empty-state-card {
  text-align: center;
  padding: 48px 24px;
  border-radius: var(--border-radius-xl);
}

.empty-icon {
  color: var(--sub);
  margin-bottom: 16px;
}

.empty-state-card h3 {
  font-size: var(--font-size-h3);
  font-weight: 700;
  color: var(--text-default);
  margin: 0 0 8px;
}

.empty-state-card p {
  color: var(--sub);
  font-size: var(--font-size-body);
  max-width: 360px;
  margin: 0 auto 24px;
  line-height: 1.5;
}

.empty-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 2px solid var(--border-canvas);
  border-top-color: var(--text-default);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 640px) {
  .home-page {
    padding: 16px;
  }

  .welcome-content {
    flex-direction: column;
    gap: 16px;
  }

  .welcome-title {
    font-size: 1.4rem;
  }

  .welcome-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .welcome-actions .btn {
    flex: 1;
    justify-content: center;
    min-width: 0;
  }

  .group-card {
    padding: 12px 14px;
  }

  .group-card-icon {
    width: 36px;
    height: 36px;
  }
}
</style>
