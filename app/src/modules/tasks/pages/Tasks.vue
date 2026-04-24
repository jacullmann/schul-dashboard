<script setup lang="ts">
import ItemCard from '@/modules/tasks/components/ItemCard.vue';
import ImageContextMenu from '@/modules/tasks/components/ImageContextMenu.vue';
import ReportModal from '@/modules/tasks/components/ReportModal.vue';
import ArchiveSwitch from '@/modules/tasks/components/ArchiveSwitch.vue';
import ItemSkeleton from '@/modules/tasks/components/ItemSkeleton.vue';
import {
  Upload,
  Pencil,
  Send,
  Flag,
  Trash2,
  Pin,
  Archive,
  ArchiveRestore,
  Info,
  Plus,
  Ellipsis,
} from '@lucide/vue';
import { useTasks } from '@/modules/tasks/composables/useTasks';
import { useItemForm } from '@/core/composables/useItemForm';
import { useImageViewer } from '@/core/composables/useImageViewer';
import InfoModal from '@/common/components/InfoModal.vue';
import ItemInfoModal from '@/modules/tasks/components/ItemInfoModal.vue';
import { useI18n } from 'vue-i18n';
import { useWindowSize } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import type { HwItem } from '@/modules/tasks/composables/useTasks';

const showInfoItem = ref<HwItem | null>(null);

const { t, tm } = useI18n();
const { width: windowWidth } = useWindowSize();

const tabItems = computed(() => [
  { id: 'all', label: t('school.tasks.tabs.all') },
  { id: 'homework', label: t('school.tasks.tabs.homework') },
  { id: 'dalton', label: t('school.tasks.tabs.dalton') },
  { id: 'exam', label: t('school.tasks.tabs.exams') },
]);

// Local-only dismissed items tracking for immediate UI removal before refresh
const dismissedItems = ref(new Set<string>());

async function handleSwipe(item: HwItem) {
  dismissedItems.value.add(item.id);
  const cutoffIso = new Date().toISOString();
  const success = await toggleVisibility(item, showOldEntries.value, cutoffIso);
  if (!success) {
    dismissedItems.value.delete(item.id);
  }
}

