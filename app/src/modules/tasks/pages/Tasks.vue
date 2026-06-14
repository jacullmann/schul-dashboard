<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWindowSize } from '@vueuse/core';
import { Plus, ListFilter } from '@lucide/vue';

import { useTasks } from '@/modules/tasks/composables/useTasks';
import { useTaskForm } from '@/core/composables/useTaskForm';
import { useImageViewer } from '@/core/composables/useImageViewer';

import InfoModal from '@/common/components/InfoModal.vue';
import TaskSkeleton from '@/modules/tasks/components/TaskSkeleton.vue';
import TaskCard from '@/modules/tasks/components/TaskCard.vue';
import ImageContextMenu from '@/modules/tasks/components/ImageContextMenu.vue';
import ReportModal from '@/modules/tasks/components/ReportModal.vue';
import TaskInfoModal from '@/modules/tasks/components/TaskInfoModal.vue';
import NotificationDot from '@/common/components/NotificationDot.vue';

import type { HwItem } from '@/modules/tasks/composables/useTasks';

const showInfoItem = ref<HwItem | null>(null);
const showFilterModal = ref(false);

const i18n = useI18n();
const t = i18n.t.bind(i18n);
const tm = i18n.tm.bind(i18n);
const { width: windowWidth } = useWindowSize();

const tabItems = computed(() => [
  { id: 'all', label: t('tasks.list.tabs.all') },
  { id: 'homework', label: t('tasks.list.tabs.homework') },
  { id: 'dalton', label: t('tasks.list.tabs.dalton') },
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

const isMobile = computed(() => windowWidth.value < 768);
const hasActiveFilters = computed(
  () => subjectFilter.value !== '' || showOldEntries.value || hideChecked.value,
);

const { openTaskForm } = useTaskForm();
const { openImageViewer } = useImageViewer();

const animationStartTime = ref(Date.now());
const elapsedLoadTime = ref(0);

watch(loading, (newVal) => {
  if (newVal) {
    animationStartTime.value = Date.now();
  } else {
    elapsedLoadTime.value = (Date.now() - animationStartTime.value) / 1000;
  }
});

onMounted(() => {
  if (!loading.value) {
    elapsedLoadTime.value = (Date.now() - animationStartTime.value) / 1000;
  }
});

function openImageViewerForItem(item: HwItem, index: number) {
  openImageViewerLocal(item, index);
  openImageViewer(item.images, index);
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

const animatedCardIds = ref(new Set<string>());
const rawVisibleIds = computed(() => visibleItems.value.map((item) => item.id));

watch(
  rawVisibleIds,
  (newIds, oldIds) => {
    const oldSet = new Set(oldIds || []);
    for (const id of newIds) {
      if (!oldSet.has(id)) {
        animatedCardIds.value.add(id);
      }
    }
    animatedCardIds.value = new Set(animatedCardIds.value);
  },
  { immediate: true, deep: true },
);

function handleAnimationEnd(itemId: string) {
  animatedCardIds.value.delete(itemId);
  animatedCardIds.value = new Set(animatedCardIds.value);
}
</script>

<template>
  <div class="card">
    <div
      class="animate-fade-up"
      style="animation-delay: 0s; animation-fill-mode: both"
    >
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
              <h3 v-html="section.title"></h3>
              <p v-html="section.text"></p>
            </template>
          </InfoModal>
        </template>

        <template #action>
          <BaseTooltip content="New Task" placement="bottom">
            <BaseButton
              variant="action"
              :aria-label="t('tasks.list.task_form.new_task')"
              :icon="Plus"
              icon-classes="size-6"
              @click="openTaskForm()"
            />
          </BaseTooltip>
        </template>
      </PageHeader>
    </div>

    <div class="flex max-md:flex-col gap-y-4 gap-x-2 md:justify-between">
      <div
        class="animate-fade-up"
        style="animation-delay: 0.05s; animation-fill-mode: both"
      >
        <BaseTabs
          :items="tabItems"
          :active-id="tab"
          @change="(id) => goTab(id as any)"
        />
      </div>

      <div
        class="animate-fade-up"
        style="animation-delay: 0.1s; animation-fill-mode: both"
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

    <div class="flex flex-col gap-3 mt-8 max-w-192 mx-auto">
      <TaskSkeleton v-if="loading && initialLoad" :count="5" :image-count="2" />

      <TransitionGroup
        v-else
        name="task-list"
        tag="div"
        class="flex flex-col gap-3 relative"
        @before-leave="beforeLeave"
      >
        <TaskCard
          v-for="(item, index) in visibleItems"
          :key="item.id"
          v-model:note-edit-content="noteEditContent"
          :class="{ 'animate-fade-up': animatedCardIds.has(item.id) }"
          :style="
            animatedCardIds.has(item.id)
              ? {
                  animationDelay: `${(index + 3) * 0.05 - elapsedLoadTime}s`,
                  animationFillMode: 'both',
                }
              : undefined
          "
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
          :elapsed-load-time="elapsedLoadTime"
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
          @animationend="handleAnimationEnd(item.id)"
        />
      </TransitionGroup>

      <BaseEmptyState
        v-if="!loading && !limitedItems.length"
        class="animate-fade-up"
        :style="{
          animationDelay: `${3 * 0.05 - elapsedLoadTime}s`,
          animationFillMode: 'both',
        }"
        :primary-action="openTaskForm"
        :secondary-action="resetFilters"
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
        class="mt-1 flex justify-center gap-3"
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
  transition:
    transform 0.5s cubic-bezier(0.25, 1, 0.5, 1),
    opacity 0.4s ease;
  animation: none !important;
}

.task-list-move {
  transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
}

.task-list-leave-to {
  opacity: 0;
  transform: translateX(100px);
}
</style>
