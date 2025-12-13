<template>
  <div class="todo-app-integrated">
    <div class="todo-header">
      <div>
        <div class="secure">
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80ZM240-160v-400 400Z"/></svg>
          <h2>Private Einträge</h2>
        </div>
        <div style="color: #f1f1f1; margin-bottom: 0.4rem" class="small">
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
          <button class="btn" @click="$router.push('/items/HAUSAUFGABE')">
            Anmelden/Registrieren
          </button>
        </div>
      </div>
    </div>

    <div v-if="user" class="todo-list">
      <div v-if="loading" class="loader">
        <LoadingSpinner color="#fff" size="1.2em" />
        <div style="color: #aaaaaa">Lade private Einträge...</div>
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

        <div class="todos-list">
          <div
              v-for="todo in filteredTodos"
              :key="todo.id"
              class="todo-item"
              :class="{ 'completed': todo.completed, 'overdue': isOverdue(todo.dueDate, todo.completed) }"
          >
            <div class="todo-main">
              <div class="todo-checkbox">
                <input type="checkbox" :checked="todo.completed" @change="toggleTodoCompletion(todo)" />
                <span class="checkmark"></span>
              </div>

              <div class="todo-content">
                <h4 class="todo-title">{{ todo.title }}</h4>
                <p v-if="todo.content" class="todo-description">{{ todo.content }}</p>
                <div v-if="todo.dueDate" class="todo-due-date">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
                  {{ formatDateTime(todo.dueDate) }}
                  <span v-if="isOverdue(todo.dueDate, todo.completed)" class="overdue-badge">Überfällig</span>
                </div>
                <!--<div class="tod-o-meta">Erstellt: {{ formatDate(tod-o.createdAt) }}</div>-->
              </div>
            </div>

            <div class="todo-actions">
              <div class="item-menu-trigger" @click.stop="toggleMenu(todo.id)"><Ellipsis /></div>
              <div class="item-menu" :class="{ open: openMenuId === todo.id }" @click.stop>
                <button class="menu-btn" @click="$emit('edit', todo); openMenuId = null">
                  <div class="fixall"><Pencil :size="18" /> Bearbeiten</div>
                </button>
                <button class="menu-btn danger" @click="deleteTodo(todo.id); openMenuId = null">
                  <div class="fixall"><Trash2 :size="18" /> Löschen</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="message" class="message" :class="{ error: isError }">{{ message }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import hw from '../hwApi';
import LoadingSpinner from "../components/LoadingSpinner.vue";
import { Pencil, Trash2, Ellipsis } from 'lucide-vue-next'

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
const user = ref<any>(null);
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
  loadUser();
  document.addEventListener('click', closeMenu);
});

onUnmounted(() => {
  document.removeEventListener('click', closeMenu);
});

async function loadUser() {
  try {
    const { data } = await hw.get('/api/auth/me');
    user.value = data;
    if (user.value) loadTodos();
  } catch { user.value = null; }
}

async function loadTodos() {
  if (!user.value) return;
  loading.value = true;
  try {
    const { data } = await hw.get('/api/todos');
    todos.value = data;
  } catch (error) {
    showMessage('Fehler beim Laden der To-Dos', true);
  } finally { loading.value = false; }
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
  if (!confirm('Möchtest du dieses To-Do wirklich löschen?')) return;
  try {
    await hw.delete(`/api/todos/${id}`);
    showMessage('To-Do erfolgreich gelöscht');
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
/* Hier wurden die CSS-Klassen für das Modal entfernt (.todo-form-modal, .modal-content, etc.) */
.todo-app-integrated {}
.login-prompt { text-align: center; padding: 2rem; }
.todo-list { margin-top: 2rem; }
.empty-state { text-align: center; padding: 3rem; color: var(--muted); }
.todo-filters { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.todo-filters .btn.active { background-color: #D9D9D9; color: var(--jj); }
.todos-list { display: flex; flex-direction: column; gap: 1rem; }
.todo-item { background: var(--jj); border-radius: 12px; padding: 12px; border: 1px solid var(--border2); transition: all 0.3s ease; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.todo-item.completed { opacity: 0.7; background: rgba(255, 255, 255, 0.05); }
.todo-item.overdue { border-color: var(--danger); }
.todo-main { display: flex; gap: 1rem; flex: 1; }
.todo-checkbox { position: relative; margin-top: 0.25rem; z-index: 10; }
.todo-checkbox input { position: absolute; opacity: 0; cursor: pointer; z-index: 20; width: 20px; height: 20px; }
.checkmark { display: block; width: 20px; height: 20px; border: 2px solid var(--border); border-radius: 4px; position: relative; transition: all 0.3s ease; z-index: 15; }
.todo-checkbox:hover .checkmark { transform: scale(1.1); }
.todo-checkbox input:checked + .checkmark { background: var(--primary); border-color: var(--primary); }
.todo-checkbox input:checked + .checkmark::after { content: ''; position: absolute; left: 6px; top: 2px; width: 5px; height: 10px; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg); }
.todo-content { flex: 1; }
.todo-title { margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--text); word-break: break-word; hyphens: auto; }
.todo-item.completed .todo-title { text-decoration: line-through; color: var(--text); }
.todo-description { margin: 0 0 0.75rem 0; color: var(--text); line-height: 1.5; white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; }
.todo-due-date { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: var(--text); margin-bottom: 0.5rem; }
.overdue-badge { background: var(--danger); color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600; }
.todo-meta { font-size: 0.8rem; color: var(--text); }
.todo-actions { display: flex; gap: 0.5rem; z-index: 5; position: relative; }
.message { margin-top: 1rem; padding: 1rem; border-radius: 6px; background: rgba(63, 147, 248, 0.1); border: none; }
.message.error { background: rgba(239, 68, 68, 0.1); border-color: var(--danger); border: none; }
.secure { display: flex; gap: 0.5rem; align-items: center; margin-top: 0; }
.spannn { cursor: pointer; transition: 0.1s ease-in; }
.spannn:hover { transform: scale(1.02); }
.item-menu-trigger { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; padding: 6px; border-radius: 6px; cursor: pointer; color: #aaaaaa; transition: background 120ms ease, color 120ms ease; }
.item-menu-trigger:hover { background: #414141; color: #f1f1f1; }
.item-menu { position: absolute; top: 100%; right: 0; min-width: 140px; background: #282828; border: none; border-radius: 8px; padding: 6px; display: none; flex-direction: column; gap: 4px; z-index: 1000; opacity: 0; transform: translateY(-6px) scale(0.98); pointer-events: none; transition: opacity 160ms ease, transform 160ms ease; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3); }
.item-menu.open { display: flex; opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
.menu-btn { display: block; width: 100%; text-align: left; background: transparent; border: none; padding: 8px 10px; color: var(--text); border-radius: 6px; cursor: pointer; font-size: 14px; transition: background 0.2s ease; }
.menu-btn:hover { background: rgba(255, 255, 255, 0.1); }
.menu-btn.danger { color: #f65252; }
.menu-btn.danger:hover { background: rgba(246, 82, 82, 0.1); }
.fixall { display: flex; align-items: center; gap: 10px; line-height: 1; }
@media (max-width: 768px) {
  .todo-item { flex-direction: column; gap: 1rem; }
  .todo-actions { align-self: flex-end; }
}
</style>