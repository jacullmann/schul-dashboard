<script setup lang="ts">
import {
  Pencil,
  Copy,
  Trash2,
  Lock,
  ChevronUp,
  ChevronDown,
} from '@lucide/vue';
import InfoModal from '@/common/components/InfoModal.vue';
import { useI18n } from 'vue-i18n';
import type { PrivateTask } from '@/modules/tasks/types';
import { usePrivateTasks } from '@/modules/tasks/composables/usePrivateTasks';
import { VueDraggableNext as draggable } from 'vue-draggable-next';
import ItemCard from '@/modules/tasks/components/ItemCard.vue';
import { usePrivateTaskForm } from '@/core/composables/usePrivateTaskForm';
import { onUnmounted } from 'vue';

const { t } = useI18n();

const { openEditPrivateTaskForm, onFormSuccess } = usePrivateTaskForm();

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

onUnmounted(
  onFormSuccess((task: PrivateTask) => {
    const exists = privateTasks.value.some((t) => t.id === task.id);
    if (exists) {
      updatePrivateTask(task);
    } else {
      addPrivateTask(task);
    }
  }),
);

const emptyImage = new Image();
emptyImage.src =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

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
  const prevDisplay =
    newIndex > 0 ? displayPrivateTasks.value[newIndex - 1] : null;
  const nextDisplay =
    newIndex < displayPrivateTasks.value.length - 1
      ? displayPrivateTasks.value[newIndex + 1]
      : null;

  const realPosition = (item: { id: string } | null | undefined) => {
    if (!item) return null;
    const real = privateTasks.value.find((t) => t.id === item.id);
    return real?.position || null;
  };

  reorderPrivateTask(
    movedItem.id,
    realPosition(prevDisplay),
    realPosition(nextDisplay),
  );
}

function moveItemUp(index: number) {
  if (index <= 0) return;
  const item = displayPrivateTasks.value[index];
  const itemAbove = displayPrivateTasks.value[index - 1];
  if (!item || !itemAbove) return;

  // Use authoritative positions from privateTasks array, not displayPrivateTasks (may have pseudo-positions)
  const realPos = (id: string) =>
    privateTasks.value.find((t) => t.id === id)?.position || null;

  const twoAbove = index - 2 >= 0 ? displayPrivateTasks.value[index - 2] : null;
  reorderPrivateTask(
    item.id,
    twoAbove ? realPos(twoAbove.id) : null,
    realPos(itemAbove.id),
  );
}

function moveItemDown(index: number) {
  if (index >= displayPrivateTasks.value.length - 1) return;
  const item = displayPrivateTasks.value[index];
  const itemBelow = displayPrivateTasks.value[index + 1];
  if (!item || !itemBelow) return;

  // Use authoritative positions from privateTasks array, not displayPrivateTasks (may have pseudo-positions)
  const realPos = (id: string) =>
    privateTasks.value.find((t) => t.id === id)?.position || null;

  const twoBelow =
    index + 2 < displayPrivateTasks.value.length
      ? displayPrivateTasks.value[index + 2]
      : null;
  reorderPrivateTask(
    item.id,
    realPos(itemBelow.id),
    twoBelow ? realPos(twoBelow.id) : null,
  );
}

defineExpose({ loadPrivateTasks, addPrivateTask, updatePrivateTask });
</script>

<template>
  <div class="private-task-app-integrated">
    <div class="private-task-header">
      <div class="flex gap-2 items-center text-on-surface mb-4">
        <Lock style="color: var(--color-on-surface)" :size="24" />
        <h2 style="margin: 0; font-size: var(--text-h2); line-height: 24px">
          {{ t('school.private.onlyVisibleToYou') }}
        </h2>
        <InfoModal
          :tooltip="t('school.private.infopop.tooltip')"
          :title="t('school.private.onlyVisibleToYou')"
        >
          <p v-html="t('school.private.infopop.text')"></p>
        </InfoModal>
      </div>
      <div v-if="!user" class="p-8 text-center">
        <p>{{ t('school.private.requiresAccount') }}</p>
      </div>
    </div>

    <div v-if="user" class="private-task-list">
      <div v-if="loading" class="flex flex-col items-center gap-3 p-8">
        <BaseSpinner on="ghost" size="24px" />
        <div style="color: var(--color-on-surface-muted)">
          {{ t('school.private.loading') }}
        </div>
      </div>

      <div
        v-else-if="privateTasks.length === 0"
        class="p-12 text-center text-on-surface-muted"
      >
        <p>{{ t('school.private.noEntriesFound') }}</p>
      </div>

      <div v-else class="private-tasks-container">
        <draggable
          :list="displayPrivateTasks"
          class="flex flex-col gap-3"
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
              <BaseMenu
                v-if="openMenuId === privateTask.id"
                class="right-0 mt-6"
                @click.stop
              >
                <BaseMenuButton
                  @click="
                    openEditPrivateTaskForm(privateTask);
                    openMenuId = null;
                  "
                >
                  <Pencil :size="16" />
                  {{ t('global.buttons.edit') }}
                </BaseMenuButton>

                <BaseMenuButton
                  @click="
                    duplicatePrivateTask(privateTask);
                    openMenuId = null;
                  "
                >
                  <Copy :size="16" />
                  {{ t('global.buttons.duplicate') }}
                </BaseMenuButton>

                <BaseMenuDivider />

                <BaseMenuButton
                  v-if="index > 0"
                  @click="
                    moveItemUp(index);
                    openMenuId = null;
                  "
                >
                  <ChevronUp :size="16" />
                  {{ t('school.private.menu.up') }}
                </BaseMenuButton>

                <BaseMenuButton
                  v-if="index < displayPrivateTasks.length - 1"
                  @click="
                    moveItemDown(index);
                    openMenuId = null;
                  "
                >
                  <ChevronDown :size="16" />
                  {{ t('school.private.menu.down') }}
                </BaseMenuButton>

                <BaseMenuDivider
                  v-if="index > 0 || index < displayPrivateTasks.length - 1"
                />

                <BaseMenuButton
                  variant="danger"
                  @click="
                    deletePrivateTask(privateTask.id);
                    openMenuId = null;
                  "
                >
                  <Trash2 :size="16" />
                  {{ t('global.buttons.delete') }}
                </BaseMenuButton>
              </BaseMenu>
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
.private-task-filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.private-task-filters .btn.active {
  background-color: var(--color-action);
  color: var(--color-on-action);
}

.ghost .item-card {
  background: white;
  will-change: transform, filter;
}

.ghost .item-card::before {
  content: '';
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
</style>

<style>
.hidden-drag,
.sortable-drag,
.sortable-fallback {
  opacity: 0 !important;
}
</style>
