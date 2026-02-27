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
        <draggable
            :list="displayTodos"
            class="todos"
            item-key="id"
            handle=".item-card"
            @end="onDragEnd"
            :animation="200"
            easing="cubic-bezier(0.3, 0, 0.14, 1)"
            ghost-class="ghost"
            drag-class="hidden-drag"
            fallback-class="hidden-drag"
            :set-data="setDragImage"
            :delay="100"
            :delay-on-touch-only="true"
            filter=".item-menu-trigger, input, button, .checkbox, [role='button']"
            :prevent-on-filter="false"
        >
          <ItemCard
              v-for="(todo, index) in displayTodos"
              :key="todo.id"
              :is-collapsed="todo.completed"
              :title="todo.title"
              @dblclick="user ? toggleTodoCompletion(todo) : null"
              @menu-click="toggleMenu(todo.id)"
          >
            <template #checkbox>
              <Checkbox
                  :checked="todo.completed"
                  @change="toggleTodoCompletion(todo)"
              />
            </template>

            <template #menu>
              <div v-if="openMenuId === todo.id" class="menu" @click.stop>
                <button class="menu-btn" @click="$emit('edit', todo); openMenuId = null">
                  <div class="menu-btn-content"><Pencil :size="16" />{{ t('global.buttons.edit') }}</div>
                </button>

                <button class="menu-btn" @click="duplicateTodo(todo); openMenuId = null">
                  <div class="menu-btn-content"><Copy :size="16" />{{ t('global.buttons.duplicate') }}</div>
                </button>

                <div class="menu-divider"></div>

                <button class="menu-btn" v-if="index > 0" @click="moveItemUp(index); openMenuId = null">
                  <div class="menu-btn-content"><ChevronUp :size="16" />{{ t('school.private.menu.up') }}</div>
                </button>

                <button class="menu-btn" v-if="index < displayTodos.length - 1" @click="moveItemDown(index); openMenuId = null">
                  <div class="menu-btn-content"><ChevronDown :size="16" />{{ t('school.private.menu.down') }}</div>
                </button>

                <div v-if="index > 0 || index < displayTodos.length - 1" class="menu-divider"></div>

                <button class="menu-btn danger" @click="deleteTodo(todo.id); openMenuId = null">
                  <div class="menu-btn-content"><Trash2 :size="16" />{{ t('global.buttons.delete') }}</div>
                </button>
              </div>
            </template>

            <template #body v-if="todo.description">
              <span>{{ todo.description }}</span>
            </template>
          </ItemCard>
        </draggable>
      </div>
    </div>
    <div v-if="message" class="message" :class="{ error: isError }">{{ message }}</div>
  </div>
</template>

<script setup lang="ts">
import Checkbox from '@/common/components/Checkbox.vue';
import LoadingSpinner from "@/common/components/LoadingSpinner.vue";
import { Pencil, Copy, Trash2, Lock, ChevronUp, ChevronDown } from 'lucide-vue-next';
import InfoPop from '@/common/components/InfoModalCenter.vue';
import { useI18n } from 'vue-i18n';
import type { Todo } from '@/modules/tasks/types';
import { useTodoApp } from '@/modules/tasks/composables/useTodoApp';
import { VueDraggableNext as draggable } from 'vue-draggable-next';
import ItemCard from '@/modules/tasks/components/ItemCard.vue';

const { t } = useI18n();

// Definition der Events für den Parent
const emit = defineEmits<{
  (e: 'create'): void;
  (e: 'edit', todo: Todo): void;
}>();

const {
  user,
  todos,
  displayTodos,
  loading,
  message,
  isError,
  openMenuId,
  loadTodos,
  addTodo,
  updateTodo,
  toggleMenu,
  toggleTodoCompletion,
  duplicateTodo,
  deleteTodo,
  reorderTodo,
} = useTodoApp();

const emptyImage = new Image();
emptyImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function setDragImage(dataTransfer: DataTransfer) {
  if (dataTransfer && dataTransfer.setDragImage) {
    dataTransfer.setDragImage(emptyImage, 0, 0);
  }
}

function onDragEnd(event: any) {
  const { newIndex, oldIndex } = event;
  if (newIndex === oldIndex) return;

  const movedItem = displayTodos.value[newIndex];
  if (!movedItem) return;

  const prevItem = newIndex > 0 ? displayTodos.value[newIndex - 1] : null;
  const nextItem = newIndex < displayTodos.value.length - 1 ? displayTodos.value[newIndex + 1] : null;

  let prevPos = prevItem ? prevItem.position || null : null;
  let nextPos = nextItem ? nextItem.position || null : null;

  reorderTodo(movedItem.id, prevPos, nextPos);
}

function moveItemUp(index: number) {
  if (index <= 0) return;
  const item = displayTodos.value[index];
  const itemAbove = displayTodos.value[index - 1];

  if (!item || !itemAbove) return;

  const prevItem = index - 2 >= 0 ? displayTodos.value[index - 2] : null;
  let prevPos = prevItem ? prevItem.position || null : null;
  let nextPos = itemAbove.position || null;

  reorderTodo(item.id, prevPos, nextPos);
}

function moveItemDown(index: number) {
  if (index >= displayTodos.value.length - 1) return;
  const item = displayTodos.value[index];
  const itemBelow = displayTodos.value[index + 1];

  if (!item || !itemBelow) return;

  const nextItem = index + 2 < displayTodos.value.length ? displayTodos.value[index + 2] : null;
  let prevPos = itemBelow.position || null;
  let nextPos = nextItem ? nextItem.position || null : null;

  reorderTodo(item.id, prevPos, nextPos);
}

defineExpose({ loadTodos, addTodo, updateTodo });
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

.item-card.ghost {
  background: white;
  will-change: transform, filter
}

.item-card.ghost::before {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  right: 2px;
  bottom: 2px;
  z-index: -1;
  background: linear-gradient(120deg, #ffa91a 0, #ff335a 35%, #af00ff 70%, #5600ff 110%);
  filter: blur(12px);
  opacity: 0.9;
  display: block !important;
}

.lucide-chevron-up {
  overflow: visible;
  transform: translateY(0);
  transition: transform 0.1s ease;
}

.menu-btn:hover .lucide-chevron-up {
  transform: translateY(-1px);
}

.lucide-chevron-down {
  overflow: visible;
  transform: translateY(0);
  transition: transform 0.1s ease;
}

.menu-btn:hover .lucide-chevron-down {
  transform: translateY(1px);
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
</style>

<style>
.hidden-drag,
.sortable-drag,
.sortable-fallback {
  opacity: 0 !important;
}
</style>