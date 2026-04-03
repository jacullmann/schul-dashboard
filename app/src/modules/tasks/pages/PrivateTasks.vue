<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import PrivateTaskApp from '@/modules/tasks/components/PrivateTaskApp.vue';
import { Plus } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { usePrivateTaskForm } from '@/core/composables/usePrivateTaskForm';

const { t } = useI18n();

const { openPrivateTaskForm } = usePrivateTaskForm();

const userStore = useUserStore();
const { user } = storeToRefs(userStore);
</script>

<template>
  <div class="card">
    <PageHeader>
      {{ t('school.private.title') }}
      <template #action>
        <BaseButton v-if="user" @click="openPrivateTaskForm" variant="action">
          <Plus :size="16" />
          <span>{{ t('school.private.newEntry') }}</span>
        </BaseButton>
      </template>
    </PageHeader>

    <div class="private-entries-container">
      <PrivateTaskApp />
    </div>
  </div>
</template>