const visibleItems = computed(() => {
  return limitedItems.value.filter((item: HwItem) => {
    // Hide item quickly if dismissed this session
    if (dismissedItems.value.has(item.id)) return false;

    // In old entries: skip conditionally if we want custom UI hiding...?
    // Oh wait, if we are in old entries, un-archiving the item should just hide it too
    // until the page reloads (it magically becomes unarchived and potentially a "new" entry if its date qualifies).
    // So the dismissedItems.has(item.id) check works perfectly for BOTH directions!
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
  toggleMenu,
  onMenuAction,
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
  goTab,
  isChecked,
  toggleCheck,
  isPinned,
  togglePin,
  toggleVisibility,
  makeThumb,
  isRevealed,
  revealImages,
  doReport,
  cancelReport,
  showDeleteConfirm,
  confirmDelete,
  cancelDelete,
  imageMenu,
  closeImageMenu,
  triggerImageUpload,
  triggerImageDrop,
  triggerImageDelete,
  showImageDeleteConfirm,
  confirmImageDelete,
  cancelImageDelete,
  openImageViewer: openImageViewerLocal,
  shareItem,
  highlightedItemId,
  deletingImage,
  deletingEntry,
  handleImageContextMenu,
  subjectOptions,
  getSubjectName,
  getTypeLabel,
  resetFilters,
} = useTasks();

const { openItemForm } = useItemForm();
const { openImageViewer } = useImageViewer();

function openImageViewerForItem(item: HwItem, index: number) {
  openImageViewerLocal(item, index);
  openImageViewer(item.images, index);
}

watch([showOldEntries, tab, subjectFilter], () => {
  dismissedItems.value.clear();
});

function handleItemDoubleClick(item: HwItem, event: MouseEvent) {
  if (!user.value) return;
  const target = event.target as HTMLElement;
  const ignoreSelectors = [
    'button',
    'a',
    'input',
    'textarea',
    '.item-menu-trigger',
    '.editor-note-section',
    '.img-clickable',
    '.img-overlay',
    '.unpin-trigger',
    '[role=menu]',
    '.checkbox',
  ].join(', ');

  if (target.closest(ignoreSelectors)) {
    return;
  }

  toggleCheck(item);
}

async function handleArchiveFromMenu(item: HwItem) {
  openMenuId.value = null;
  dismissedItems.value.add(item.id);
  const cutoffIso = new Date().toISOString();
  const success = await toggleVisibility(item, showOldEntries.value, cutoffIso);
  if (!success) {
    dismissedItems.value.delete(item.id);
  }
}
</script>

<template>
  <div class="card">
    <PageHeader>
      {{ t('school.tasks.title') }}
      <template #info>
        <InfoModal
          :tooltip="t('school.tasks.infopop.tooltip')"
          :title="t('school.tasks.title')"
        >
          <h3>{{ t('school.tasks.infopop.description') }}</h3>
          <template
            v-for="(section, index) in tm('school.tasks.infopop.sections')"
            :key="index"
          >
            <h3 v-html="section.title"></h3>
            <p v-html="section.text"></p>
          </template>
        </InfoModal>
      </template>
    </PageHeader>

    <BaseTabs
      :items="tabItems"
      :active-id="tab"
      class="mb-4"
      @change="(id) => goTab(id as any)"
    />

    <BaseRow>
      <BaseSelect
        v-model="subjectFilter"
        :options="subjectOptions"
        :form="false"
        on="canvas"
        class="max-w-36"
      />

      <ArchiveSwitch v-model="showOldEntries" />

      <BaseButton
        class="aspect-square p-1!"
        variant="action"
        :aria-label="t('school.tasks.itemForm.newEntry')"
        @click="openItemForm()"
      >
        <Plus :size="24" />
      </BaseButton>
    </BaseRow>

    <div class="flex flex-col gap-3 mt-4">
      <ItemSkeleton v-if="loading && initialLoad" :count="5" :image-count="2" />

      <ItemCard
        v-else
        v-for="item in visibleItems"
        :key="item.id"
        :id="'item-' + item.id"
        :is-collapsed="isChecked(item.id)"
        :highlighted="highlightedItemId === item.id"
        :title="item.title"
        :swipeable="true"
        :swipe-action="showOldEntries ? 'keep' : 'archive'"
        @swiped="handleSwipe(item)"
        @dblclick="handleItemDoubleClick(item, $event)"
        @menu-click="toggleMenu(item.id)"
        @files-dropped="(files) => triggerImageDrop(item, files)"
      >
        <template #checkbox>
          <BaseCheckbox
            v-if="user"
            :checked="isChecked(item.id)"
            @change="toggleCheck(item)"
          />
        </template>

        <template #badges>
          <div class="badge subject-badge">
            <template v-if="tab === 'all'"
              >{{ getTypeLabel(item.type) }} • </template
            >{{ getSubjectName(item.subject) }} •
            {{ new Date(item.dueDate).toLocaleDateString() }}
          </div>
          <div
            v-if="
              user?.role === 'superadmin' ||
              user?.tenantRole === 'admin' ||
              user?.tenantRole === 'moderator'
            "
            class="admin-creator-info"
          >
            {{ item.createdByName || 'Unbekannt'
            }}<span v-if="user?.role === 'superadmin'" class="creator-email">
              ({{ item.createdByEmail }})</span
            >
          </div>
        </template>

        <template #actions-pre>
          <BaseTooltip
            :content="t('school.tasks.items.menu.unpin')"
            placement="bottom"
          >
            <button
              v-if="isPinned(item.id)"
              type="button"
              class="unpin-trigger relative min-h-8 min-w-8 bg-transparent hover:bg-surface-hover flex justify-center items-center rounded-full transition-hover cursor-pointer touch-target"
              @click.stop="togglePin(item)"
            >
              <Pin :size="18" fill="currentColor" class="pinned" />
            </button>
          </BaseTooltip>
        </template>

        <template #menu>
          <BaseMenu
            v-if="openMenuId === item.id"
            class="right-0 mt-6"
            @click.stop
          >
            <BaseMenuButton
              @click="onMenuAction('images', item)"
              :icon="Upload"
            >
              {{ t('school.tasks.items.menu.uploadImages') }}
            </BaseMenuButton>

            <BaseMenuButton
              v-if="canEdit(item.createdBy)"
              @click="onMenuAction('edit', item)"
              :icon="Pencil"
            >
              {{ t('global.buttons.edit') }}
            </BaseMenuButton>

            <BaseMenuDivider />

            <BaseMenuButton
              @click="togglePin(item)"
              :icon="isPinned(item.id) ? Pin : Pin"
            >
              {{
                isPinned(item.id)
                  ? t('school.tasks.items.menu.unpin')
                  : t('school.tasks.items.menu.pin')
              }}
            </BaseMenuButton>

            <BaseMenuButton
              @click="handleArchiveFromMenu(item)"
              :icon="showOldEntries ? ArchiveRestore : Archive"
            >
              {{
                showOldEntries
                  ? t('school.tasks.items.menu.unarchive')
                  : t('school.tasks.items.menu.archive')
              }}
            </BaseMenuButton>

            <BaseMenuDivider />

            <BaseMenuButton @click="shareItem(item)" :icon="Send">
              {{ t('school.tasks.items.menu.share') }}
            </BaseMenuButton>

            <BaseMenuButton
              @click="
                openMenuId = null;
                showInfoItem = item;
              "
              :icon="Info"
            >
              {{ t('school.tasks.items.menu.info') }}
            </BaseMenuButton>

            <BaseMenuDivider />

            <BaseMenuButton
              title="Melden"
              @click="onMenuAction('report', item)"
              :icon="Flag"
            >
              {{ t('school.tasks.items.menu.report.name') }}
            </BaseMenuButton>

            <BaseMenuButton
              variant="danger"
              v-if="canDelete(item.createdBy)"
              @click="onMenuAction('delete', item)"
              :icon="Trash2"
            >
              {{ t('global.buttons.delete') }}
            </BaseMenuButton>
          </BaseMenu>
        </template>

        <template #body v-if="item.description.length">
          <span v-if="!isExpanded(item.id)"
            >{{ item.description.slice(0, 200)
            }}<span v-if="item.description.length > 200">…</span></span
          >
          <span v-else-if="item.description.length">{{
            item.description
          }}</span>
          <BaseButton
            v-if="item.description.length > 200"
            class="tiny"
            variant="ghost"
            @click="toggleDescription(item.id)"
            style="margin-left: 8px"
          >
            {{ isExpanded(item.id) ? 'Weniger anzeigen' : 'mehr' }}
          </BaseButton>
        </template>

        <template #content-after>
          <div v-if="item.images && item.images.length" class="mb-2">
            <div class="images-row">
              <template v-if="!isRevealed(item.id)">
                <div
                  v-for="(img, idx) in item.images.slice(0, imagesPerRow)"
                  :key="img.publicId"
                  class="thumb thumb-with-overlay-wrapper"
                  @contextmenu.prevent="
                    handleImageContextMenu($event, item, img)
                  "
                >
                  <button
                    type="button"
                    class="img-clickable"
                    @click.stop="openImageViewerForItem(item, idx)"
                  >
                    <img
                      :src="img.thumbUrl || makeThumb(img.url || '')"
                      loading="lazy"
                      draggable="false"
                      alt="Vorschau"
                    />
                  </button>

                  <button
                    v-if="
                      idx === imagesPerRow - 1 &&
                      item.images.length > imagesPerRow
                    "
                    class="img-overlay"
                    @click.stop.prevent="revealImages(item.id)"
                    @contextmenu.stop.prevent
                  >
                    <span class="overlay-blur"></span>
                    <span class="overlay-content"
                      >+{{ item.images.length - (imagesPerRow - 1) }}</span
                    >
                  </button>
                </div>
              </template>

              <template v-else>
                <div
                  v-for="(img, idx) in item.images"
                  :key="img.publicId"
                  class="thumb"
                  @contextmenu.prevent="
                    handleImageContextMenu($event, item, img)
                  "
                >
                  <button
                    type="button"
                    class="img-clickable"
                    @click.stop="openImageViewerForItem(item, idx)"
                  >
                    <img
                      :src="img.thumbUrl || makeThumb(img.url || '')"
                      loading="lazy"
                      draggable="false"
                      alt=""
                    />
                  </button>
                </div>
              </template>
            </div>
          </div>

          <div
            v-if="item.editorNote || user?.role === 'superadmin'"
            class="editor-note-section"
          >
            <div class="editor-note-header">
              <span class="editor-note-label">{{
                t('school.tasks.notes.note')
              }}</span>
              <BaseButton
                v-if="canEditNote()"
                class="tiny"
                @click.stop="startEditNote(item)"
                variant="ghost"
              >
                {{ t('global.buttons.edit') }}
              </BaseButton>
            </div>

            <div
              v-if="editingNoteForId !== item.id"
              class="editor-note-content"
            >
              <span v-if="item.editorNote">{{ item.editorNote }}</span>
              <span v-else class="note-placeholder">{{
                t('school.tasks.notes.noNotes')
              }}</span>
            </div>

            <div v-else class="editor-note-edit">
              <BaseInput
                id="editor-note-input"
                as="textarea"
                v-model="noteEditContent"
                rows="3"
                placeholder="Anmerkung eingeben..."
                maxlength="2000"
              ></BaseInput>
              <div class="editor-note-actions">
                <BaseButton
                  @click.stop="saveNote(item.id)"
                  :disabled="savingNote"
                  variant="action"
                  :loading="savingNote"
                >
                  {{ t('global.buttons.save') }}
                </BaseButton>
                <BaseButton
                  @click.stop="cancelEditNote()"
                  :disabled="savingNote"
                  variant="ghost"
                >
                  {{ t('global.buttons.cancel') }}
                </BaseButton>
              </div>
            </div>
          </div>
        </template>
      </ItemCard>

      <BaseEmptyState
        v-if="!loading && !limitedItems.length"
        :primary-action="openItemForm"
        :secondary-action="resetFilters"
      >
        <template #title>{{ t('school.tasks.items.view.noEntries') }}</template>
        <template #message>{{
          filteredItems.length
            ? t('school.tasks.items.view.noEntriesInViewMessage')
            : t('school.tasks.items.view.noEntriesMessage')
        }}</template>
        <template #primary-action-label>{{
          t('school.tasks.createEntry')
        }}</template>
        <template #secondary-action-label>{{
          t('school.tasks.resetFilters')
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
          on="canvas"
          >{{ t('global.buttons.showMore') }}</BaseButton
        >
        <BaseButton
          v-if="visibleCount > 5"
          variant="ghost"
          on="canvas"
          @click="showLess"
          >{{ t('global.buttons.showLess') }}</BaseButton
        >
      </div>
    </div>

    <ImageContextMenu
      v-if="imageMenu.visible"
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
      :show="showReportConfirm"
      message=""
      :show-reason-input="true"
      v-model:reason="reportReason"
      @confirm="doReport"
      @cancel="cancelReport"
    />

    <BaseDialog
      v-if="showDeleteConfirm"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
      :loading="deletingEntry"
      :danger="true"
      title="Diesen Eintrag löschen?"
      submit-text="Eintrag löschen"
    >
      Wenn du diesen Eintrag löschst, werden dieser und alle dazugehörigen
      Bilder unwiderruflich gelöscht.
    </BaseDialog>

    <BaseDialog
      v-if="showImageDeleteConfirm"
      @confirm="confirmImageDelete"
      @cancel="cancelImageDelete"
      :loading="deletingImage"
      :danger="true"
      title="Dieses Bild löschen?"
      submit-text="Bild löschen"
    >
      Wenn du dieses Bild löschst, wird es unwiderruflich entfernt.
    </BaseDialog>

    <ItemInfoModal
      v-if="showInfoItem"
      :show="!!showInfoItem"
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

