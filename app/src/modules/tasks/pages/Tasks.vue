<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWindowSize } from '@vueuse/core';
import { useIsMobileViewport } from '@/common/composables/useViewport';
import { Plus, ListFilter } from '@lucide/vue';

import { useTasks } from '@/modules/tasks/composables/useTasks';
import { useTaskForm } from '@/core/composables/useTaskForm';
import { useImageViewer } from '@/core/composables/useImageViewer';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

import InfoModal from '@/common/components/InfoModal.vue';
import TaskSkeleton from '@/modules/tasks/components/TaskSkeleton.vue';
import TaskCard from '@/modules/tasks/components/TaskCard.vue';
import ImageContextMenu from '@/modules/tasks/components/ImageContextMenu.vue';
import ReportModal from '@/modules/tasks/components/ReportModal.vue';
import TaskInfoModal from '@/modules/tasks/components/TaskInfoModal.vue';
import NotificationDot from '@/common/components/NotificationDot.vue';
import PersonalizedViewNotice from '@/common/components/PersonalizedViewNotice.vue';

import type { HwItem } from '@/modules/tasks/composables/useTasks';
import {
  entranceDelay,
  hasSettledEntrance,
} from '@/modules/tasks/utils/entrance';

const showInfoItem = ref<HwItem | null>(null);
const showFilterModal = ref(false);

const i18n = useI18n();
const t = i18n.t.bind(i18n);
const tm = i18n.tm.bind(i18n);
const { width: windowWidth } = useWindowSize();

const { activeGroupDaltonEnabled } = useAppAuth();

const tabItems = computed(() => [
  { id: 'all', label: t('tasks.list.tabs.all') },
  { id: 'homework', label: t('tasks.list.tabs.homework') },
  ...(activeGroupDaltonEnabled.value
    ? [{ id: 'dalton', label: t('tasks.list.tabs.dalton') }]
    : []),
  { id: 'exam', label: t('tasks.list.tabs.exams') },
]);

async function handleSwipe(item: HwItem) {
  await archiveItem(item);
}

const visibleItems = computed(() => {
  return limitedItems.value.filter((item: HwItem) => {
    // Hide item quickly if dismissed this session
    if (dismissedItems.value.has(item.id)) return false;

    return true;
  });
});

const imagesPerRow = computed(() => {
  if (windowWidth.value < 500) return 2;
  if (windowWidth.value < 800) return 3;
  return 4;
});

const {
  user,
  loading,
  initialLoad,
  subjectFilter,
  showPersonalized,
  hiddenByCourses,
  showOldEntries,
  hideChecked,
  visibleCount,
  limitedItems,
  filteredItems,
  showReportConfirm,
  reportReason,
  tab,
  openMenuId,
  isExpanded,
  toggleDescription,
  showMore,
  showLess,
  onMenuAction,
  archiveItem,
  dismissedItems,
  useListTransitions,
  canEdit,
  canDelete,
  canDeleteImage,
  canEditNote,
  editingNoteForId,
  noteEditContent,
  savingNote,
  startEditNote,
  cancelEditNote,
  saveNote,
  deleteNote,
  goTab,
  isChecked,
  toggleCheck,
  isPinned,
  togglePin,
  makeThumb,
  isRevealed,
  revealImages,
  doReport,
  cancelReport,
  imageMenu,
  closeImageMenu,
  triggerImageUpload,
  triggerImageDrop,
  triggerImageDelete,
  openImageViewer: openImageViewerLocal,
  highlightedItemId,
  handleImageContextMenu,
  subjectOptions,
  getSubjectName,
  getTypeLabel,
  resetFilters,
} = useTasks();

const isMobile = useIsMobileViewport();
const hasActiveFilters = computed(
  () => subjectFilter.value !== '' || showOldEntries.value || hideChecked.value,
);

const showPersonalizedNotice = computed(
  () =>
    showPersonalized.value && hiddenByCourses.value > 0 && !initialLoad.value,
);

const { openTaskForm } = useTaskForm();
const { openImageViewer } = useImageViewer();

// The Dalton tab disappears with the setting, also for a link that opened it.
watch(
  [activeGroupDaltonEnabled, tab],
  ([daltonEnabled, activeTab]) => {
    if (!daltonEnabled && activeTab === 'dalton') goTab('all');
  },
  { immediate: true },
);

