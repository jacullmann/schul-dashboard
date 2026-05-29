<script setup lang="ts">
import type { GroupStats } from '@/modules/admin/types';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  stats: GroupStats | null;
  cleaningUp: boolean;
}>();

const emit = defineEmits<{
  (e: 'cleanup'): void;
}>();
</script>

<template>
  <div class="animate-fade-up">
    <div class="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 mb-5">
      <div
        class="bg-surface border border-surface-border shadow-input rounded-xl p-4.5 flex flex-col gap-1"
      >
        <span class="text-[1.5rem]/4 font-bold">{{
          stats?.itemCount ?? '–'
        }}</span>
        <span class="text-sm text-on-ghost-muted">{{
          t('admin.overview.stats.active_entries')
        }}</span>
      </div>
      <div
        class="bg-surface border border-surface-border shadow-input rounded-xl p-4.5 flex flex-col gap-1"
      >
        <span class="text-[1.5rem]/4 font-bold">{{
          stats?.memberCount ?? '–'
        }}</span>
        <span class="text-sm text-on-ghost-muted">{{
          t('admin.overview.stats.members')
        }}</span>
      </div>
      <div
        class="bg-surface border border-surface-border shadow-input rounded-xl p-4.5 flex flex-col gap-1"
      >
        <span class="text-[1.5rem]/4 font-bold">{{
          stats?.subsCount ?? '–'
        }}</span>
        <span class="text-sm text-on-ghost-muted">{{
          t('admin.overview.stats.schedule_changes')
        }}</span>
      </div>
      <div
        class="bg-surface border border-surface-border shadow-input rounded-xl p-4.5 flex flex-col gap-1"
        :class="{
          'border-[rgba(245,158,11,0.3)]': (stats?.oldItemsCount ?? 0) > 0,
        }"
      >
        <span class="text-[1.5rem]/4 font-bold">{{
          stats?.oldItemsCount ?? '–'
        }}</span>
        <span class="text-sm text-on-ghost-muted">{{
          t('admin.overview.stats.old_entries')
        }}</span>
      </div>
    </div>

    <div
      v-if="(stats?.oldItemsCount ?? 0) === 0"
      class="flex items-center justify-between bg-surface border border-surface-border rounded-2xl p-4 gap-4 mb-6 sm:flex-col sm:items-start"
    >
      <div class="flex items-center gap-2 text-base text-on-ghost-muted">
        <span
          >{{ stats?.oldItemsCount }} Einträge älter als 90 Tage können gelöscht
          werden.</span
        >
      </div>
      <BaseRow justify="end" class="w-full">
        <BaseButton
          @click="emit('cleanup')"
          :disabled="cleaningUp"
          variant="danger"
        >
          {{
            cleaningUp
              ? t('common.buttons.deleting')
              : t('admin.overview.cleanup.action_button')
          }}
        </BaseButton>
      </BaseRow>
    </div>
  </div>
</template>
