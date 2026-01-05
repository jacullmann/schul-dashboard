<template>
  <div class="todo-app-integrated">
    <div class="todo-header">
      <div>
        <div class="secure">
          <Lock style="color: var(--text);" size="24"/>
          <h2 style="margin: 0;">Private Einträge</h2>
        </div>
        <div style="color: var(--text); margin-bottom: 0.4rem" class="small">
          Deine persönlichen privaten Einträge – immer dabei und nur für dich sichtbar.
        </div>
      </div>

      <div class="header-actions">
        <!--<button
            v-if="user"
            class="btn"
            @click="$emit('create')"
            data-umami-event="Privater Eintrag erstellen Button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="14px" fill="#000000"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>Neuer privater Eintrag
        </button>-->
        <div v-if="!user" class="login-prompt">
          <p>Du musst angemeldet sein, um private Einträge zu verwenden.</p>
        </div>
      </div>
    </div>

    <div v-if="user" class="todo-list">
      <div v-if="loading" class="loader">
        <LoadingSpinner color="#fff" size="1.2em" />
        <div style="color: var(--sub)">Lade private Einträge...</div>
      </div>

      <div v-else-if="todos.length === 0" class="empty-state">
        <p>Noch keine privaten Einträge vorhanden.</p>
        <p class="small"><span class="spannn" @click="$emit('create')" >Erstelle deinen ersten privaten Eintrag!</span></p>
      </div>

      <div v-else class="todos-container">
        <div class="todo-filters">
          <button class="btn ghost small" :class="{ 'active': filter === 'all' }" @click="filter = 'all'">Alle</button>
          <button class="btn ghost small" :class="{ 'active': filter === 'pending' }" @click="filter = 'pending'">Ausstehend</button>
          <button class="btn ghost small" :class="{ 'active': filter === 'completed' }" @click="filter = 'completed'">Erledigt</button>
        </div>

        <div class="todos">
          <div
              v-for="todo in filteredTodos"
              :key="todo.id"
              class="todo-card"
              :class="{ 'completed': todo.completed }"
          >
            <div class="todo-main">
              <div class="todo-meta">
                <div class="todo-top-row">
                  <div class="todo-checkbox">
                    <input type="checkbox" :checked="todo.completed" @change="toggleTodoCompletion(todo)" />
                    <span class="checkmark"></span>
                  </div>
                  <h3 class="todo-title">{{ todo.title }}</h3>
                </div>

                <div class="todo-badge-row">
                  <div v-if="todo.dueDate" class="todo-due-date">
                    {{ formatDateTime(todo.dueDate) }}
                    <span v-if="isOverdue(todo.dueDate, todo.completed)" class="overdue-badge">Überfällig</span>
                  </div>
                </div>
              </div>

              <div class="item-menu-trigger" @click.stop="toggleMenu(todo.id)"><Ellipsis /></div>
              <div class="item-menu" :class="{ open: openMenuId === todo.id }" @click.stop>
                <button class="menu-btn" @click="$emit('edit', todo); openMenuId = null">
                  <div class="fixall"><Pencil :size="16" /> Bearbeiten</div>
                </button>
                <button class="menu-btn danger" @click="deleteTodo(todo.id); openMenuId = null">
                  <div class="fixall"><Trash2 :size="16" /> Löschen</div>
                </button>
              </div>
            </div>

            <div class="todo-body">
              <span v-if="todo.content">{{ todo.content }}</span>
            </div>


          </div>
        </div>
      </div>
    </div>
    <div v-if="message" class="message" :class="{ error: isError }">{{ message }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useUserStore } from '../stores/userStore';
import { useRouter } from 'vue-router';
import hw from '../hwApi';
import LoadingSpinner from "../components/LoadingSpinner.vue";
import { Pencil, Trash2, Ellipsis, Lock } from 'lucide-vue-next';

