<script setup lang="ts">
import { toRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { X } from '@lucide/vue';
import type { MemberRole, SuperAdminUser } from '../types';
import { useSuperAdminUserDetails } from '../composables/useSuperAdminUserDetails';
import { useSuperAdminFormat } from '../composables/useSuperAdminFormat';

const props = defineProps<{
  user: SuperAdminUser | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { t } = useI18n();
const { fmtDate, fmtDateTime } = useSuperAdminFormat();
const userId = toRef(() => props.user?.id ?? null);
const { memberships, activity, loading, changingGroupId, changeRole } =
  useSuperAdminUserDetails(userId);

const ROLE_LABEL_KEYS: Record<MemberRole, string> = {
  owner: 'common.roles.owner',
  admin: 'common.roles.admin',
  moderator: 'common.roles.moderator',
  user: 'common.roles.member',
};

function roleOptions(current: MemberRole, assignable: MemberRole[]) {
  return [current, ...assignable].map((role) => ({
    value: role,
    label: t(ROLE_LABEL_KEYS[role]),
  }));
}
</script>

<template>
  <Transition name="drawer">
    <div v-if="user" class="drawer-overlay" @click.self="emit('close')">
      <div
        class="drawer-panel"
        role="dialog"
        aria-modal="true"
        :aria-label="t('admin.users.details.title')"
      >
        <div class="flex items-start justify-between gap-3 mb-5">
          <div class="min-w-0">
            <h3 class="m-0 truncate">{{ user.username }}</h3>
            <div class="text-sm text-on-ghost-muted truncate">
              {{ user.email }}
            </div>
            <div class="text-xs text-on-ghost-subtle font-mono select-all">
              {{ user.id }}
            </div>
          </div>
          <BaseButton
            size="sm"
            :icon="X"
            :aria-label="t('common.buttons.close')"
            @click="emit('close')"
          />
        </div>

        <div v-if="loading" class="flex justify-center p-10">
          <BaseSpinner on="ghost" size="24px" />
        </div>
        <template v-else>
          <section class="mb-6">
            <h4 class="mb-2">{{ t('admin.users.details.groups') }}</h4>
            <p
              v-if="!memberships.length"
              class="text-sm text-on-ghost-muted m-0"
            >
              {{ t('admin.users.details.no_groups') }}
            </p>
            <ul v-else class="list-none p-0 m-0 flex flex-col gap-2">
              <li
                v-for="m in memberships"
                :key="m.groupId"
                class="flex items-center justify-between gap-3"
              >
                <div class="min-w-0">
                  <div class="font-medium truncate">{{ m.groupName }}</div>
                  <div class="text-xs text-on-ghost-muted">
                    {{
                      t('admin.users.details.joined', {
                        date: fmtDate(m.joinedAt),
                      })
                    }}
                  </div>
                </div>
                <div class="w-40 shrink-0">
                  <BaseSelect
                    :model-value="m.role"
                    :options="roleOptions(m.role, m.assignableRoles)"
                    :disabled="
                      !m.assignableRoles.length || changingGroupId === m.groupId
                    "
                    :title="m.groupName"
                    @update:model-value="
                      (role) => changeRole(m, role as MemberRole)
                    "
                  />
                </div>
              </li>
            </ul>
          </section>

          <section>
            <h4 class="mb-2">{{ t('admin.users.details.activity') }}</h4>
            <p v-if="!activity.length" class="text-sm text-on-ghost-muted m-0">
              {{ t('admin.users.details.no_activity') }}
            </p>
            <ul v-else class="log-list">
              <li v-for="(entry, i) in activity" :key="i">
                <span class="log-time">{{ fmtDateTime(entry.at) }}</span>
                <span class="font-medium">{{ entry.type }}</span>
                <pre class="log-meta">{{
                  JSON.stringify(entry.meta, null, 2)
                }}</pre>
              </li>
            </ul>
          </section>
        </template>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 9000;
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: 440px;
  max-width: 90vw;
  background: var(--color-canvas);
  border-left: 1px solid var(--color-ghost-border);
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.25s;
}
.drawer-enter-active .drawer-panel,
.drawer-leave-active .drawer-panel {
  transition: transform 0.25s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .drawer-panel,
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
  font-size: var(--text-xs);
  color: var(--color-on-ghost-muted);
  display: block;
}
.log-meta {
  background: var(--color-surface);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: var(--text-xs);
  color: var(--color-on-ghost-muted);
  margin-top: 4px;
  overflow-x: auto;
}
</style>