<style scoped>
.subject-badge {
  color: var(--color-on-surface-muted);
  padding: 0;
  font-size: var(--text-body);
}
.tiny {
  padding: 0;
  font-size: var(--text-body);
  font-weight: 700;
  color: var(--color-on-surface-muted);
  background: transparent;
  border: none;
}
.tiny:hover {
  background: transparent;
  color: var(--color-on-surface);
  border: none;
  padding: 0;
}

.images-row {
  display: grid;
  grid-template-columns: repeat(v-bind(imagesPerRow), 1fr);
  gap: 8px;
  position: relative;
}

.thumb {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.12);
  position: relative;
  -webkit-touch-callout: none; /* Disables iOS system menu */
  -webkit-user-select: none; /* Safari / Chrome */
  -moz-user-select: none; /* Firefox */
  -ms-user-select: none; /* IE/Edge */
  user-select: none; /* Standard */
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  -webkit-user-drag: none;
}

.thumb-with-overlay-wrapper {
  position: relative;
}

.img-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  background: transparent;
  z-index: 10;
}

.img-overlay .overlay-blur {
  position: absolute;
  inset: 0;
  background: #8883;
  opacity: 1;
  border-radius: var(--radius-md);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.img-overlay .overlay-content {
  position: relative;
  color: var(--color-on-surface);
  font-weight: 400;
  font-size: var(--text-h1);
  z-index: 11;
  pointer-events: none;
}

.img-clickable {
  width: 100%;
  height: 100%;
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
  display: block;
}

.img-clickable img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.empty {
  text-align: center;
  color: var(--color-on-surface-muted);
  padding: 24px;
  border: none;
}

.message {
  font-weight: 600;
  white-space: normal;
  overflow-wrap: break-word;
  word-break: break-all;
}

.message.error {
  color: var(--color-danger);
}

.admin-creator-info {
  color: var(--color-on-surface-muted);
  font-size: var(--text-sub);
}

.creator-email {
  opacity: 0.7;
}

/* Anmerkungen */
.editor-note-section {
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--color-surface-hover);
  border: 1px solid var(--color-canvas-border);
  border-radius: var(--radius-md);
  user-select: none;
  -webkit-user-select: none;
}

.editor-note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-note-label {
  font-size: var(--text-sub);
  font-weight: 600;
  color: var(--color-on-surface-muted);
}

.editor-note-content {
  font-size: var(--text-sub);
  color: var(--color-on-surface);
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--color-surface-hover);
}

.note-placeholder {
  color: var(--color-on-surface-muted);
  font-style: italic;
}

.editor-note-edit textarea {
  margin-bottom: 8px;
}

.editor-note-actions {
  display: flex;
  gap: 8px;
}
</style>
