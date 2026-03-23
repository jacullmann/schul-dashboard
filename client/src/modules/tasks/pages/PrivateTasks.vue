<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import PrivateTaskApp from '@/modules/tasks/components/PrivateTaskApp.vue';
import PrivateTaskForm from '@/modules/tasks/components/PrivateTaskForm.vue';
import { Plus } from 'lucide-vue-next';
import type { PrivateTask } from '@/modules/tasks/types';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/common/composables/useToast';

const { t } = useI18n();
const toast = useToast();

const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const showPrivateTaskForm = ref(false);
const privateTaskToEdit = ref<PrivateTask | null>(null);
const privateTaskAppRef = ref<{ addTodo: (todo: PrivateTask) => void; updateTodo: (todo: PrivateTask) => void } | null>(null);


function openCreateForm() {
  privateTaskToEdit.value = null;
  showPrivateTaskForm.value = true;
}

function openEditTodo(todo: PrivateTask) {
  privateTaskToEdit.value = todo;
  showPrivateTaskForm.value = true;
}

function handleTodoSuccess(data?: PrivateTask) {
  const msg = privateTaskToEdit.value
    ? t('school.private.successUpdate')
    : t('school.private.successCreate');
  toast.success(msg);
  showPrivateTaskForm.value = false;
  if (privateTaskAppRef.value && data) {
    if (privateTaskToEdit.value) {
      privateTaskAppRef.value.updateTodo(data);
    } else {
      privateTaskAppRef.value.addTodo(data);
    }
  }
  privateTaskToEdit.value = null;
}

function onFormError(msg: string) {
  toast.error(msg || t('global.errors.validationFailed'));
}
</script>

<template>
  <div class="card">
    <div class="page-header">
      <h2 style="margin: 0">{{ t('school.private.title') }}</h2>
      <BaseButton v-if="user" @click="openCreateForm" variant="action">
        <Plus :size="16" />
        <span>{{ t('school.private.newEntry') }}</span>
      </BaseButton>
    </div>

    <div class="private-entries-container">
      <PrivateTaskApp
          ref="privateTaskAppRef"
          @create="openCreateForm"
          @edit="openEditTodo"
      />
    </div>

    <PrivateTaskForm
        v-if="showPrivateTaskForm"
        :initial="privateTaskToEdit || undefined"
        @cancel="showPrivateTaskForm = false"
        @success="handleTodoSuccess"
        @error="onFormError"
    />

  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
</style>