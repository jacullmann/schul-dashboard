<template>
  <div class="card todo-app">
    <h1 class="text-2xl font-bold mb-4 text-center">Aufgabenliste 📝</h1>

    <!-- Input-Formular -->
    <div class="mb-4">
      <div class="row items-end">
        <div class="col">
          <label class="small block mb-1">Aufgabe</label>
          <input
              v-model="newTaskText"
              @keyup.enter="editingTask ? updateTask() : addTask()"
              type="text"
              placeholder="Neue Aufgabe..."
              class="input"
          />
        </div>
        <div class="col-auto">
          <label class="small block mb-1">Priorität</label>
          <select v-model="newTaskPriority" class="input">
            <option value="low">Niedrig</option>
            <option value="medium">Mittel</option>
            <option value="high">Hoch</option>
          </select>
        </div>
        <div class="col-auto">
          <label class="small block mb-1">Fälligkeitsdatum</label>
          <input v-model="newTaskDueDate" type="date" class="input" />
        </div>
        <div class="col-auto">
          <button @click="editingTask ? updateTask() : addTask()" :class="`btn ${editingTask ? 'warn' : 'primary'}`">
            {{ editingTask ? 'Aktualisieren' : 'Hinzufügen' }}
          </button>
        </div>
        <div class="col-auto" v-if="editingTask">
          <button @click="cancelEdit" class="btn ghost">Abbrechen</button>
        </div>
      </div>
    </div>

    <hr />

    <!-- Filter und Zähler -->
    <div class="row items-center justify-between mb-4">
      <div class="small">{{ remainingTasksCount }} offene Aufgaben</div>
      <div class="row">
        <button @click="currentFilter = 'all'" :class="`btn ghost badge ${currentFilter === 'all' ? 'active' : ''}`">Alle</button>
        <button @click="currentFilter = 'active'" :class="`btn ghost badge ${currentFilter === 'active' ? 'active' : ''}`">Offen</button>
        <button @click="currentFilter = 'completed'" :class="`btn ghost badge ${currentFilter === 'completed' ? 'active' : ''}`">Erledigt</button>
      </div>
    </div>

    <!-- Aufgabenliste -->
    <ul class="task-list">
      <li v-for="task in filteredTasks" :key="task.id" class="task-item card">
        <div class="row items-center flex-1">
          <input type="checkbox" :checked="task.completed" @change="toggleCompletion(task.id)" class="mr-3" />
          <div class="col">
            <span :class="{ 'line-through text-muted': task.completed, 'text-text': !task.completed }">{{ task.text }}</span>
            <div class="small mt-1 row gap-2">
              <span class="badge" :class="`badge-${task.priority}`">{{ getPriorityText(task.priority) }}</span>
              <span v-if="task.dueDate">Fällig: {{ formatDate(task.dueDate) }}</span>
            </div>
          </div>
        </div>
        <div class="row-auto">
          <button @click="startEdit(task)" class="btn ghost small">✏️</button>
          <button @click="removeTask(task.id)" class="btn danger small">🗑️</button>
        </div>
      </li>
    </ul>

    <p v-if="!filteredTasks.length" class="text-center text-muted py-8">
      Keine Aufgaben gefunden. Füge eine neue Aufgabe hinzu!
    </p>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';

// Schnittstelle für eine Aufgabe
interface Task {
  id: number;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate: string; // ISO 8601 Datum string
}

