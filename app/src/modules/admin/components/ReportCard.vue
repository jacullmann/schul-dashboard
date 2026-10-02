<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Trash2 } from '@lucide/vue';
import ItemCard from '@/modules/tasks/components/ItemCard.vue';
import { previewUrl } from '@/api/files';
import { useSuperAdminFormat } from '../composables/useSuperAdminFormat';
import type { SuperAdminReport } from '../types';

const props = defineProps<{
  report: SuperAdminReport;
}>();

const emit = defineEmits<{
  (e: 'delete', id: string): void;
}>();

const { t } = useI18n();
const { getTypeLabel, getSubjectName, fmtDate } = useSuperAdminFormat();

const isMessage = computed(() => props.report.reportType === 'message');

const title = computed(() => {
  const r = props.report;
  if (isMessage.value) {
    return r.messageSenderEmail
      ? t('admin.reports.message_by', { email: r.messageSenderEmail })
      : t('admin.reports.message_sender_deleted');
  }
  return r.itemTitle ?? '';
});

const body = computed(() =>
  isMessage.value ? props.report.messageContent : props.report.itemDescription,
);
</script>

<template>
  <ItemCard :title="title">
    <template #badges>
      <div
        class="text-on-ghost-muted text-base flex flex-wrap gap-1 items-center"
      >
        <span v-if="report.contentDeleted" class="text-danger font-bold">{{
          t('admin.reports.deleted')
        }}</span>
        <template v-if="!isMessage && report.itemType">
          <span v-if="report.contentDeleted">·</span>
          <span>{{ getTypeLabel(report.itemType) }}</span>
          <span>·</span>
          <span>{{
            getSubjectName(report.itemSubject, report.itemCourse)
          }}</span>
          <span>·</span>
          <span>{{ fmtDate(report.itemDueDate) }}</span>
          <template v-if="report.creatorEmail">
            <span>·</span>
            <span>{{ report.creatorEmail }}</span>
          </template>
        </template>
      </div>
    </template>

    <template v-if="body" #body>
      <div
        class="text-on-ghost break-words [overflow-wrap:anywhere] hyphens-auto whitespace-pre-wrap select-text cursor-text"
      >
        {{ body }}
      </div>
    </template>

    <template #content-after>
      <div
        v-if="report.itemAttachments?.length"
        class="grid grid-cols-4 gap-2 mt-2 mb-2"
      >
        <div
          v-for="img in report.itemAttachments"
          :key="img.publicId"
          class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-black/[0.12] select-none"
        >
          <img
            v-if="previewUrl(img)"
            :src="previewUrl(img) ?? undefined"
            class="block h-full w-full object-cover pointer-events-none"
            :alt="t('common.preview')"
          />
        </div>
      </div>

      <div
        v-if="report.itemEditorNote"
        class="mt-2 pt-1 border-t border-ghost-border"
      >
        <div class="text-on-ghost text-base font-bold mb-1">
          {{ t('tasks.list.notes.note') }}
        </div>
        <div class="text-on-ghost text-base whitespace-pre-wrap break-words">
          {{ report.itemEditorNote }}
        </div>
      </div>

      <div v-if="report.reason" class="mt-2 pt-1 border-t border-ghost-border">
        <div class="text-on-ghost text-base font-bold mb-1">
          {{ t('admin.reports.reason') }}
        </div>
        <div class="text-on-ghost-muted text-base italic mb-2">
          "{{ report.reason }}"
        </div>
      </div>

      <div class="mt-1 mb-2 text-sm text-on-ghost-muted">
        {{
          t('admin.reports.from', {
            email: report.reporterEmail,
            date: fmtDate(report.reportedAt),
          })
        }}
      </div>

      <BaseRow class="pt-2 border-t border-ghost-border">
        <BaseButton
          variant="ghost"
          :icon="Trash2"
          @click="emit('delete', report.id)"
        >
          {{ t('admin.reports.delete') }}
        </BaseButton>
      </BaseRow>
    </template>
  </ItemCard>
</template>
