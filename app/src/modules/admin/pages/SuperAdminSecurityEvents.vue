<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useSecurityEventLog } from '../composables/useSecurityEventLog';
import { useLogFormat } from '../composables/useLogFormat';
import { SECURITY_EVENT_TYPES } from '../utils/securityEventTypes';
import AdminBackButton from '../components/AdminBackButton.vue';
import SecurityEventLog from '../components/SecurityEventLog.vue';
import type { SecurityEventFilters } from '../types';

const I18N_BASE = 'admin.security.log';
/** The select's value for a filter that is not set. */
const ANY = '';

const { t } = useI18n();
const router = useRouter();
const { securityEventLabel } = useLogFormat();
const {
  events,
  loading,
  failed,
  filters,
  hasFilters,
  setFilters,
  clearFilters,
  reload,
} = useSecurityEventLog();

const typeOptions = computed(() => {
  const current = filters.value.eventType;
  // A linked type this build does not know still shows as selected.
  const types: readonly string[] =
    current && !SECURITY_EVENT_TYPES.some((type) => type === current)
      ? [...SECURITY_EVENT_TYPES, current]
      : SECURITY_EVENT_TYPES;
  return [
    { value: ANY, label: t(`${I18N_BASE}.filters.all_types`) },
    ...types
      .map((type) => ({ value: type, label: securityEventLabel(type) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];
});

const outcomeOptions = computed(() => [
  { value: ANY, label: t(`${I18N_BASE}.filters.all_outcomes`) },
  { value: 'success', label: t('admin.security.outcome.success') },
  { value: 'failure', label: t('admin.security.outcome.failure') },
]);

/** The filters only a link sets, shown so they can be seen and removed. */
const linkedFilters = computed(() =>
  (['ip', 'userId'] as const)
    .filter((key) => filters.value[key])
    .map((key) => ({
      key,
      label: t(`${I18N_BASE}.filters.${key}`, { value: filters.value[key] }),
    })),
);

function setFilter(key: keyof SecurityEventFilters, value: string) {
  void setFilters({ [key]: value === ANY ? undefined : value });
}
</script>

<template>
  <AdminBackButton @click="router.push({ name: 'super-admin' })">
    {{ t(`${I18N_BASE}.back`) }}
  </AdminBackButton>

  <PageHeader>
    {{ t('admin.security.title') }}
    <template #action>
      <BaseButton variant="ghost" @click="reload">
        {{ t('common.buttons.refresh') }}
      </BaseButton>
    </template>
  </PageHeader>
  <p class="text-sm text-on-ghost-muted -mt-2 mb-4">
    {{ t(`${I18N_BASE}.hint`) }}
  </p>

  <div
    class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 mb-5"
  >
    <div class="sm:w-64">
      <BaseSelect
        :model-value="filters.eventType ?? ANY"
        :options="typeOptions"
        :title="t(`${I18N_BASE}.filters.type`)"
        @update:model-value="(value) => setFilter('eventType', value)"
      />
    </div>
    <div class="sm:w-48">
      <BaseSelect
        :model-value="filters.outcome ?? ANY"
        :options="outcomeOptions"
        :title="t(`${I18N_BASE}.filters.outcome`)"
        @update:model-value="(value) => setFilter('outcome', value)"
      />
    </div>
    <BaseButton
      v-for="filter in linkedFilters"
      :key="filter.key"
      chip
      surface
      :aria-label="t(`${I18N_BASE}.filters.remove`, { filter: filter.label })"
      @click="setFilter(filter.key, ANY)"
    >
      {{ filter.label }}
    </BaseButton>
    <BaseButton v-if="hasFilters" variant="ghost" @click="clearFilters">
      {{ t(`${I18N_BASE}.filters.reset`) }}
    </BaseButton>
  </div>

  <div v-if="loading && !events.length" class="flex justify-center p-10">
    <BaseSpinner on="ghost" size="24px" />
  </div>
  <BaseLoadError v-else-if="failed" @retry="reload">
    {{ t('admin.security.error') }}
  </BaseLoadError>
  <p v-else-if="!events.length" class="text-center text-on-ghost-muted p-10">
    {{ t(hasFilters ? `${I18N_BASE}.empty_filtered` : `${I18N_BASE}.empty`) }}
  </p>
  <SecurityEventLog
    v-else
    :events="events"
    :class="{ 'opacity-60 pointer-events-none': loading }"
    :aria-busy="loading"
  />
</template>
