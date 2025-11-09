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
        <button
            v-if="user"
            class="btn"
            @click="showTodoForm = true"
            data-umami-event="Privater Eintrag erstellen Button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="14px" fill="#000000"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>Neuer privater Eintrag
        </button>
        <div v-else class="login-prompt">
          <p>Du musst angemeldet sein, um private Einträge zu verwenden.</p>
          <button class="btn" @click="$router.push('/items/HAUSAUFGABE')">
            Anmelden/Registrieren
          </button>
        </div>
      </div>
    </div>

    <div v-if="showTodoForm" class="todo-form-modal">
      <div class="modal-content">
        <h3>{{ editingTodo ? 'Privaten Eintrag bearbeiten' : 'Neuen privaten Eintrag erstellen' }}</h3>

        <form @submit.prevent="saveTodo">
          <div class="form-group">
            <label>Titel </label>
            <input
                v-model="todoForm.title"
                type="text"
                class="input"
                placeholder="Titel des privaten Eintrag"
                maxlength="100"
                required
            />
            <div class="char-count">{{ todoForm.title.length }}/100</div>
          </div>

          <div class="form-group">
            <label>Fälligkeitsdatum & Uhrzeit</label>
            <input
                v-model="todoForm.dueDate"
                type="datetime-local"
                class="input"
            />
          </div>

          <div class="form-group">
            <label>Beschreibung</label>
            <textarea
                v-model="todoForm.content"
                class="textarea"
                placeholder="Details zum privaten Eintrag..."
                rows="4"
                maxlength="5000"
            ></textarea>
            <div class="char-count">{{ todoForm.content.length }}/5000</div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn ghost" @click="cancelEdit">
              Abbrechen
            </button>
            <button
                type="submit"
                class="btn"
                :disabled="!todoForm.title.trim() || saving"
            >
              {{ saving ? 'Speichert...' : (editingTodo ? 'Speichern' : 'Erstellen') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- To-Do Liste -->
    <div v-if="user" class="todo-list">
      <div v-if="loading" class="loader">
        <LoadingSpinner color="#fff" size="1.2em" />
        <div style="color: #aaaaaa">Lade private Einträge...</div>
      </div>

      <div v-else-if="todos.length === 0" class="empty-state">
        <p>Noch keine privaten Einträge vorhanden.</p>
        <p class="small"><p class="spannn" @click="showTodoForm = true" >Erstelle deinen ersten privaten Eintrag!</p></p>
      </div>

      <div v-else class="todos-container">
        <div class="todo-filters">
          <button
              class="btn ghost small"
              :class="{ 'active': filter === 'all' }"
              @click="filter = 'all'"
          >
            Alle
          </button>
          <button
              class="btn ghost small"
              :class="{ 'active': filter === 'pending' }"
              @click="filter = 'pending'"
          >
            Ausstehend
          </button>
          <button
              class="btn ghost small"
              :class="{ 'active': filter === 'completed' }"
              @click="filter = 'completed'"
          >
            Erledigt
          </button>
        </div>

        <div class="todos-list">
          <div
              v-for="todo in filteredTodos"
              :key="todo.id"
              class="todo-item"
              :class="{
        'completed': todo.completed,
        'overdue': isOverdue(todo.dueDate, todo.completed)
    }"
          >
            <div class="todo-main">
              <div class="todo-checkbox">
                <input
                    type="checkbox"
                    :checked="todo.completed"
                    @change="toggleTodoCompletion(todo)"
                />
                <span class="checkmark"></span>
              </div>

              <div class="todo-content">
                <h4 class="todo-title">{{ todo.title }}</h4>
                <p v-if="todo.content" class="todo-description">
                  {{ todo.content }}
                </p>
                <div v-if="todo.dueDate" class="todo-due-date">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                  </svg>
                  {{ formatDateTime(todo.dueDate) }}
                  <span v-if="isOverdue(todo.dueDate, todo.completed)" class="overdue-badge">
                    Überfällig
                  </span>
                </div>
                <div class="todo-meta">
                  Erstellt: {{ formatDate(todo.createdAt) }}
                </div>
              </div>
            </div>

            <div class="todo-actions">
              <button
                  class="btn ghost tiny"
                  @click="editTodo(todo)"
                  title="Bearbeiten"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </button>
              <button
                  class="btn danger tiny"
                  @click="deleteTodo(todo.id)"
                  title="Löschen"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Nachrichten -->
    <div v-if="message" class="message" :class="{ error: isError }">
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import hw from '../hwApi';
import LoadingSpinner from "../components/LoadingSpinner.vue";

interface Todo {
  id: string;
  title: string;
  content: string;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

const router = useRouter();
const user = ref<any>(null);
const todos = ref<Todo[]>([]);
const loading = ref(false);
const saving = ref(false);
const showTodoForm = ref(false);
const editingTodo = ref<Todo | null>(null);
const filter = ref<'all' | 'pending' | 'completed'>('all');
const message = ref('');
const isError = ref(false);

const todoForm = ref({
  title: '',
  content: '',
  dueDate: ''
});

const filteredTodos = computed(() => {
  return todos.value.filter(todo => {
    if (filter.value === 'all') return true;
    if (filter.value === 'completed') return todo.completed;
    if (filter.value === 'pending') return !todo.completed;
    return true;
  }).sort((a, b) => {
    // Überfällige zuerst, dann nach Datum
    const aOverdue = isOverdue(a.dueDate, a.completed);
    const bOverdue = isOverdue(b.dueDate, b.completed);

    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // Dann nach Fälligkeitsdatum sortieren
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
});

onMounted(() => {
  loadUser();
});

async function loadUser() {
  try {
    const { data } = await hw.get('/api/auth/me');
    user.value = data;
    if (user.value) {
      loadTodos();
    }
  } catch {
    user.value = null;
  }
}

async function loadTodos() {
  if (!user.value) return;

  loading.value = true;
  try {
    const { data } = await hw.get('/api/todos');
    todos.value = data;
  } catch (error) {
    console.error('Fehler beim Laden der To-Dos:', error);
    showMessage('Fehler beim Laden der To-Dos', true);
  } finally {
    loading.value = false;
  }
}

async function saveTodo() {
  if (!todoForm.value.title.trim()) return;

  saving.value = true;
  try {
    const todoData = {
      title: todoForm.value.title,
      content: todoForm.value.content,
      dueDate: todoForm.value.dueDate || null
    };

    if (editingTodo.value) {
      await hw.put(`/api/todos/${editingTodo.value.id}`, todoData);
      showMessage('To-Do erfolgreich aktualisiert');
    } else {
      await hw.post('/api/todos', todoData);
      showMessage('To-Do erfolgreich erstellt');
    }

    resetForm();
    await loadTodos();
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || 'Fehler beim Speichern';
    showMessage(errorMsg, true);
  } finally {
    saving.value = false;
  }
}

async function toggleTodoCompletion(todo: Todo) {
  try {
    const response = await hw.patch(`/api/todos/${todo.id}/toggle`);

    await loadTodos();

  } catch (error: any) {
    const errorMsg = error.response?.data?.error || 'Fehler beim Aktualisieren';
    showMessage(errorMsg, true);
  }
}

async function deleteTodo(id: string) {
  if (!confirm('Möchtest du dieses To-Do wirklich löschen?')) return;

  try {
    await hw.delete(`/api/todos/${id}`);
    showMessage('To-Do erfolgreich gelöscht');
    await loadTodos();
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || 'Fehler beim Löschen';
    showMessage(errorMsg, true);
  }
}

function editTodo(todo: Todo) {
  editingTodo.value = todo;
  todoForm.value = {
    title: todo.title,
    content: todo.content,
    dueDate: todo.dueDate ? formatDateTimeLocal(todo.dueDate) : ''
  };
  showTodoForm.value = true;
}

function resetForm() {
  todoForm.value = {
    title: '',
    content: '',
    dueDate: ''
  };
  editingTodo.value = null;
  showTodoForm.value = false;
}

function cancelEdit() {
  resetForm();
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('de-DE');
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('de-DE');
}

function formatDateTimeLocal(dateString: string) {
  const date = new Date(dateString);
  return date.toISOString().slice(0, 16);
}

function isOverdue(dueDate: string | null, completed: boolean = false) {
  if (!dueDate || completed) return false;
  return new Date(dueDate) < new Date();
}

function showMessage(msg: string, error = false) {
  message.value = msg;
  isError.value = error;
  setTimeout(() => {
    message.value = '';
    isError.value = false;
  }, 5000);
}
</script>

<style scoped>

.todo-app-integrated {
}
.login-prompt {
  text-align: center;
  padding: 2rem;
}

.todo-form-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--card);
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text);
}

.char-count {
  text-align: right;
  font-size: 0.8rem;
  color: var(--muted);
  margin-top: 0.25rem;
}

.textarea {
  resize: vertical;
  min-height: 100px;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

.todo-list {
  margin-top: 2rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--muted);
}

.todo-filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.todo-filters .btn.active {
  background: var(--primary);
  color: white;
}

.todos-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.todo-item {
  background: var(--jj);
  border-radius: 8px;
  padding: 1.5rem;
  border: none;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}



.todo-item.completed {
  opacity: 0.7;
  background: rgba(255, 255, 255, 0.05);
}

.todo-item.overdue {
  border-color: var(--danger);
}

.todo-main {
  display: flex;
  gap: 1rem;
  flex: 1;
}

.todo-checkbox {
  position: relative;
  margin-top: 0.25rem;
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
  border: 2px solid var(--border);
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
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.todo-content {
  flex: 1;
}

.todo-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: var(--text);
  word-break: break-word;
  hyphens: auto;
}

.todo-item.completed .todo-title {
  text-decoration: line-through;
  color: var(--muted);
}

.todo-description {
  margin: 0 0 0.75rem 0;
  color: var(--muted);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.todo-due-date {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--muted);
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

.todo-meta {
  font-size: 0.8rem;
  color: var(--muted);
}

.todo-actions {
  display: flex;
  gap: 0.5rem;
  z-index: 5;
  position: relative;
}

.message {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 6px;
  background: rgba(63, 147, 248, 0.1);
  border: 1px solid var(--primary);
}

.message.error {
  background: rgba(239, 68, 68, 0.1);
  border-color: var(--danger);
}
.secure {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0;
}

.spannn {
  cursor: pointer;
  transition: 0.1s ease-in;

}

.spannn:hover {
  transform: scale(1.02);
}

.todo-app-integrated .hw-header {
  background: transparent;
  padding: 0;
  margin-bottom: 1rem;
}
.todo-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-direction: column;
  text-align: left;
  margin-bottom: 1rem;
}


@media (max-width: 768px) {
  .modal-content {
    margin: 1rem;
    padding: 1.5rem;
  }

  .todo-item {
    flex-direction: column;
    gap: 1rem;
  }

  .todo-actions {
    align-self: flex-end;
  }

  .form-actions {
    flex-direction: column;
  }
}
</style>