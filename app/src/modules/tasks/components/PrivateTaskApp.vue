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
import {
  useDragReorder,
  REORDER_ITEM_ATTR,
} from '@/modules/tasks/composables/useDragReorder';
import ItemCard from '@/modules/tasks/components/ItemCard.vue';
import { usePrivateTaskForm } from '@/core/composables/usePrivateTaskForm';
import { computed, reactive, ref, onUnmounted, watch } from 'vue';
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

function moveTask(from: number, to: number) {
  const order = [...displayPrivateTasks.value];
  const [moved] = order.splice(from, 1);
  if (!moved) return;
  order.splice(to, 0, moved);

  const realPosition = (item: { id: string } | undefined) =>
    item
      ? privateTasks.value.find((t) => t.id === item.id)?.position || null
      : null;

  void reorderPrivateTask(
    moved.id,
    realPosition(order[to - 1]),
    realPosition(order[to + 1]),
  );
}

const listRef = ref<HTMLElement | null>(null);

const reorder = useDragReorder(listRef, {
  onMove: moveTask,
  ignore:
    ".item-menu-trigger, input, textarea, button, a, .checkbox, [role='button'], [role='menu']",
});

/**
 * Cards whose entrance has already played. Reordering moves the card's node,
 * and a node put back into the document starts its animations over.
 */
const enteredIds = reactive(new Set<string>());

function onCardAnimationEnd(event: AnimationEvent, id: string) {
  if (event.animationName === 'fade-up') enteredIds.add(id);
}

defineExpose({ loadPrivateTasks, addPrivateTask, updatePrivateTask });
</script>

<template>
  <div class="private-task-app-integrated">
    <div class="private-task-header animate-fade-up">
      <div
        class="flex gap-2 items-center justify-center text-on-ghost-muted mb-4"
      >
        <Lock :size="20" />
        <span class="font-medium text-base">
          {{ t('tasks.private_tasks.only_visible_to_you') }}
        </span>
      </div>
      <div v-if="!user" class="p-8 text-center">
        <p>{{ t('tasks.private_tasks.requires_account') }}</p>
      </div>
    </div>

    <div v-if="user" class="private-task-list">
      <div v-if="loading" class="flex flex-col gap-8 pt-4">
        <div v-for="n in 10" :key="n" class="animate-fade-up">
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
        <p>{{ t('tasks.private_tasks.no_tasks_found') }}</p>
      </div>

      <div v-else class="private-tasks-container">
        <div ref="listRef" class="flex flex-col gap-3 max-w-192 mx-auto">
          <div
            v-for="(privateTask, index) in displayPrivateTasks"
            :key="privateTask.id"
            v-bind="{ [REORDER_ITEM_ATTR]: '' }"
            class="reorder-item long-press-target relative rounded-xl"
            @animationend="onCardAnimationEnd($event, privateTask.id)"
          >
            <ItemCard
              :class="{ 'animate-fade-up': !enteredIds.has(privateTask.id) }"
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
                    :ref="
                      (el: any) => {
                        if (el && openMenuId === privateTask.id)
                          menuRef = el.menuEl;
                      }
                    "
                    :open="openMenuId === privateTask.id"
                    :class="!isMobile ? 'fixed! z-[10000]! min-w-[180px]' : ''"
                    :style="!isMobile ? itemMenuStyles : undefined"
                    @close="openMenuId = null"
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
                        reorder.move(index, index - 1);
                        openMenuId = null;
                      "
                    >
                      {{ t('tasks.private_tasks.menu.up') }}
                    </BaseMenuButton>

                    <BaseMenuButton
                      v-if="index < displayPrivateTasks.length - 1"
                      :icon="ChevronDown"
                      @click="
                        reorder.move(index, index + 1);
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

              <template v-if="privateTask.description" #body>
                <span>{{ privateTask.description }}</span>
              </template>
            </ItemCard>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