interface Todo {
  id: string;
  title: string;
  content: string;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

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

// expose loadTodos so Parent can trigger reload after TodoForm saves
defineExpose({ loadTodos });

const filteredTodos = computed(() => {
  return todos.value.filter(todo => {
    if (filter.value === 'all') return true;
    if (filter.value === 'completed') return todo.completed;
    if (filter.value === 'pending') return !todo.completed;
    return true;
  }).sort((a, b) => {
    const aOverdue = isOverdue(a.dueDate, a.completed);
    const bOverdue = isOverdue(b.dueDate, b.completed);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
});

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
  } catch (error) {
    showMessage('Fehler beim Laden der privaten Einträge', true);
  } finally {
    loading.value = false;
  }
}

async function toggleTodoCompletion(todo: Todo) {
  try {
    await hw.patch(`/api/todos/${todo.id}/toggle`);
    await loadTodos();
  } catch (error: any) {
    showMessage(error.response?.data?.error || 'Fehler beim Aktualisieren', true);
  }
}

async function deleteTodo(id: string) {
  if (!confirm('Möchtest du diesen privaten Eintrag wirklich löschen?')) return;
  try {
    await hw.delete(`/api/todos/${id}`);
    showMessage('Privater Eintrag erfolgreich gelöscht');
    await loadTodos();
  } catch (error: any) {
    showMessage(error.response?.data?.error || 'Fehler beim Löschen', true);
  }
}

function formatDate(dateString: string) { return new Date(dateString).toLocaleDateString('de-DE'); }
function formatDateTime(dateString: string) { return new Date(dateString).toLocaleString('de-DE', { hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit', year:'numeric' }); }
function isOverdue(dueDate: string | null, completed: boolean = false) {
  if (!dueDate || completed) return false;
  return new Date(dueDate) < new Date();
}
function showMessage(msg: string, error = false) {
  message.value = msg;
  isError.value = error;
  setTimeout(() => { message.value = ''; isError.value = false; }, 5000);
}
</script>

<style scoped>
.todo-app-integrated {

}
.login-prompt {
  text-align: center;
  padding: 2rem;
}
.todo-list {
  margin-top: 2rem;
}
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--sub);
}
.todo-filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.todo-filters .btn.active {
  background-color: var(--text);
  color: var(--vlbg);
}
.todos {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.todo-card {
  border-radius: var(--border-7);
  padding: 12px;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  transition: transform 150ms ease;
  overflow: visible;
  cursor: default;
}
.todo-main {
  position: relative;
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:12px;
}
.todo-meta {
  flex:1;
  min-width: 0;
}
.todo-top-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.todo-badges-row {
  opacity: 1;
  max-height: 50px;
  margin-top: 8px;
}
.todo-checkbox {
  position: relative;
  z-index: 10;
}
.todo-checkbox input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  z-index: 20;
  width: 20px;
  height: 20px;
}
.checkmark {
  display: block;
  width: 20px;
  height: 20px;
  border: 2px solid var(--border2);
  border-radius: 4px;
  position: relative;
  transition: all 0.3s ease;
  z-index: 15;
}
.todo-checkbox:hover .checkmark {
  transform: scale(1.1);
}
.todo-checkbox input:checked + .checkmark {
  background: var(--primary);
  border-color: var(--primary);
}
.todo-checkbox input:checked + .checkmark::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid var(--text);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.todo-content {
  flex: 1;
}
.todo-title {
  margin:-3px 0;
  font-size:1.125rem;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  line-height: 24px;
}
.todo-due-date {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text);
  margin-bottom: 0.5rem;
}
.overdue-badge {
  background: var(--danger);
  color: white;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}
.message {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 6px;
  background: rgba(63, 147, 248, 0.1);
  border: none;
}
.message.error {
  background: rgba(239, 68, 68, 0.1);
  border-color: var(--danger);
  border: none;
}
.secure {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0;
  color: var(--text);
}
.spannn {
  cursor: pointer;
  transition: 0.1s ease-in;
}
.spannn:hover {
  transform: scale(1.02);
}
.item-menu-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 24px;
  padding: 4px 8px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--sub);
  transition: background 120ms ease, color 120ms ease;
  margin: -3px -3px;
}
.item-menu-trigger:hover {
  background: var(--gg);
  color: var(--text);
}
.item-menu {
  position: absolute;
  margin-top: 24px;
  right: 0;
  min-width: 150px;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: 12px;
  padding:8px;
  display: none;
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
  z-index: 1000;
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
  pointer-events: none;
  transition: opacity 160ms ease, transform 160ms ease;
  margin-bottom: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}
.item-menu.open {
  display: flex;
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}
.menu-btn {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 6px;
  color: var(--text);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}
.menu-btn:hover {
  background: var(--gg);
}
.menu-btn.danger {
  color: var(--special--red);
  fill: var(--special--red);
}
.menu-btn.danger:hover {
  background: var(--special--red--background);
}
.fixall {
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1;
}
.todo-body {
  margin-top:8px;
  color: var(--text);
  word-break: break-word;
  overflow-wrap: anywhere;
  hyphens: auto;
  white-space: pre-wrap;
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}
@media (max-width: 768px) {
  .todo-card {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>