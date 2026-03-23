<script setup lang="ts">
import BaseCheckbox from '@/common/components/BaseCheckbox.vue';
import LoadingSpinner from "@/common/components/LoadingSpinner.vue";
import { Pencil, Copy, Trash2, Lock, ChevronUp, ChevronDown } from 'lucide-vue-next';
import InfoModal from '@/common/components/InfoModal.vue';
import { useI18n } from 'vue-i18n';
import type { PrivateTask } from '@/modules/tasks/types';
import { usePrivateTasks } from '@/modules/tasks/composables/usePrivateTasks';
import { VueDraggableNext as draggable } from 'vue-draggable-next';
import ItemCard from '@/modules/tasks/components/ItemCard.vue';

const { t } = useI18n();

// Definition der Events für den Parent
const emit = defineEmits<{
  (e: 'create'): void;
  (e: 'edit', privateTask: PrivateTask): void;
}>();

const {
  user,
  privateTasks,
  displayPrivateTasks,
  loading,
  openMenuId,
  loadPrivateTasks,
  addPrivateTask,
  updatePrivateTask,
  toggleMenu,
  togglePrivateTaskCompletion,
  duplicatePrivateTask,
  deletePrivateTask,
  reorderPrivateTask,
} = usePrivateTasks();

const emptyImage = new Image();
emptyImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function setDragImage(dataTransfer: DataTransfer) {
  if (dataTransfer && dataTransfer.setDragImage) {
    dataTransfer.setDragImage(emptyImage, 0, 0);
  }
}

function onDragEnd(event: { newIndex: number; oldIndex: number }) {
  const { newIndex, oldIndex } = event;
  if (newIndex === oldIndex) return;

  const movedItem = displayPrivateTasks.value[newIndex];
  if (!movedItem) return;

  // Read neighbours from displayPrivateTasks for the layout, but look up real positions
  // from the authoritative privateTasks array to avoid sending optimistic pseudo-positions.
  const prevDisplay = newIndex > 0 ? displayPrivateTasks.value[newIndex - 1] : null;
  const nextDisplay = newIndex < displayPrivateTasks.value.length - 1 ? displayPrivateTasks.value[newIndex + 1] : null;

  const realPosition = (item: { id: string } | null | undefined) => {
    if (!item) return null;
    const real = privateTasks.value.find(t => t.id === item.id);
    return real?.position || null;
  };

  reorderPrivateTask(movedItem.id, realPosition(prevDisplay), realPosition(nextDisplay));
}

function moveItemUp(index: number) {
  if (index <= 0) return;
  const item = displayPrivateTasks.value[index];
  const itemAbove = displayPrivateTasks.value[index - 1];
  if (!item || !itemAbove) return;

  // Use authoritative positions from privateTasks array, not displayPrivateTasks (may have pseudo-positions)
  const realPos = (id: string) => privateTasks.value.find(t => t.id === id)?.position || null;

  const twoAbove = index - 2 >= 0 ? displayPrivateTasks.value[index - 2] : null;
  reorderPrivateTask(item.id, twoAbove ? realPos(twoAbove.id) : null, realPos(itemAbove.id));
}

function moveItemDown(index: number) {
  if (index >= displayPrivateTasks.value.length - 1) return;
  const item = displayPrivateTasks.value[index];
  const itemBelow = displayPrivateTasks.value[index + 1];
  if (!item || !itemBelow) return;

  // Use authoritative positions from privateTasks array, not displayPrivateTasks (may have pseudo-positions)
  const realPos = (id: string) => privateTasks.value.find(t => t.id === id)?.position || null;

  const twoBelow = index + 2 < displayPrivateTasks.value.length ? displayPrivateTasks.value[index + 2] : null;
  reorderPrivateTask(item.id, realPos(itemBelow.id), twoBelow ? realPos(twoBelow.id) : null);
}

defineExpose({ loadPrivateTasks, addPrivateTask, updatePrivateTask });
</script>

