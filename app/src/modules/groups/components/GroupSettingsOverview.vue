<script setup lang="ts">
import type { GroupStats } from '@/modules/groups/types';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineProps<{
  stats: GroupStats | null;
}>();
</script>

<template>
  <div>
    <div class="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 mb-5">
      <div
        class="bg-surface border border-ghost-border shadow-input rounded-xl p-4.5 flex flex-col gap-1"
      >
        <span class="text-2xl/4 font-bold">{{
          stats?.itemCount ?? '–'
        }}</span>
        <span class="text-sm text-on-ghost-muted">{{
          t('groups.settings.overview.stats.active_tasks')
        }}</span>
      </div>
      <div
        class="bg-surface border border-ghost-border shadow-input rounded-xl p-4.5 flex flex-col gap-1"
      >
        <span class="text-2xl/4 font-bold">{{
          stats?.memberCount ?? '–'
        }}</span>
        <span class="text-sm text-on-ghost-muted">{{
          t('groups.settings.overview.stats.members')
        }}</span>
      </div>
      <div
        class="bg-surface border border-ghost-border shadow-input rounded-xl p-4.5 flex flex-col gap-1"
      >
        <span class="text-2xl/4 font-bold">{{
          stats?.subsCount ?? '–'
        }}</span>
        <span class="text-sm text-on-ghost-muted">{{
          t('groups.settings.overview.stats.schedule_changes')
        }}</span>
      </div>
    </div>
  </div>
</template>