const showSkeleton = computed(() => loading.value && initialLoad.value);

/** The header, then the tabs and filter beside them, then the list. */
const TABS_ENTRANCE_ORDER = 1;
const FILTER_ENTRANCE_ORDER = 2;
const LIST_ENTRANCE_ORDER = 3;
/** Counted from the loaded cards: after the first page of five. */
const PAGING_ENTRANCE_ORDER = 5;

// The viewer grows out of the tile it was opened from and shrinks back into
// it, so it has to find that tile again, also after paging to another image.
function imageOriginForItem(item: HwItem) {
  return (index: number) =>
    document.querySelector<HTMLElement>(
      `[data-task-images="${CSS.escape(item.id)}"] [data-image-index="${index}"]`,
    );
}

// The viewer carries no context of its own, so it is handed the same menu the
// tiles open on a right click, bound to the image it is showing.
function imageMenuForItem(item: HwItem) {
  return (event: MouseEvent, index: number) => {
    const img = item.images[index];
    if (img) handleImageContextMenu(event, item, img);
  };
}

function openImageViewerForItem(item: HwItem, index: number) {
  openImageViewerLocal(item, index);
  openImageViewer(
    item.images,
    index,
    imageOriginForItem(item),
    imageMenuForItem(item),
  );
}

function beforeLeave(el: Element) {
  const h = el as HTMLElement;
  const rect = h.getBoundingClientRect();
  const parent = h.offsetParent as HTMLElement | null;
  const parentRect = parent?.getBoundingClientRect();

  if (parentRect) {
    h.style.left = `${rect.left - parentRect.left}px`;
    h.style.top = `${rect.top - parentRect.top}px`;
  } else {
    h.style.left = `${h.offsetLeft}px`;
    h.style.top = `${h.offsetTop}px`;
  }
  h.style.width = `${rect.width}px`;
  h.style.position = 'absolute';
}

/*
 * Cards that just appeared, by their place in the batch they arrived with, so
 * each batch cascades in from its first card. A card leaves the map once
 * settled: TransitionGroup moves re-insert nodes, which restarts animations.
 */
const enteringCardOrder = ref(new Map<string, number>());
const visibleIds = computed(() => visibleItems.value.map((item) => item.id));
let shownIds = new Set<string>();

// Behind the skeleton the list still sorts itself as checks and pins load, so
// the order is only taken once the cards are actually shown.
watch(
  [visibleIds, showSkeleton],
  ([ids, skeleton]) => {
    if (skeleton) return;
    const entering = new Map(enteringCardOrder.value);
    let order = 0;
    for (const id of ids) {
      if (!shownIds.has(id)) entering.set(id, order++);
    }
    shownIds = new Set(ids);
    enteringCardOrder.value = entering;
  },
  { immediate: true },
);

function cardEntranceStyle(itemId: string) {
  const order = enteringCardOrder.value.get(itemId);
  return order === undefined ? {} : { '--enter-delay': entranceDelay(order) };
}

function handleCardAnimationEnd(event: AnimationEvent, itemId: string) {
  if (!hasSettledEntrance(event)) return;
  const entering = new Map(enteringCardOrder.value);
  entering.delete(itemId);
  enteringCardOrder.value = entering;
}

const emptyStateEntered = ref(false);

function handleEmptyStateAnimationEnd(event: AnimationEvent) {
  if (hasSettledEntrance(event)) emptyStateEntered.value = true;
}
</script>

