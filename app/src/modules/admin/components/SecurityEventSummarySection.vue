<script setup lang="ts">
import { computed, onMounted, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SecurityEventCount } from '../types';
import { useSecurityEventSummary } from '../composables/useSecurityEventSummary';
import { useLogFormat } from '../composables/useLogFormat';
import { useSuperAdminFormat } from '../composables/useSuperAdminFormat';

const I18N_BASE = 'admin.security.summary';
const TOP_EVENT_LIMIT = 6;

interface Signal {
  key: string;
  matches: (count: SecurityEventCount) => boolean;
  /** Worth an admin's attention whenever it happened at all. */
  alarming: boolean;
}

/** The headline numbers, from what is merely noisy to what is never benign. */
const SIGNALS: readonly Signal[] = [
  { key: 'events', matches: () => true, alarming: false },
  {
    key: 'failed_sign_ins',
    matches: (c) => c.eventType === 'auth:sign_in' && c.outcome === 'failure',
    alarming: false,
  },
  {
    key: 'lockouts',
    matches: (c) => c.eventType.endsWith('_locked'),
    alarming: false,
  },
  // A rotated refresh token that came back was copied: a stolen session.
  {
    key: 'stolen_sessions',
    matches: (c) => c.eventType === 'auth:refresh_token_reused',
    alarming: true,
  },
];

const { t } = useI18n();
const { securityEventLabel } = useLogFormat();
const { fmtDateTime } = useSuperAdminFormat();
const { summary, loading, failed, loadSummary } = useSecurityEventSummary();
const titleId = useId();

const signals = computed(() => {
  const counts = summary.value?.eventCounts ?? [];
  return SIGNALS.map((signal) => {
    const total = counts
      .filter(signal.matches)
      .reduce((sum, c) => sum + c.count, 0);
    return {
      key: signal.key,
      total,
      alert: signal.alarming && total > 0,
    };
  });
});

const topEvents = computed(() => {
  const counts = summary.value?.eventCounts.slice(0, TOP_EVENT_LIMIT) ?? [];
  const max = counts[0]?.count ?? 0;
  return counts.map((c) => ({
    ...c,
    key: `${c.eventType}|${c.outcome}`,
    label: securityEventLabel(c.eventType),
    share: max ? (c.count / max) * 100 : 0,
  }));
});

onMounted(loadSummary);
</script>

<template>
  <section class="flex flex-col gap-3" :aria-labelledby="titleId">
    <header class="flex items-start justify-between gap-3">
      <div>
        <h3 :id="titleId">{{ t('admin.security.title') }}</h3>
        <p v-if="summary" class="text-sm text-on-ghost-muted">
          {{ t(`${I18N_BASE}.hint`, { days: summary.days }) }}
        </p>
      </div>
      <BaseLink
        :to="{ name: 'admin-security-events' }"
        class="shrink-0 text-sm"
      >
        {{ t(`${I18N_BASE}.view_all`) }}
      </BaseLink>
    </header>

    <div v-if="loading && !summary" class="flex justify-center p-4">
      <BaseSpinner on="ghost" size="20px" />
    </div>
    <BaseLoadError v-else-if="failed" @retry="loadSummary">
      {{ t('admin.security.error') }}
    </BaseLoadError>
    <template v-else-if="summary">
      <dl class="grid grid-cols-2 md:grid-cols-4 gap-3 m-0">
        <div
          v-for="signal in signals"
          :key="signal.key"
          class="flex flex-col rounded-xl border bg-surface shadow-input px-4 py-3"
          :class="signal.alert ? 'border-danger' : 'border-ghost-border'"
        >
          <dt class="text-sm text-on-ghost-muted">
            {{ t(`${I18N_BASE}.signals.${signal.key}`) }}
          </dt>
          <dd
            class="m-0 mt-auto pt-1 text-2xl font-bold tabular-nums"
            :class="{ 'text-danger': signal.alert }"
          >
            {{ signal.total }}
          </dd>
        </div>
      </dl>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          class="rounded-xl border border-ghost-border bg-surface shadow-input"
        >
          <h4 class="px-4 pt-3 pb-1">{{ t(`${I18N_BASE}.top_events`) }}</h4>
          <p
            v-if="!topEvents.length"
            class="px-4 pb-3 text-sm text-on-ghost-muted m-0"
          >
            {{ t(`${I18N_BASE}.empty`) }}
          </p>
          <ul v-else class="m-0 p-0 pb-1.5 list-none">
            <li v-for="event in topEvents" :key="event.key">
              <RouterLink
                :to="{
                  name: 'admin-security-events',
                  query: { eventType: event.eventType, outcome: event.outcome },
                }"
                class="flex flex-col gap-1 px-4 py-2 transition-hover hover:bg-ghost-hover"
              >
                <span class="flex items-baseline justify-between gap-3 text-sm">
                  <span class="min-w-0 truncate">
                    {{ event.label }}
                    <span
                      v-if="event.outcome === 'failure'"
                      class="ml-1 text-xs font-semibold text-danger"
                    >
                      {{ t('admin.security.outcome.failure') }}
                    </span>
                  </span>
                  <span class="shrink-0 font-semibold tabular-nums">
                    {{ event.count }}
                  </span>
                </span>
                <span
                  class="h-1 rounded-full bg-ghost-hover"
                  aria-hidden="true"
                >
                  <span
                    class="block h-full rounded-full bg-accent"
                    :style="{ width: `${event.share}%` }"
                  />
                </span>
              </RouterLink>
            </li>
          </ul>
        </div>

        <div
          class="rounded-xl border border-ghost-border bg-surface shadow-input"
        >
          <h4 class="px-4 pt-3">{{ t(`${I18N_BASE}.failure_sources`) }}</h4>
          <p class="px-4 pb-1 text-xs text-on-ghost-muted m-0">
            {{ t(`${I18N_BASE}.failure_sources_hint`) }}
          </p>
          <p
            v-if="!summary.failureSources.length"
            class="px-4 pb-3 text-sm text-on-ghost-muted m-0"
          >
            {{ t(`${I18N_BASE}.no_failures`) }}
          </p>
          <ul v-else class="m-0 p-0 pb-1.5 list-none">
            <li
              v-for="source in summary.failureSources"
              :key="source.ipAddress"
            >
              <RouterLink
                :to="{
                  name: 'admin-security-events',
                  query: { ip: source.ipAddress, outcome: 'failure' },
                }"
                class="flex items-center justify-between gap-3 px-4 py-2 transition-hover hover:bg-ghost-hover"
              >
                <span class="min-w-0">
                  <span class="block font-mono text-sm break-all">
                    {{ source.ipAddress }}
                  </span>
                  <span class="block text-xs text-on-ghost-muted">
                    {{
                      t(`${I18N_BASE}.last_seen`, {
                        date: fmtDateTime(source.lastSeenAt),
                      })
                    }}
                  </span>
                </span>
                <span class="shrink-0 text-right text-sm">
                  <span class="block font-semibold tabular-nums">
                    {{ t(`${I18N_BASE}.failures`, source.count) }}
                  </span>
                  <span class="block text-xs text-on-ghost-muted tabular-nums">
                    {{ t(`${I18N_BASE}.accounts`, source.accountCount) }}
                  </span>
                </span>
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </section>
</template>
