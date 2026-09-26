<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ListFilter } from '@lucide/vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

const { t } = useI18n();
const { activeGroupId } = useAppAuth();
</script>

<template>
  <p
    class="m-0 flex flex-wrap items-center gap-x-1.5 text-sm text-on-ghost-muted"
  >
    <ListFilter :size="16" class="shrink-0" aria-hidden="true" />
    <span>{{ t('common.personalized_view.notice') }}</span>
    <BaseLink
      v-if="activeGroupId"
      inline
      :to="{
        name: 'group-admin',
        params: { groupId: activeGroupId, tab: 'courses' },
      }"
    >
      {{ t('common.personalized_view.edit_courses') }}
    </BaseLink>
  </p>
</template>