export default defineComponent({
  name: 'AdvancedToDoList',
  setup() {
    const tasks = ref<Task[]>([]);
    const newTaskText = ref<string>('');
    const newTaskPriority = ref<'low' | 'medium' | 'high'>('medium');
    const newTaskDueDate = ref<string>('');
    const currentFilter = ref<'all' | 'active' | 'completed'>('all');
    const editingTask = ref<Task | null>(null);

    // Aufgaben aus localStorage laden
    const loadTasks = () => {
      try {
        const storedTasks = localStorage.getItem('tasks');
        if (storedTasks) {
          tasks.value = JSON.parse(storedTasks);
        }
      } catch (e) {
        console.error("Fehler beim Laden der Aufgaben aus localStorage", e);
      }
    };

    // Aufgaben in localStorage speichern
    const saveTasks = () => {
      try {
        localStorage.setItem('tasks', JSON.stringify(tasks.value));
      } catch (e) {
        console.error("Fehler beim Speichern der Aufgaben in localStorage", e);
      }
    };

    // Aufgaben hinzufügen
    const addTask = () => {
      if (newTaskText.value.trim() !== '') {
        const newTask: Task = {
          id: Date.now(),
          text: newTaskText.value.trim(),
          completed: false,
          priority: newTaskPriority.value,
          dueDate: newTaskDueDate.value,
        };
        tasks.value.push(newTask);
        newTaskText.value = '';
        newTaskDueDate.value = '';
        newTaskPriority.value = 'medium';
        saveTasks();
      }
    };

    // Bearbeitung starten
    const startEdit = (task: Task) => {
      editingTask.value = task;
      newTaskText.value = task.text;
      newTaskPriority.value = task.priority;
      newTaskDueDate.value = task.dueDate;
    };

    // Bearbeitung abbrechen
    const cancelEdit = () => {
      editingTask.value = null;
      newTaskText.value = '';
      newTaskPriority.value = 'medium';
      newTaskDueDate.value = '';
    };

    // Aufgabe aktualisieren
    const updateTask = () => {
      if (editingTask.value) {
        editingTask.value.text = newTaskText.value.trim();
        editingTask.value.priority = newTaskPriority.value;
        editingTask.value.dueDate = newTaskDueDate.value;
        cancelEdit(); // Bearbeitungsmodus beenden
        saveTasks();
      }
    };

    // Aufgabenstatus umschalten
    const toggleCompletion = (id: number) => {
      const task = tasks.value.find(t => t.id === id);
      if (task) {
        task.completed = !task.completed;
        saveTasks();
      }
    };

    // Aufgabe entfernen
    const removeTask = (id: number) => {
      tasks.value = tasks.value.filter(task => task.id !== id);
      saveTasks();
    };

    // Computer-Eigenschaften
    const filteredTasks = computed(() => {
      switch (currentFilter.value) {
        case 'active':
          return tasks.value.filter(task => !task.completed);
        case 'completed':
          return tasks.value.filter(task => task.completed);
        default:
          return tasks.value;
      }
    });

    const remainingTasksCount = computed(() => {
      return tasks.value.filter(task => !task.completed).length;
    });

    // Hilfsfunktionen
    const formatDate = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE');
    };

    const getPriorityText = (priority: 'low' | 'medium' | 'high') => {
      switch (priority) {
        case 'high': return 'Hoch';
        case 'medium': return 'Mittel';
        case 'low': return 'Niedrig';
      }
    };

    // Beim Laden der Komponente Aufgaben laden
    onMounted(() => {
      loadTasks();
    });

    return {
      tasks,
      newTaskText,
      newTaskPriority,
      newTaskDueDate,
      currentFilter,
      filteredTasks,
      remainingTasksCount,
      editingTask,
      addTask,
      startEdit,
      cancelEdit,
      updateTask,
      toggleCompletion,
      removeTask,
      formatDate,
      getPriorityText
    };
  },
});
</script>

<style scoped>
.todo-app {
  max-width: 650px;
  margin: 0 auto;
  min-width: 320px;
  padding: 24px;
}

.task-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.task-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.task-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.badge-low {
  background-color: var(--primary);
  color: #111827;
}
.badge-medium {
  background-color: var(--warn);
  color: #1f1300;
}
.badge-high {
  background-color: var(--danger);
  color: white;
}

.btn.active {
  border-color: var(--primary);
  color: var(--primary);
}
</style>