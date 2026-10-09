<script setup lang="ts">
import { computed, onMounted, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSecurityEvents } from '../composables/useSecurityEvents';
import { useSuperAdminFormat } from '../composables/useSuperAdminFormat';

const I18N_BASE = 'admin.overview.security_events';

const { t } = useI18n();
const { fmtDateTime } = useSuperAdminFormat();
const { events, loading, failed, loadEvents } = useSecurityEvents();
const titleId = useId();

// Stringified once per load rather than on every render of the list.
const rows = computed(() =>
  events.value.map((event) => ({
    ...event,
    parties: [
      { key: 'user', name: event.userEmail, id: event.userId },
      { key: 'actor', name: event.actorEmail, id: event.actorId },
      { key: 'group', name: event.groupName, id: event.groupId },
    ].filter((party) => party.id),
    metadataJson: Object.keys(event.metadata).length
      ? JSON.stringify(event.metadata, null, 2)
      : null,
  })),
);

onMounted(loadEvents);
</script>

<template>
  <section class="flex flex-col gap-3" :aria-labelledby="titleId">
    <div>
      <h3 :id="titleId">{{ t(`${I18N_BASE}.title`) }}</h3>
      <p class="text-sm text-on-ghost-muted">{{ t(`${I18N_BASE}.hint`) }}</p>
    </div>

    <div class="rounded-xl border border-ghost-border bg-surface shadow-input">
      <div v-if="loading" class="flex justify-center p-4">
        <BaseSpinner on="ghost" size="20px" />
      </div>
      <div v-else-if="failed" class="flex justify-center p-4">
        <BaseButton variant="ghost" @click="loadEvents">
          {{ t(`${I18N_BASE}.retry`) }}
        </BaseButton>
      </div>
      <p v-else-if="!rows.length" class="p-4 text-sm text-on-ghost-muted m-0">
        {{ t(`${I18N_BASE}.empty`) }}
      </p>
      <ul
        v-else
        class="max-h-128 overflow-y-auto px-4 m-0 list-none divide-y divide-ghost-border"
      >
        <li v-for="row in rows" :key="row.id" class="py-2.5 text-sm">
          <div class="flex flex-wrap items-baseline justify-between gap-x-3">
            <span class="font-mono font-semibold break-all">
              {{ row.eventType }}
              <span
                class="font-sans text-xs"
                :class="
                  row.outcome === 'failure' ? 'text-danger' : 'text-success'
                "
              >
                {{ t(`${I18N_BASE}.outcome.${row.outcome}`) }}
              </span>
            </span>
            <span class="text-xs text-on-ghost-muted tabular-nums">
              {{ fmtDateTime(row.createdAt) }}
            </span>
          </div>

          <dl
            class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 mt-1 mb-0 text-xs"
          >
            <template v-for="party in row.parties" :key="party.key">
              <dt class="text-on-ghost-muted">
                {{ t(`${I18N_BASE}.${party.key}`) }}
              </dt>
              <dd class="m-0 min-w-0 break-all">
                <span v-if="party.name">{{ party.name }} · </span>
                <span class="font-mono text-on-ghost-subtle select-all">
                  {{ party.id }}
                </span>
              </dd>
            </template>
            <template v-if="row.ipAddress">
              <dt class="text-on-ghost-muted">{{ t(`${I18N_BASE}.ip`) }}</dt>
              <dd class="m-0 font-mono select-all">{{ row.ipAddress }}</dd>
            </template>
            <template v-if="row.userAgent">
              <dt class="text-on-ghost-muted">
                {{ t(`${I18N_BASE}.user_agent`) }}
              </dt>
              <dd class="m-0 min-w-0 break-all text-on-ghost-muted">
                {{ row.userAgent }}
              </dd>
            </template>
          </dl>

          <pre
            v-if="row.metadataJson"
            class="mt-1.5 mb-0 rounded bg-canvas px-2 py-1 text-xs text-on-ghost-muted overflow-x-auto"
            >{{ row.metadataJson }}</pre>
        </li>
      </ul>
    </div>
  </section>
</template>
