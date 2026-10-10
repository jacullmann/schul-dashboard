<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useSuperAdminUserDetails } from '../composables/useSuperAdminUserDetails';
import { useSuperAdminUserActions } from '../composables/useSuperAdminUserActions';
import { useSuperAdminFormat } from '../composables/useSuperAdminFormat';
import AdminBackButton from '../components/AdminBackButton.vue';
import UserAccountActions from '../components/UserAccountActions.vue';
import UserActivityLog from '../components/UserActivityLog.vue';
import UserMemberships from '../components/UserMemberships.vue';

const I18N_BASE = 'admin.users.details';

const props = defineProps<{
  userId: string;
}>();

const { t } = useI18n();
const router = useRouter();
const { fmtDate, fmtDateTime } = useSuperAdminFormat();
const {
  user,
  memberships,
  activity,
  state,
  reload,
  changingGroupId,
  changeRole,
} = useSuperAdminUserDetails(() => props.userId);
const { pendingAction, toggleBan, resetMfa, deleteUser } =
  useSuperAdminUserActions(user);

const ownsGroup = computed(() =>
  memberships.value.some((m) => m.role === 'owner'),
);

const status = computed(() => {
  if (!user.value) return null;
  if (user.value.isSuperadmin)
    return { key: 'admin', class: 'text-indigo-500' };
  if (user.value.isBanned) return { key: 'banned', class: 'text-danger' };
  return { key: 'active', class: 'text-success' };
});

const facts = computed(() => {
  const u = user.value;
  if (!u) return [];
  return [
    { key: 'registered', value: fmtDate(u.createdAt) },
    {
      key: 'last_login',
      value: u.lastLoginAt
        ? fmtDateTime(u.lastLoginAt)
        : t(`${I18N_BASE}.facts.never`),
    },
    {
      key: 'mfa',
      value: t(`${I18N_BASE}.facts.${u.mfaEnabled ? 'mfa_on' : 'mfa_off'}`),
    },
    { key: 'groups', value: String(memberships.value.length) },
  ];
});

/**
 * Stepping back returns to the list as it was filtered and paged. A page
 * opened from a link has nothing of this app behind it to step back to.
 */
function leave() {
  if (router.options.history.state.back) router.back();
  else void router.push({ name: 'admin-users' });
}

async function onDelete() {
  if (await deleteUser()) leave();
}

watchEffect(() => {
  if (user.value) document.title = `${user.value.username} | Dashboard`;
});
</script>

<template>
  <div class="flex min-h-full max-w-3xl flex-col">
    <AdminBackButton class="self-start" @click="leave">
      {{ t(`${I18N_BASE}.back`) }}
    </AdminBackButton>

    <div v-if="state === 'loading' && !user" class="flex justify-center p-10">
      <BaseSpinner on="ghost" size="24px" />
    </div>
    <BaseEmptyState v-else-if="state === 'not-found'" class="flex-1">
      {{ t(`${I18N_BASE}.not_found`) }}
    </BaseEmptyState>
    <BaseLoadError v-else-if="state === 'failed'" @retry="reload">
      {{ t('admin.users.errors.load_details') }}
    </BaseLoadError>
    <div
      v-else-if="user"
      class="flex flex-col gap-8"
      :class="{ 'opacity-60 pointer-events-none': state === 'loading' }"
      :aria-busy="state === 'loading'"
    >
      <header class="flex flex-col gap-1">
        <div class="flex flex-wrap items-baseline gap-x-3">
          <h2 class="min-w-0 break-words">{{ user.username }}</h2>
          <span
            v-if="status"
            class="text-sm font-semibold"
            :class="status.class"
          >
            {{ t(`admin.users.status.${status.key}`) }}
          </span>
        </div>
        <div class="text-on-ghost-muted break-all">{{ user.email }}</div>
        <div
          class="font-mono text-xs text-on-ghost-subtle select-all break-all"
        >
          {{ user.id }}
        </div>
      </header>

      <dl class="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 m-0">
        <div v-for="fact in facts" :key="fact.key" class="min-w-0">
          <dt class="text-sm text-on-ghost-muted">
            {{ t(`${I18N_BASE}.facts.${fact.key}`) }}
          </dt>
          <dd class="m-0 font-semibold tabular-nums">{{ fact.value }}</dd>
        </div>
      </dl>

      <section class="flex flex-col gap-3">
        <div class="flex items-baseline justify-between gap-3">
          <h3>{{ t(`${I18N_BASE}.manage.title`) }}</h3>
          <BaseLink
            :to="{
              name: 'admin-security-events',
              query: { userId: user.id },
            }"
            class="shrink-0 text-sm"
          >
            {{ t(`${I18N_BASE}.security_log`) }}
          </BaseLink>
        </div>
        <UserAccountActions
          :user="user"
          :owns-group="ownsGroup"
          :pending-action="pendingAction"
          @toggle-ban="toggleBan"
          @reset-mfa="resetMfa"
          @delete="onDelete"
        />
      </section>

      <section class="flex flex-col gap-3">
        <h3>{{ t(`${I18N_BASE}.groups`) }}</h3>
        <UserMemberships
          :memberships="memberships"
          :changing-group-id="changingGroupId"
          @change-role="changeRole"
        />
      </section>

      <section class="flex flex-col gap-3">
        <div>
          <h3>{{ t(`${I18N_BASE}.activity`) }}</h3>
          <p class="text-sm text-on-ghost-muted">
            {{ t(`${I18N_BASE}.activity_hint`) }}
          </p>
        </div>
        <p v-if="!activity.length" class="text-sm text-on-ghost-muted m-0">
          {{ t(`${I18N_BASE}.no_activity`) }}
        </p>
        <UserActivityLog v-else :activity="activity" />
      </section>
    </div>
  </div>
</template>
