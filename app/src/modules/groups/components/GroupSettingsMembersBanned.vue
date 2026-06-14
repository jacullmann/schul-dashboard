<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

defineProps<{
  bannedUsers: { userId: string; generatedName: string; bannedAt: string }[];
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'revert-ban', userId: string): void;
}>();

const { t } = useI18n();
const { checkPermission } = useAppAuth();
const canModerateMembers = computed(() => checkPermission('moderate_members'));
</script>

<template>
  <div class="animate-fade-up">
    <PageHeader>
      {{ t('groups.settings.members.ban_list.title') }}
    </PageHeader>

    <div
      v-if="loading && bannedUsers.length === 0"
      class="flex justify-center p-8 bg-surface border border-surface-border rounded-xl"
    >
      <BaseSpinner />
    </div>
    <BaseEmptyState
      v-else-if="bannedUsers.length === 0"
      class="text-center p-8 text-on-ghost-muted text-base"
    >
      <template #title>
        {{ t('groups.settings.members.ban_list.empty') }}
      </template>

      <template #message>Banned users will appear here</template>
    </BaseEmptyState>
    <div v-else class="flex flex-col gap-1.5">
      <div
        v-for="(user, index) in bannedUsers"
        :key="user.userId"
        class="flex items-center justify-between p-2 px-3 bg-surface border border-surface-border shadow-input rounded-xl gap-3 animate-fade-up"
        :style="{
          animationDelay: `${index * 0.075}s`,
          animationFillMode: 'both',
        }"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <span
            class="font-semibold text-base whitespace-nowrap overflow-hidden text-ellipsis"
            >{{ user.generatedName }}</span
          >
          <span class="text-xs font-medium text-on-ghost-muted"
            >{{ t('groups.settings.members.ban_list.banned_on_prefix')
            }}{{ new Date(user.bannedAt).toLocaleDateString('de-DE') }}</span
          >
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <BaseButton
            :disabled="!canModerateMembers"
            variant="ghost"
            @click="emit('revert-ban', user.userId)"
          >
            {{ t('groups.settings.members.ban_list.actions.unban') }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
