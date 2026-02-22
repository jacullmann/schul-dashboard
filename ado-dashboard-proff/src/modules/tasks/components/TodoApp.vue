<template>
  <div class="todo-app-integrated">
    <div class="todo-header">
      <div class="secure">
        <Lock style="color: var(--text)" :size="24" />
        <h2 style="margin: 0; font-size: var(--font-size-h2); line-height: 24px;">{{ t('school.private.onlyVisibleToYou') }}</h2>
        <InfoPop
            :tooltip="t('school.private.infopop.tooltip')"
            :title="t('school.private.onlyVisibleToYou')"
        >
          <p v-html="t('school.private.infopop.text')"></p>
        </InfoPop>
      </div>
      <div v-if="!user" class="login-prompt">
        <p>{{ t('school.private.requiresAccount') }}</p>
      </div>
    </div>

    <div v-if="user" class="todo-list">
      <div v-if="loading" class="loader">
        <LoadingSpinner color="#fff" size="24px" />
        <div style="color: var(--sub)">{{ t('school.private.loading') }}</div>
      </div>

      <div v-else-if="todos.length === 0" class="empty-state">
        <p>{{ t('school.private.noEntriesFound') }}</p>
      </div>

      <div v-else class="todos-container">
        <div class="todos">
          <div
              v-for="todo in displayTodos"
              :key="todo.id"
              class="item-card"
              :class="{ collapsed: todo.completed }"
              @dblclick="user ? toggleTodoCompletion(todo) : null"
          >
            <div class="item-main">
              <div class="item-meta">
                <div style="display:flex; align-items:center; gap:8px;">
                  <Checkbox
                      :checked="todo.completed"
                      @change="toggleTodoCompletion(todo)"
                  />
                  <h3 class="item-title" :title="todo.title">{{ todo.title }}</h3>
                </div>
              </div>

              <div class="item-menu-trigger" role="button" tabindex="0" @click.stop="toggleMenu(todo.id)">
                <Ellipsis />
              </div>

              <div class="menu" :class="{ open: openMenuId === todo.id }" @click.stop>
                <button class="menu-btn" @click="$emit('edit', todo); openMenuId = null">
                  <div class="menu-btn-content"><Pencil :size="16" />{{ t('global.buttons.delete') }}</div>
                </button>

                <div class="menu-divider"></div>

                <button class="menu-btn danger" @click="deleteTodo(todo.id); openMenuId = null">
                  <div class="menu-btn-content"><Trash2 :size="16" />{{ t('global.buttons.edit') }}</div>
                </button>
              </div>
            </div>

            <transition name="collapse">
              <div v-show="!todo.completed" v-if="todo.description" class="item-body">
                <span>{{ todo.description }}</span>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>
    <div v-if="message" class="message" :class="{ error: isError }">{{ message }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import Checkbox from '@/common/components/Checkbox.vue';
import { useUserStore } from '@/stores/userStore.ts';
import { useRouter } from 'vue-router';
import hw from '@/api/hwApi';
import LoadingSpinner from "@/common/components/LoadingSpinner.vue";
import { Pencil, Trash2, Ellipsis, Lock } from 'lucide-vue-next';
import InfoPop from '@/common/components/InfoModalCenter.vue'
import { useI18n } from 'vue-i18n';
import type { Todo } from '@/modules/tasks/types.ts';

const { t } = useI18n();

// Definition der Events für den Parent
const emit = defineEmits<{
  (e: 'create'): void;
  (e: 'edit', todo: Todo): void;
}>();

const router = useRouter();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const todos = ref<Todo[]>([]);
const loading = ref(false);
const filter = ref<'all' | 'pending' | 'completed'>('all');
const message = ref('');
const isError = ref(false);
const openMenuId = ref<string | null>(null);
const displayTodos = ref<Todo[]>([]);
const sortDisplayList = (data: Todo[]): Todo[] => {
  return [...data].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

function addTodo(todo: Todo) {
  todos.value.unshift(todo);
  displayTodos.value = sortDisplayList(todos.value);
}

function updateTodo(updatedTodo: Todo) {
  const index = todos.value.findIndex(t => t.id === updatedTodo.id);
  if (index !== -1) {
    todos.value[index] = { ...todos.value[index], ...updatedTodo };
    displayTodos.value = sortDisplayList(todos.value);
  }
}
defineExpose({ loadTodos, addTodo, updateTodo });

function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id;
}
const closeMenu = () => { openMenuId.value = null; }

onMounted(() => {
  document.addEventListener('click', closeMenu);
  if (user.value) {
    loadTodos();
  }
});
watch(user, (newUser) => {
  if (newUser) {
    loadTodos();
  } else {
    todos.value = [];
  }
}, { immediate: true });
onUnmounted(() => {
  document.removeEventListener('click', closeMenu);
});


async function loadTodos() {
  if (!user.value) return;
  loading.value = true;
  try {
    const { data } = await hw.get('/api/todos');
    todos.value = data;
    displayTodos.value = sortDisplayList(data);
  } catch (error) {
    showMessage('Fehler beim Laden der privaten Einträge', true);
  } finally {
    loading.value = false;
  }
}

//Hier absichtlich displayTodos nicht aktualisieren, da die einträge sonst komisch springen
async function toggleTodoCompletion(todo: Todo) {
  const previousState = todo.completed;
  todo.completed = !todo.completed;
  try {
    const { data } = await hw.patch(`/api/todos/${todo.id}/toggle`);
    todo.updatedAt = data.updatedAt;
  } catch (error: any) {
    todo.completed = previousState;
    showMessage(error.response?.data?.error || 'Fehler beim Aktualisieren', true);
  }
}

async function deleteTodo(id: string) {
  if (!confirm('Möchtest du diesen privaten Eintrag wirklich löschen?')) return;
  const todoIndex = todos.value.findIndex(t => t.id === id);
  if (todoIndex === -1) return;
  const deletedTodo = todos.value[todoIndex];
  todos.value.splice(todoIndex, 1);
  try {
    await hw.delete(`/api/todos/${id}`);
    displayTodos.value = sortDisplayList(todos.value);
    showMessage(t('school.private.successDelete'));
  } catch (error: any) {
    todos.value.splice(todoIndex, 0, deletedTodo);
    showMessage(error.response?.data?.error || 'Fehler beim Löschen', true);
  }
}

function showMessage(msg: string, error = false) {
  message.value = msg;
  isError.value = error;
  setTimeout(() => { message.value = ''; isError.value = false; }, 5000);
}
</script>

<style scoped>
.login-prompt {
  text-align: center;
  padding: 2rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--sub);
}