<template>
  <div class="card">
    <div class="animate-enter">
      <PageHeader>
        {{ t('tasks.list.title') }}
        <template #info>
          <InfoModal
            :tooltip="t('tasks.list.infopop.tooltip')"
            :title="t('tasks.list.title')"
          >
            <p>{{ t('tasks.list.infopop.description') }}</p>
            <template
              v-for="(section, index) in tm('tasks.list.infopop.sections')"
              :key="index"
            >
              <!-- eslint-disable-next-line vue/no-v-html -- bundled translation markup, not user input -->
              <h3 v-html="section.title"></h3>
              <!-- eslint-disable-next-line vue/no-v-html -- bundled translation markup, not user input -->
              <p v-html="section.text"></p>
            </template>
          </InfoModal>
        </template>

        <template #action>
          <BaseRow class="flex-nowrap!">
            <!-- Below md the filter row under the tabs would cost a whole line
                 for one button, so the button joins the header actions instead.
                 There is no room for its label there, and a tooltip never opens
                 on a touch device, so the active state has to read from the
                 button itself: it stays filled while a filter is on. -->
            <BaseTooltip
              :content="t('tasks.list.filter')"
              placement="bottom"
              class="md:hidden"
            >
              <BaseButton
                variant="ghost"
                :class="
                  hasActiveFilters ? 'bg-ghost-hover! text-on-ghost!' : ''
                "
                :aria-label="
                  hasActiveFilters
                    ? t('tasks.list.filter_active')
                    : t('tasks.list.filter')
                "
                :icon="ListFilter"
                @click="showFilterModal = true"
              />
            </BaseTooltip>

            <BaseTooltip :content="t('common.sidebar.task')" placement="bottom">
              <BaseButton
                variant="action"
                :aria-label="t('tasks.list.task_form.new_task')"
                :icon="Plus"
                icon-classes="size-6"
                @click="openTaskForm()"
              />
            </BaseTooltip>
          </BaseRow>
        </template>
      </PageHeader>
    </div>

    <div class="flex gap-x-2 md:justify-between">
      <div
        class="animate-enter min-w-0 grow"
        :style="{ '--enter-delay': entranceDelay(TABS_ENTRANCE_ORDER) }"
      >
        <BaseTabs
          :items="tabItems"
          :active-id="tab"
          @change="(id) => goTab(id as any)"
        />
      </div>

      <div
        class="animate-enter max-md:hidden"
        :style="{ '--enter-delay': entranceDelay(FILTER_ENTRANCE_ORDER) }"
      >
        <BaseRow>
          <BaseButton
            variant="ghost"
            :icon="ListFilter"
            @click="showFilterModal = true"
          >
            {{ t('tasks.list.filter') }}
            <NotificationDot v-if="hasActiveFilters" :size="1.5" class="ml-1" />
          </BaseButton>
        </BaseRow>
      </div>
    </div>

    <div
      class="relative flex flex-col gap-3 max-w-192 mx-auto"
      :class="showPersonalizedNotice ? 'mt-4' : 'mt-8'"
    >
      <PersonalizedViewNotice
        v-if="showPersonalizedNotice"
        class="animate-enter"
      />

      <!-- Taken out of the flow while it fades, so the cards arriving in its
           place overlap it instead of waiting below it. -->
      <Transition
        leave-active-class="skeleton-leaving absolute inset-x-0 top-0 transition-opacity duration-300 ease-out"
        leave-to-class="opacity-0"
      >
        <TaskSkeleton
          v-if="showSkeleton"
          :count="5"
          :image-count="2"
          :entrance-order="LIST_ENTRANCE_ORDER"
        />
      </Transition>

      <TransitionGroup
        v-if="!showSkeleton"
        :css="useListTransitions"
        name="task-list"
        tag="div"
        class="flex flex-col gap-3 relative overflow-x-clip"
        @before-leave="beforeLeave"
      >
        <TaskCard
          v-for="(item, index) in visibleItems"
          :key="item.id"
          v-model:note-edit-content="noteEditContent"
          :class="{ 'animate-enter': enteringCardOrder.has(item.id) }"
          :style="cardEntranceStyle(item.id)"
          :item="item"
          :index="index"
          :user="user"
          :tab="tab"
          :is-checked="isChecked(item.id)"
          :is-pinned="isPinned(item.id)"
          :is-expanded="isExpanded(item.id)"
          :is-revealed="isRevealed(item.id)"
          :images-per-row="imagesPerRow"
          :is-mobile="isMobile"
          :highlighted="highlightedItemId === item.id"
          :show-old-entries="showOldEntries"
          :is-open-menu="openMenuId === item.id"
          :editing-note-for-id="editingNoteForId"
          :saving-note="savingNote"
          :can-edit-note="canEditNote()"
          :can-edit="canEdit"
          :can-delete="canDelete"
          :can-delete-image="canDeleteImage"
          :make-thumb="makeThumb"
          :get-subject-name="getSubjectName"
          :get-type-label="getTypeLabel"
          @toggle-check="toggleCheck(item)"
          @toggle-pin="togglePin(item)"
          @toggle-description="toggleDescription(item.id)"
          @reveal-images="revealImages(item.id)"
          @swipe="handleSwipe(item)"
          @menu-action="(action) => onMenuAction(action, item)"
          @open-menu="openMenuId = item.id"
          @close-menu="openMenuId = null"
          @show-info="showInfoItem = item"
          @image-drop="(files) => triggerImageDrop(item, files)"
          @open-image-viewer="openImageViewerForItem(item, $event)"
          @image-context-menu="
            (event, img) => handleImageContextMenu(event, item, img)
          "
          @edit-note-start="startEditNote(item)"
          @edit-note-cancel="cancelEditNote()"
          @edit-note-save="saveNote(item.id)"
          @edit-note-delete="deleteNote(item.id)"
          @animationend="handleCardAnimationEnd($event, item.id)"
        />
      </TransitionGroup>

      <BaseEmptyState
        v-if="!loading && !limitedItems.length"
        :class="{ 'animate-enter': !emptyStateEntered }"
        :primary-action="openTaskForm"
        :secondary-action="resetFilters"
        @animationend="handleEmptyStateAnimationEnd"
      >
        <template #title>{{ t('tasks.list.tasks.view.no_tasks') }}</template>
        <template #message>{{
          filteredItems.length
            ? t('tasks.list.tasks.view.no_tasks_in_view_message')
            : t('tasks.list.tasks.view.no_tasks_message')
        }}</template>
        <template #primary-action-label>{{
          t('tasks.list.create_task')
        }}</template>
        <template #secondary-action-label>{{
          t('tasks.list.reset_filters')
        }}</template>
      </BaseEmptyState>

      <div
        v-if="filteredItems.length > 5"
        class="mt-1 flex justify-center gap-3 animate-enter"
        :style="{ '--enter-delay': entranceDelay(PAGING_ENTRANCE_ORDER) }"
      >
        <BaseButton
          v-if="visibleCount < filteredItems.length"
          variant="ghost"
          @click="showMore"
          >{{ t('common.buttons.show_more') }}</BaseButton
        >
        <BaseButton v-if="visibleCount > 5" variant="ghost" @click="showLess">{{
          t('common.buttons.show_less')
        }}</BaseButton>
      </div>
    </div>

    <ImageContextMenu
      :visible="imageMenu.visible"
      :x="imageMenu.x"
      :y="imageMenu.y"
      :can-delete="
        imageMenu.image && imageMenu.item
          ? canDeleteImage(imageMenu.item.createdBy, imageMenu.image.createdBy)
          : false
      "
      @upload="triggerImageUpload"
      @delete="triggerImageDelete"
      @cancel="closeImageMenu"
    />

    <ReportModal
      v-model:reason="reportReason"
      :open="showReportConfirm"
      message=""
      :show-reason-input="true"
      @confirm="doReport"
      @cancel="cancelReport"
    />

    <TaskInfoModal
      :open="!!showInfoItem"
      :item="showInfoItem"
      :is-super-admin="user?.role === 'superadmin'"
      @cancel="showInfoItem = null"
    />

    <BaseModal
      :open="showFilterModal"
      :sheet="true"
      @cancel="showFilterModal = false"
    >
      <template #title>
        {{ t('tasks.list.filter') }}
      </template>

      <template #content>
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between h-12">
            <span class="text-sm font-medium text-on-ghost">
              {{ t('tasks.list.task_form.subject') }}
            </span>
            <BaseSelect
              v-model="subjectFilter"
              :options="subjectOptions"
              :form="false"
            />
          </div>

          <div class="flex items-center justify-between h-12">
            <span class="text-sm font-medium text-on-ghost">
              {{ t('tasks.list.archive.archive') }}
            </span>
            <BaseToggle v-model="showOldEntries" />
          </div>

          <div class="flex items-center justify-between h-12">
            <span class="text-sm font-medium text-on-ghost">
              {{ t('tasks.list.hide_checked') }}
            </span>
            <BaseToggle v-model="hideChecked" />
          </div>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.task-list-leave-active {
  transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
  animation: none !important;
}

.task-list-move {
  transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
}

/* Delay the moving animation only when an item is leaving */
.relative:has(.task-list-leave-active) .task-list-move {
  transition-delay: 0.2s;
}

.task-list-leave-to {
  transform: translateX(-110%);
}
</style>
