<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import TodoApp from '@/modules/tasks/components/TodoApp.vue';
import TodoForm from '@/modules/tasks/components/TodoForm.vue';
import { Plus } from 'lucide-vue-next';
import type { Todo } from '@/modules/tasks/types';

const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const showTodoForm = ref(false);
const todoToEdit = ref<Todo | null>(null);
const todoAppRef = ref<{ addTodo: (todo: Todo) => void; updateTodo: (todo: Todo) => void } | null>(null);
const message = ref('');
const isError = ref(false);
let messageTimer: ReturnType<typeof setTimeout> | null = null;

function flash(msg: string, error = false) {
  if (messageTimer) clearTimeout(messageTimer);
  message.value = msg;
  isError.value = error;
  messageTimer = setTimeout(() => { message.value = ''; }, 4000);
}

function openCreateForm() {
  todoToEdit.value = null;
  showTodoForm.value = true;
}

function openEditTodo(todo: Todo) {
  todoToEdit.value = todo;
  showTodoForm.value = true;
}

function handleTodoSuccess(data?: Todo) {
  const msg = todoToEdit.value ? 'Eintrag aktualisiert.' : 'Eintrag erstellt.';
  flash(msg);
  showTodoForm.value = false;
  if (todoAppRef.value && data) {
    if (todoToEdit.value) {
      todoAppRef.value.updateTodo(data);
    } else {
      todoAppRef.value.addTodo(data);
    }
  }
  todoToEdit.value = null;
}

function onFormError(msg: string) {
  flash(msg || 'Bitte Eingaben prüfen.', true);
}
</script>

<template>
  <div class="card">
    <div class="page-header">
      <h2 style="margin: 0">Private Todos</h2>
      <button v-if="user" class="btn action" @click="openCreateForm">
        <Plus :size="16" />
        <span>Neuer Eintrag</span>
      </button>
    </div>

    <div class="private-entries-container">
      <TodoApp
          ref="todoAppRef"
          @create="openCreateForm"
          @edit="openEditTodo"
      />
    </div>

    <TodoForm
        v-if="showTodoForm"
        :initial="todoToEdit || undefined"
        @cancel="showTodoForm = false"
        @success="handleTodoSuccess"
        @error="onFormError"
    />

    <div v-if="message" class="small message" :class="{ error: isError }">{{ message }}</div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.message {
  margin-top: 12px;
  font-weight: 600;
}

.message.error {
  color: var(--danger);
}
</style>