<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import PrivateTaskApp from '@/modules/tasks/components/PrivateTaskApp.vue';
import { Plus } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { usePrivateTaskForm } from '@/core/composables/usePrivateTaskForm';
import InfoModal from '@/common/components/InfoModal.vue';

const { t, tm } = useI18n();

const { openPrivateTaskForm } = usePrivateTaskForm();

const userStore = useUserStore();
const { user } = storeToRefs(userStore);
</script>

<template>
  <div class="card">
    <PageHeader class="animate-fade-up">
      {{ t('tasks.private_tasks.title') }}
      <template #info>
        <InfoModal
          :tooltip="t('tasks.private_tasks.infopop.tooltip')"
          :title="t('tasks.private_tasks.title')"
        >
          <p v-html="t('tasks.private_tasks.infopop.description')"></p>
          <template
            v-for="(section, index) in tm('tasks.private_tasks.infopop.sections')"
            :key="index"
          >
            <h3 v-html="section.title"></h3>
            <p v-html="section.text"></p>
          </template>
        </InfoModal>
      </template>
      <template #action>
        <BaseTooltip
          :content="t('tasks.private_tasks.new_entry')"
          placement="bottom"
        >
          <BaseButton
            v-if="user"
            @click="openPrivateTaskForm"
            variant="action"
            :icon="Plus"
            icon-classes="size-6"
          />
        </BaseTooltip>
      </template>
    </PageHeader>

    <div class="private-entries-container">
      <PrivateTaskApp />
    </div>
  </div>
</template>