.todo-filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.todo-filters .btn.active {
  background-color: var(--text);
  color: var(--vlbg);
}

.todos {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.item-card {
  border-radius: var(--border-7);
  padding: 12px;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  transition: transform 150ms ease;
  overflow: visible;
  cursor: default;
  box-shadow: var(--input-shadow);
}

.item-card.collapsed {
  transition: padding 300ms cubic-bezier(0.78, 0, 0.22, 1),
  max-height 300ms cubic-bezier(0.78, 0, 0.22, 1);
}

.item-main {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.item-meta {
  flex: 1;
  min-width: 0;
}

.item-title {
  margin: -3px 0;
  font-size: var(--font-size-title);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 24px;
}

.item-badges {
  margin-top: 4px;
  gap: 8px;
  align-items: center;
}

.row-n.item-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
  transition: opacity 300ms cubic-bezier(0.78, 0, 0.22, 1),
  max-height 300ms cubic-bezier(0.78, 0, 0.22, 1),
  margin-top 300ms cubic-bezier(0.78, 0, 0.22, 1);
  opacity: 1;
  max-height: 50px;
  margin-top: 8px;
}

.row-n.item-badges.collapsed {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  overflow: hidden;
}

.item-menu-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: var(--border-5);
  cursor: pointer;
  color: var(--sub);
  transition: background 120ms ease, color 120ms ease;
  margin: -8px;
}

.item-menu-trigger:hover {
  background: var(--gg);
  color: var(--text);
}

.item-body {
  margin-top: 8px;
  color: var(--text);
  word-break: break-word;
  overflow-wrap: anywhere;
  hyphens: auto;
  white-space: pre-wrap;
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}

.no-description {
  color: var(--sub);
  font-style: italic;
}

.collapse-enter-active,
.collapse-leave-active {
  transition: max-height 300ms cubic-bezier(0.78, 0, 0.22, 1),
  opacity 300ms cubic-bezier(0.78, 0, 0.22, 1),
  padding 300ms cubic-bezier(0.78, 0, 0.22, 1);
}

.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  max-height: 800px;
  opacity: 1;
}

.message {
  margin-top: 1rem;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--vlbg);
  border: 1px solid var(--border2);
}

.message.error {
  border-color: var(--danger);
}

.secure {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-block: 0 1rem;
  color: var(--text);
}

.loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 2rem;
}

@media (max-width: 768px) {
  .item-body {
    user-select: none;
    -webkit-user-select: none;
    cursor: inherit;
  }
}
</style>