<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWindowSize } from '@vueuse/core';
import { Plus } from '@lucide/vue';

import { useTasks } from '@/modules/tasks/composables/useTasks';
import { useItemForm } from '@/core/composables/useItemForm';
import { useImageViewer } from '@/core/composables/useImageViewer';

import InfoModal from '@/common/components/InfoModal.vue';
import ItemSkeleton from '@/modules/tasks/components/ItemSkeleton.vue';
import TaskCard from '@/modules/tasks/components/TaskCard.vue';
import ImageContextMenu from '@/modules/tasks/components/ImageContextMenu.vue';
import ReportModal from '@/modules/tasks/components/ReportModal.vue';
import ItemInfoModal from '@/modules/tasks/components/ItemInfoModal.vue';
import ArchiveSwitch from '@/modules/tasks/components/ArchiveSwitch.vue';

import type { HwItem } from '@/modules/tasks/composables/useTasks';

const showInfoItem = ref<HwItem | null>(null);

const { t, tm } = useI18n();
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

const { openItemForm } = useItemForm();
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
            <h3>{{ t('tasks.list.infopop.description') }}</h3>
            <template
              v-for="(section, index) in tm('tasks.list.infopop.sections')"
              :key="index"
            >
              <h3 v-html="section.title"></h3>
              <p v-html="section.text"></p>
            </template>
          </InfoModal>
        </template>
      </PageHeader>
    </div>

    <div
      class="animate-fade-up"
      style="animation-delay: 0.05s; animation-fill-mode: both"
    >
      <BaseTabs
        :items="tabItems"
        :active-id="tab"
        class="mb-4"
        @change="(id) => goTab(id as any)"
      />
    </div>

    <div
      class="animate-fade-up"
      style="animation-delay: 0.1s; animation-fill-mode: both"
    >
      <BaseRow>
        <BaseSelect
          v-model="subjectFilter"
          :options="subjectOptions"
          :form="false"
          class="max-w-36"
        />

        <ArchiveSwitch v-model="showOldEntries" />

        <BaseTooltip content="New Entry" placement="bottom">
          <BaseButton
            variant="action"
            :aria-label="t('tasks.list.item_form.new_entry')"
            @click="openItemForm()"
            :icon="Plus"
            icon-classes="size-6"
          />
        </BaseTooltip>
      </BaseRow>
    </div>

    <div class="flex flex-col gap-3 mt-4">
      <ItemSkeleton v-if="loading && initialLoad" :count="5" :image-count="2" />

      <template v-else>
        <TaskCard
          v-for="(item, index) in visibleItems"
          :key="item.id"
          class="animate-fade-up"
          :style="{
            animationDelay: `${(index + 3) * 0.05 - elapsedLoadTime}s`,
            animationFillMode: 'both',
          }"
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
          v-model:note-edit-content="noteEditContent"
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
        />
      </template>

      <BaseEmptyState
        v-if="!loading && !limitedItems.length"
        class="animate-fade-up"
        :style="{
          animationDelay: `${3 * 0.05 - elapsedLoadTime}s`,
          animationFillMode: 'both',
        }"
        :primary-action="openItemForm"
        :secondary-action="resetFilters"
      >
        <template #title>{{ t('tasks.list.items.view.no_entries') }}</template>
        <template #message>{{
          filteredItems.length
            ? t('tasks.list.items.view.no_entries_in_view_message')
            : t('tasks.list.items.view.no_entries_message')
        }}</template>
        <template #primary-action-label>{{
          t('tasks.list.create_entry')
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
          @click="showMore"
          variant="ghost"
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
      :open="showReportConfirm"
      message=""
      :show-reason-input="true"
      v-model:reason="reportReason"
      @confirm="doReport"
      @cancel="cancelReport"
    />

    <ItemInfoModal
      :open="!!showInfoItem"
      :item="showInfoItem"
      :is-mod-or-admin="
        user?.role === 'superadmin' ||
        user?.tenantRole === 'admin' ||
        user?.tenantRole === 'moderator'
      "
      :is-super-admin="user?.role === 'superadmin'"
      @cancel="showInfoItem = null"
    />
  </div>
</template>