<template>
  <div class="privateTask-app-integrated">
    <div class="privateTask-header">
      <div class="secure">
        <Lock style="color: var(--color-on-surface)" :size="24" />
        <h2 style="margin: 0; font-size: var(--text-h2); line-height: 24px;">{{ t('school.private.onlyVisibleToYou') }}</h2>
        <InfoModal
            :tooltip="t('school.private.infopop.tooltip')"
            :title="t('school.private.onlyVisibleToYou')"
        >
          <p v-html="t('school.private.infopop.text')"></p>
        </InfoModal>
      </div>
      <div v-if="!user" class="login-prompt">
        <p>{{ t('school.private.requiresAccount') }}</p>
      </div>
    </div>

    <div v-if="user" class="privateTask-list">
      <div v-if="loading" class="loader">
        <LoadingSpinner color="#fff" size="24px" />
        <div style="color: var(--color-on-surface-muted)">{{ t('school.private.loading') }}</div>
      </div>

      <div v-else-if="privateTasks.length === 0" class="empty-state">
        <p>{{ t('school.private.noEntriesFound') }}</p>
      </div>

      <div v-else class="privateTasks-container">
        <draggable
            :list="displayPrivateTasks"
            class="privateTasks"
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
              v-for="(privateTask, index) in displayPrivateTasks"
              :key="privateTask.id"
              :is-collapsed="privateTask.completed"
              :title="privateTask.title"
              @dblclick="user ? togglePrivateTaskCompletion(privateTask) : null"
              @menu-click="toggleMenu(privateTask.id)"
          >
            <template #checkbox>
              <BaseCheckbox
                  :checked="privateTask.completed"
                  @change="togglePrivateTaskCompletion(privateTask)"
              />
            </template>

            <template #menu>
              <div v-if="openMenuId === privateTask.id" class="menu" @click.stop>
                <button class="menu-btn" @click="$emit('edit', privateTask); openMenuId = null">
                  <span class="menu-btn-content"><Pencil :size="16" />{{ t('global.buttons.edit') }}</span>
                </button>

                <button class="menu-btn" @click="duplicatePrivateTask(privateTask); openMenuId = null">
                  <span class="menu-btn-content"><Copy :size="16" />{{ t('global.buttons.duplicate') }}</span>
                </button>

                <div class="menu-divider"></div>

                <button class="menu-btn" v-if="index > 0" @click="moveItemUp(index); openMenuId = null">
                  <span class="menu-btn-content"><ChevronUp :size="16" />{{ t('school.private.menu.up') }}</span>
                </button>

                <button class="menu-btn" v-if="index < displayPrivateTasks.length - 1" @click="moveItemDown(index); openMenuId = null">
                  <span class="menu-btn-content"><ChevronDown :size="16" />{{ t('school.private.menu.down') }}</span>
                </button>

                <div v-if="index > 0 || index < displayPrivateTasks.length - 1" class="menu-divider"></div>

                <button class="menu-btn danger" @click="deletePrivateTask(privateTask.id); openMenuId = null">
                  <span class="menu-btn-content"><Trash2 :size="16" />{{ t('global.buttons.delete') }}</span>
                </button>
              </div>
            </template>

            <template #body v-if="privateTask.description">
              <span>{{ privateTask.description }}</span>
            </template>
          </ItemCard>
        </draggable>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-prompt {
  text-align: center;
  padding: 2rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-on-surface-muted);
}

.privateTask-filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.privateTask-filters .btn.active {
  background-color: var(--color-on-surface);
  color: var(--color-surface);
}

.privateTasks {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ghost .item-card {
  background: white;
  will-change: transform, filter
}

.ghost .item-card::before {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  right: 2px;
  bottom: 2px;
  z-index: -1;
  background: var(--background-image-bismuth);
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

.secure {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-block: 0 1rem;
  color: var(--color-on-surface);
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