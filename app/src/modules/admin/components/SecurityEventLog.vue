<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SecurityEvent } from '../types';
import { useLogFormat } from '../composables/useLogFormat';
import AdminLogTimeline from './AdminLogTimeline.vue';
import AdminLogEntryHeader from './AdminLogEntryHeader.vue';
import AdminLogFields from './AdminLogFields.vue';

const I18N_BASE = 'admin.security.log';

const props = defineProps<{
  events: SecurityEvent[];
}>();

const { t } = useI18n();
const { securityEventLabel, fields, deviceName } = useLogFormat();

interface Account {
  role: 'user' | 'actor';
  id: string;
  /** Gone once the account was deleted; the id outlives it. */
  email: string | null;
}

// Formatted once per load rather than on every render of the list.
const entries = computed(() =>
  props.events.map((event) => {
    const accounts: Account[] = [];
    if (event.userId) {
      accounts.push({ role: 'user', id: event.userId, email: event.userEmail });
    }
    // Acting on one's own account is the common case and needs no second line.
    if (event.actorId && event.actorId !== event.userId) {
      accounts.push({
        role: 'actor',
        id: event.actorId,
        email: event.actorEmail,
      });
    }

    return {
      id: event.id,
      at: event.createdAt,
      label: securityEventLabel(event.eventType),
      failed: event.outcome === 'failure',
      accounts,
      group: event.groupId
        ? { id: event.groupId, name: event.groupName }
        : null,
      ip: event.ipAddress,
      device: event.userAgent
        ? { name: deviceName(event.userAgent), raw: event.userAgent }
        : null,
      fields: fields(event.metadata),
    };
  }),
);
</script>

<template>
  <AdminLogTimeline
    v-slot="{ entry }"
    :entries="entries"
    :date-of="(entry) => entry.at"
    :key-of="(entry) => entry.id"
  >
    <AdminLogEntryHeader :label="entry.label" :at="entry.at">
      <span
        v-if="entry.failed"
        class="ml-1.5 text-xs font-semibold text-danger"
      >
        {{ t('admin.security.outcome.failure') }}
      </span>
    </AdminLogEntryHeader>

    <AdminLogFields :fields="entry.fields">
      <template v-for="account in entry.accounts" :key="account.role">
        <dt class="text-on-ghost-muted">
          {{ t(`${I18N_BASE}.${account.role}`) }}
        </dt>
        <dd class="m-0 min-w-0 break-words">
          <RouterLink
            v-if="account.email"
            :to="{ name: 'admin-user', params: { userId: account.id } }"
            class="hover:underline"
            >{{ account.email }}</RouterLink
          >
          <span v-else class="flex flex-wrap items-baseline gap-x-2">
            <span class="text-on-ghost-muted">
              {{ t(`${I18N_BASE}.deleted_account`) }}
            </span>
            <span class="font-mono text-xs select-all break-all">
              {{ account.id }}
            </span>
          </span>
        </dd>
      </template>
      <template v-if="entry.group">
        <dt class="text-on-ghost-muted">{{ t(`${I18N_BASE}.group`) }}</dt>
        <dd
          class="m-0 break-words"
          :class="{ 'font-mono text-xs/5 select-all': !entry.group.name }"
        >
          {{ entry.group.name ?? entry.group.id }}
        </dd>
      </template>
      <template v-if="entry.ip">
        <dt class="text-on-ghost-muted">{{ t(`${I18N_BASE}.ip`) }}</dt>
        <dd class="m-0">
          <RouterLink
            :to="{ name: 'admin-security-events', query: { ip: entry.ip } }"
            class="font-mono text-xs/5 hover:underline"
            :title="t(`${I18N_BASE}.filter_ip`)"
            >{{ entry.ip }}</RouterLink
          >
        </dd>
      </template>
      <template v-if="entry.device">
        <dt class="text-on-ghost-muted">{{ t(`${I18N_BASE}.device`) }}</dt>
        <dd class="m-0 break-words" :title="entry.device.raw">
          {{ entry.device.name }}
        </dd>
      </template>
    </AdminLogFields>
  </AdminLogTimeline>
</template>
