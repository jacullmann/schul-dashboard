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
import { computed, ref, onUnmounted, watch } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue';
import BaseSkeleton from '@/common/components/BaseSkeleton.vue';

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

const { width: windowWidth } = useWindowSize();
const isMobile = computed(() => windowWidth.value < 768);

const menuCoords = ref<{ x: number; y: number } | null>(null);
const menuRef = ref<HTMLElement | null>(null);

const menuVirtualElement = computed(() => {
  if (!menuCoords.value) return null;
  const { x, y } = menuCoords.value;
  return {
    getBoundingClientRect() {
      return {
        width: 0,
        height: 0,
        x,
        y,
        top: y,
        left: x,
        right: x,
        bottom: y,
      };
    },
  };
});

const { floatingStyles, isPositioned } = useFloating(
  menuVirtualElement,
  menuRef,
  {
    strategy: 'fixed',
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    transform: false,
    middleware: [
      offset(4),
      flip({
        fallbackPlacements: ['bottom-end', 'top-start', 'top-end'],
      }),
      shift({ padding: 8 }),
    ],
  },
);

const itemMenuStyles = computed(() => ({
  ...floatingStyles.value,
  opacity: isPositioned.value ? undefined : 0,
}));

function handleCardMenuClick(privateTask: PrivateTask, event: MouseEvent) {
  if (openMenuId.value === privateTask.id) {
    openMenuId.value = null;
    menuCoords.value = null;
  } else {
    menuCoords.value = { x: event.clientX, y: event.clientY };
    openMenuId.value = privateTask.id;
  }
}

function handleCardContextMenu(privateTask: PrivateTask, event: MouseEvent) {
  menuCoords.value = { x: event.clientX, y: event.clientY };
  openMenuId.value = privateTask.id;
}

watch(openMenuId, (newVal) => {
  if (newVal === null) {
    menuCoords.value = null;
    menuRef.value = null;
  }
});

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
    <div class="private-task-header animate-fade-up">
      <div class="flex gap-2 items-center text-on-ghost mb-4">
        <Lock class="text-on-ghost" :size="24" />
        <h2 class="m-0 text-2xl/6">
          {{ t('tasks.private_tasks.only_visible_to_you') }}
        </h2>
        <InfoModal
          :tooltip="t('tasks.private_tasks.infopop.tooltip')"
          :title="t('tasks.private_tasks.only_visible_to_you')"
        >
          <p v-html="t('tasks.private_tasks.infopop.text')"></p>
        </InfoModal>
      </div>
      <div v-if="!user" class="p-8 text-center">
        <p>{{ t('tasks.private_tasks.requires_account') }}</p>
      </div>
    </div>

    <div v-if="user" class="private-task-list">
      <div v-if="loading" class="flex flex-col gap-8 pt-4">
        <div
          v-for="n in 10"
          class="animate-fade-up"
          :style="{
            animationDelay: `${(n + 2) * 0.05}s`,
            animationFillMode: 'both',
          }"
        >
          <BaseSkeleton width="60" height="20px" class="mb-3" />
          <BaseSkeleton width="full" height="16px" class="mb-2" />
          <BaseSkeleton
            width="[70%]"
            height="16px"
            class="hidden md:flex mb-2"
          />
        </div>
      </div>

      <div
        v-else-if="privateTasks.length === 0"
        class="p-12 text-center text-on-ghost-muted"
      >
        <p>{{ t('tasks.private_tasks.no_entries_found') }}</p>
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
          ghost-class="ghost-drag"
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
            class="animate-fade-up"
            :style="{
              animationDelay: `${(index + 3) * 0.05}s`,
              animationFillMode: 'both',
            }"
            :is-collapsed="privateTask.completed"
            :title="privateTask.title"
            @dblclick="user ? togglePrivateTaskCompletion(privateTask) : null"
            @contextmenu.prevent.stop="
              handleCardContextMenu(privateTask, $event)
            "
            @menu-click="handleCardMenuClick(privateTask, $event)"
          >
            <template #checkbox>
              <BaseCheckbox
                :checked="privateTask.completed"
                @change="togglePrivateTaskCompletion(privateTask)"
              />
            </template>

            <template #menu>
              <Teleport to="body" :disabled="isMobile">
                <BaseMenu
                  :open="openMenuId === privateTask.id"
                  @close="openMenuId = null"
                  :ref="
                    (el: any) => {
                      if (el && openMenuId === privateTask.id)
                        menuRef = el.menuEl;
                    }
                  "
                  :class="!isMobile ? 'fixed! z-[10000]! min-w-[180px]' : ''"
                  :style="!isMobile ? itemMenuStyles : undefined"
                  @click.stop
                >
                  <BaseMenuButton
                    :icon="Pencil"
                    @click="
                      openEditPrivateTaskForm(privateTask);
                      openMenuId = null;
                    "
                  >
                    {{ t('common.buttons.edit') }}
                  </BaseMenuButton>

                  <BaseMenuButton
                    :icon="Copy"
                    @click="
                      duplicatePrivateTask(privateTask);
                      openMenuId = null;
                    "
                  >
                    {{ t('common.buttons.duplicate') }}
                  </BaseMenuButton>

                  <BaseMenuDivider />

                  <BaseMenuButton
                    v-if="index > 0"
                    :icon="ChevronUp"
                    @click="
                      moveItemUp(index);
                      openMenuId = null;
                    "
                  >
                    {{ t('tasks.private_tasks.menu.up') }}
                  </BaseMenuButton>

                  <BaseMenuButton
                    v-if="index < displayPrivateTasks.length - 1"
                    :icon="ChevronDown"
                    @click="
                      moveItemDown(index);
                      openMenuId = null;
                    "
                  >
                    {{ t('tasks.private_tasks.menu.down') }}
                  </BaseMenuButton>

                  <BaseMenuDivider
                    v-if="index > 0 || index < displayPrivateTasks.length - 1"
                  />

                  <BaseMenuButton
                    :icon="Trash2"
                    variant="danger"
                    @click="
                      deletePrivateTask(privateTask.id);
                      openMenuId = null;
                    "
                  >
                    {{ t('common.buttons.delete') }}
                  </BaseMenuButton>
                </BaseMenu>
              </Teleport>
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
