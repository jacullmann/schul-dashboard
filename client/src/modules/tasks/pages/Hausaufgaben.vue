<template>
  <div class="card">
    <div class="hw-header">
      <div class="title-inf">
        <h2>{{ t('school.tasks.title') }}</h2>
        <InfoPop
            :tooltip="t('school.tasks.infopop.tooltip')"
            :title="t('school.tasks.title')"
        >
          <h3>{{ t('school.tasks.infopop.description') }}</h3>
          <template v-for="(section, index) in tm('school.tasks.infopop.sections')" :key="index">
            <h3 v-html="section.title"></h3>
            <p v-html="section.text"></p>
          </template>
        </InfoPop>

      </div>
    </div>

    <TabNavigation
        :active-tab="tab"
        @change="goTab"
    />

    <div class="controls">
      <div class="left">
        <div v-if="tab !== 'PRIVATE'" class="row-two">

          <SelectDropdown
              v-model="subjectFilter"
              :options="subjectOptions"
              extraClass="select-subject"
          />
          <OldNewSwitch v-model="showOldEntries" />
          <CreateEntryDropdown
              v-if="user"
              @select="openCreateFormByType"
          />
          <CreateEntryDropdownPseudo
              v-if="!user"
          />
        </div>
        <CreateEntryDropdown
            v-if="user && tab === 'PRIVATE'"
            @select="openCreateFormByType"
        />
      </div>

      <div v-if="message" class="small message" :class="{ error: isError }">{{ message }}</div>
    </div>

    <div class="items">
      <ItemSkeleton v-if="loading && initialLoad && tab !== 'PRIVATE'" :count="5" :image-count="2" />

      <ItemCard
          v-else-if="tab !== 'PRIVATE'"
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
      >
        <template #checkbox>
          <Checkbox
              v-if="user"
              :checked="isChecked(item.id)"
              @change="toggleCheck(item)"
          />
        </template>

        <template #badges>
          <div class="badge subject-badge">{{ getSubjectName(item.subject) }} • {{ new Date(item.dueDate).toLocaleDateString() }}</div>
          <div
            v-if="user?.role === 'superadmin' || user?.tenantRole === 'admin' || user?.tenantRole === 'mod'"
            class="admin-creator-info"
          >
            {{ item.createdByName || 'Unbekannt' }}<span v-if="user?.role === 'superadmin'" class="creator-email"> ({{ item.createdByEmail }})</span>
          </div>
        </template>

        <template #actions-pre>
          <div v-if="isPinned(item.id)" class="unpin-trigger" role="button" @click.stop="togglePin(item)">
            <Pin :size="18" fill="currentColor" class="pinned" />
          </div>
        </template>

        <template #menu>
          <div v-if="openMenuId === item.id" class="menu" @click.stop>
            <button class="menu-btn" v-if="user" @click="onMenuAction('images', item)">
              <span class="menu-btn-content"><Upload />{{ t('school.tasks.items.menu.uploadImages') }}</span>
            </button>

            <button class="menu-btn" v-if="canEdit(item.createdBy)" @click="onMenuAction('edit', item)">
              <span class="menu-btn-content"><Pencil />{{ t('global.buttons.edit') }}</span>
            </button>

            <div class="menu-divider" v-if="canEdit(item.createdBy) || user"></div>

            <button class="menu-btn" v-if="user" @click="togglePin(item)">
              <span class="menu-btn-content"><Pin v-if="!isPinned(item.id)" class="unpinned" /><Pin fill="currentColor" v-else class="pinned" /> {{ isPinned(item.id) ? t('school.tasks.items.menu.unpin') : t('school.tasks.items.menu.pin')}}</span>
            </button>

            <button class="menu-btn" @click="shareItem(item)">
              <span class="menu-btn-content"><Send />{{ t('school.tasks.items.menu.share') }}</span>
            </button>

            <button class="menu-btn" title="Melden" @click="onMenuAction('report', item)">
              <span class="menu-btn-content"><Flag />{{ t('school.tasks.items.menu.report.name') }}</span>
            </button>

            <div class="menu-divider" v-if="canDelete(item.createdBy)"></div>

            <button class="menu-btn danger" v-if="canDelete(item.createdBy)" @click="onMenuAction('delete', item)">
              <span class="menu-btn-content"><Trash2 />{{ t('global.buttons.delete') }}</span>
            </button>
          </div>
        </template>

        <template #body v-if="item.description.length">
          <span v-if="!isExpanded(item.id)">{{ item.description.slice(0, 200) }}<span v-if="item.description.length > 200">…</span></span>
          <span v-else-if="item.description.length">{{ item.description }}</span>
          <button v-if="item.description.length > 200" class="btn tiny ghost" @click="toggleDescription(item.id)" style="margin-left:8px;">
            {{ isExpanded(item.id) ? 'Weniger anzeigen' : 'mehr' }}
          </button>
        </template>

        <template #content-after>
          <div v-if="item.images && item.images.length" class="item-images">
            <div class="images-row">
              <template v-if="!isRevealed(item.id)">
                <div v-for="(img, idx) in item.images.slice(0, imagesPerRow)"
                     :key="img.publicId"
                     class="thumb thumb-with-overlay-wrapper"
                     @contextmenu.prevent="handleImageContextMenu($event, item, img)"
                >
                  <div class="img-clickable" @click.stop="openImageViewer(item, idx)">
                    <img :src="img.thumbUrl || makeThumb(img.url || '')" loading="lazy" draggable="false" alt="Vorschau" />
                  </div>

                  <button
                      v-if="idx === imagesPerRow - 1 && item.images.length > imagesPerRow"
                      class="img-overlay"
                      @click.stop.prevent="revealImages(item.id)"
                      @contextmenu.stop.prevent
                  >
                    <div class="overlay-blur"></div><div class="overlay-content">+{{ item.images.length - (imagesPerRow - 1) }}</div>
                  </button>
                </div>
              </template>

              <template v-else>
                <div v-for="(img, idx) in item.images"
                     :key="img.publicId"
                     class="thumb"
                     @contextmenu.prevent="handleImageContextMenu($event, item, img)"
                >
                  <div class="img-clickable" @click.stop="openImageViewer(item, idx)">
                    <img :src="img.thumbUrl || makeThumb(img.url || '')" loading="lazy" draggable="false"  alt=""/>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <div
              v-if="item.editorNote || user?.role === 'superadmin'"
              class="editor-note-section"
          >
            <div class="editor-note-header">
              <span class="editor-note-label">{{ t('school.tasks.notes.note') }}</span>
              <button
                  v-if="canEditNote()"
                  class="btn ghost tiny"
                  @click.stop="startEditNote(item)"
              >
                {{ t('global.buttons.edit') }}
              </button>
            </div>

            <div v-if="editingNoteForId !== item.id" class="editor-note-content">
              <span v-if="item.editorNote">{{ item.editorNote }}</span>
              <span v-else class="note-placeholder">{{ t('school.tasks.notes.noNotes') }}</span>
            </div>

            <div v-else class="editor-note-edit">
                <textarea
                    class="input"
                    v-model="noteEditContent"
                    rows="3"
                    placeholder="Anmerkung eingeben..."
                    maxlength="2000"
                ></textarea>
              <div class="editor-note-actions">
                <button
                    class="btn action"
                    @click.stop="saveNote(item.id)"
                    :disabled="savingNote"
                >
                  <LoadingSpinner v-if="savingNote" size="1.1em" />
                  <span v-else>{{ t('global.buttons.save') }}</span>
                </button>
                <button
                    class="btn ghost"
                    @click.stop="cancelEditNote()"
                    :disabled="savingNote"
                >
                  {{ t('global.buttons.cancel') }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </ItemCard>

      <div v-if="tab === 'PRIVATE'" class="private-entries-container">
        <TodoApp
            ref="todoAppRef"
            @create="openCreateFormByType('PRIVATE')"
            @edit="openEditTodo"
        />
      </div>

      <div v-if="!loading && !limitedItems.length && filteredItems.length && tab !== 'PRIVATE'" class="card empty">{{ t('school.tasks.items.view.noEntriesInView') }}</div>
      <div v-if="!loading && !filteredItems.length && tab !== 'PRIVATE'" class="card empty">{{ t('school.tasks.items.view.noEntriesFound') }}</div>

      <div v-if="filteredItems.length > 5" class="pagination-actions">
        <button v-if="visibleCount < filteredItems.length" class="btn ghost" @click="showMore">{{ t('global.buttons.showMore') }}</button>
        <button v-if="visibleCount > 5" class="btn ghost" @click="showLess">{{ t('global.buttons.showLess') }}</button>
      </div>
    </div>

    <ItemForm
        v-if="showItemForm"
        :key="itemFormKey"
        :type="itemFormType"
        :subjects="subjects"
        :initial="itemToEdit"
        :max-title-length="MAX_TITLE_LENGTH"
        :max-subject-length="MAX_SUBJECT_LENGTH"
        @cancel="showItemForm=false"
        @success="handleSuccess(t('school.tasks.itemForm.successEdit'))"
        @error="onItemFormError"
    />

    <TodoForm
        v-if="showTodoForm"
        :initial="todoToEdit"
        @cancel="showTodoForm=false"
        @success="(data) => handleTodoSuccess(
        todoToEdit ? 'Privater Eintrag aktualisiert.' : 'Privater Eintrag erstellt.',
        data
    )"
        @error="onItemFormError"
    />

    <ImageContextMenu
        v-if="imageMenu.visible"
        :x="imageMenu.x"
        :y="imageMenu.y"
        :can-delete="imageMenu.image && imageMenu.item ? canDeleteImage(imageMenu.item.createdBy, imageMenu.image.createdBy) : false"
        @upload="triggerImageUpload"
        @delete="triggerImageDelete"
        @close="closeImageMenu"
    />

    <ConfirmDialog
        :show="showReportConfirm"
        message=""
        :show-reason-input="true"
        v-model:reason="reportReason"
        @confirm="doReport"
        @cancel="cancelReport"
    />

    <DeleteEntryModal
        :show="showDeleteConfirm"
        :loading="deletingEntry"
        @confirm="confirmDelete"
        @cancel="cancelDelete"
    />

    <DeleteImageModal
        v-if="showImageDeleteConfirm"
        :show="showImageDeleteConfirm"
        :loading="deletingImage"
        @confirm="confirmImageDelete"
        @cancel="cancelImageDelete"
    />

    <ImageViewer
        :visible="showImageViewer"
        :images="viewerImages"
        :initial-index="viewerStartIndex"
        @close="closeImageViewer"
    />

    <CompleteSetup v-if="user" :visible="showSetupModal" :is-setup="user && !user.doneSetup" :initial-data="{ enrKurs: user.enrKurs || null, wpuKurs1: user.wpuKurs1 || null, wpuKurs2: user.wpuKurs2 || null, theater: user.theater || 0 }" @close="showSetupModal = false" @success="onSetupSuccess" @update:user="onSetupSuccess" />
  </div>
</template>

<script setup lang="ts">
import Checkbox from '@/common/components/Checkbox.vue';
import ItemCard from '@/modules/tasks/components/ItemCard.vue';
import ItemForm from '@/modules/tasks/components/ItemForm.vue';
import LoadingSpinner from '@/common/components/LoadingSpinner.vue';
import ImageContextMenu from '@/modules/tasks/components/ImageContextMenu.vue';
import ImageViewer from '@/modules/tasks/components/ImageViewer.vue';
import ConfirmDialog from '@/modules/tasks/components/ConfirmDialog.vue'
import OldNewSwitch from "@/modules/tasks/components/NewOldSwitch.vue"
import CompleteSetup from "@/modules/auth/components/CompleteSetup.vue";
import TodoApp from "@/modules/tasks/components/TodoApp.vue";
import ItemSkeleton from '@/modules/tasks/components/ItemSkeleton.vue';
import TabNavigation from '@/modules/tasks/components/TabNavigation.vue';
import { Upload, Pencil, Send, Flag, Trash2, Pin } from 'lucide-vue-next'
import { useHausaufgaben } from '@/modules/tasks/composables/useHausaufgaben';
import CreateEntryDropdown from '@/modules/tasks/components/CreateEntryDropdown.vue';
import TodoForm from '@/modules/tasks/components/TodoForm.vue';
import CreateEntryDropdownPseudo from "@/modules/tasks/components/CreateEntryDropdownPseudo.vue";
import InfoPop from '@/common/components/InfoModalCenter.vue'
import DeleteEntryModal from '@/modules/tasks/components/DeleteEntryModal.vue';
import DeleteImageModal from '@/modules/tasks/components/DeleteImageModal.vue'
import SelectDropdown from '@/common/components/SelectDropdown.vue';
import { useI18n } from 'vue-i18n';
import { useWindowSize } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import type { HwItem } from '@/modules/tasks/composables/useHausaufgaben';

const { t, tm } = useI18n();
const { width: windowWidth } = useWindowSize();

// Local-only dismissed items tracking for immediate UI removal before refresh
const dismissedItems = ref(new Set<string>());

function handleSwipe(item: HwItem) {
  dismissedItems.value.add(item.id);
  const cutoffIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  toggleVisibility(item, showOldEntries.value, cutoffIso);
}

const visibleItems = computed(() => {
  return limitedItems.value.filter((item) => {
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
  MAX_TITLE_LENGTH,
  MAX_SUBJECT_LENGTH,
  showItemForm,
  itemToEdit,
  user,
  subjects,
  loading,
  initialLoad,
  subjectFilter,
  showOldEntries,
  showSetupModal,
  message, isError,
  itemFormKey,
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
  handleSuccess,
  onItemFormError,
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
  onSetupSuccess,
  doReport,
  cancelReport,
  showTodoForm,
  todoToEdit,
  openCreateFormByType,
  handleTodoSuccess,
  itemFormType,
  openEditTodo,
  todoAppRef,
  showDeleteConfirm,
  confirmDelete,
  cancelDelete,
  imageMenu,
  closeImageMenu,
  triggerImageUpload,
  triggerImageDelete,
  showImageDeleteConfirm,
  confirmImageDelete,
  cancelImageDelete,
  showImageViewer,
  viewerImages,
  viewerStartIndex,
  openImageViewer,
  closeImageViewer,
  shareItem,
  highlightedItemId,
  deletingImage,
  deletingEntry,
  handleImageContextMenu,
  subjectOptions,
  getSubjectName
} = useHausaufgaben();

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
    '.menu',
    '.checkbox'
  ].join(', ');

  if (target.closest(ignoreSelectors)) {
    return;
  }

  toggleCheck(item);
}

// Expose todoAppRef to satisfy TS declaration and allow template bindings
defineExpose({ todoAppRef });
</script>

<style scoped>
.hw-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-direction: column;
  text-align: left;
}

.hw-header h2 {
  margin: 0 0 2px 0;
}

:deep(.nav-bar) {
  margin: 16px 0;
}

.controls {
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  flex-wrap:wrap;
}

.controls .left {
  display:flex;
  gap:8px;
  align-items:center;
  flex-wrap:wrap;
  height: 100%
}

.select-subject {
  min-width: 150px;
}

.items {
  margin-top: 16px;
  display:flex;
  flex-direction:column;
  gap:12px;
}

.subject-badge {
  color:var(--sub);
  padding: 0;
  font-size: var(--font-size-body);
}
.tiny {
  padding: 0;
  font-size: var(--font-size-body);
  font-weight: 700;
  color: var(--sub);
  background: transparent;
  border: none;
}
.tiny:hover {
  background: transparent;
  color: var(--text);
  border: none;
  padding: 0;
}

.lucide-pin {
  overflow: visible !important;
}

.pinned :deep(path:last-child),
.unpinned :deep(path:last-child),
.unpinned :deep(path:first-child) {
  transform: translateY(0) scaleY(1);
  transition: 0.1s ease;
  transform-origin: bottom;
}

.menu-btn:hover .pinned :deep(path:last-child),
.unpin-trigger:hover .pinned :deep(path:last-child) {
  transform: translateY(-8%) scaleY(1);
}

.menu-btn:hover .unpinned :deep(path:last-child) {
  transform: translateY(8%) scaleY(1);
}

.menu-btn:hover .unpinned :deep(path:first-child) {
  transform: translateY(0) scaleY(0.7);
}

.lucide-send {
  overflow: visible !important;
  transform: translateY(0);
  transition: 0.1s ease;
}

.menu-btn:hover .lucide-send {
  transform: translate(1px, -1px);

}

.lucide-upload {
  overflow: visible !important;
}

.lucide-upload :deep(path:first-child),
.lucide-upload :deep(path:nth-child(2)) {
  transform: translateY(0);
  transition: 0.1s ease;
}

.menu-btn:hover .lucide-upload :deep(path:first-child),
.menu-btn:hover .lucide-upload :deep(path:nth-child(2)) {
  transform: translateY(-2px);
}

.lucide-pencil {
  overflow: visible !important;
  transform: translateY(0) rotate(0);
  transition: 0.1s ease;
}

.menu-btn:hover .lucide-pencil {
  transform: translateY(-1px) rotate(5deg);
}

.lucide-flag {
  transform: rotate(0);
  transition: 0.1s ease;
  transform-origin: 15% 90%;
}

.menu-btn:hover .lucide-flag {
  transform: rotate(-5deg);
}

.lucide-trash-2 {
  overflow: visible !important;
}

.lucide-trash-2 :deep(path:nth-child(3)) {
  height: 6px;
}

.lucide-trash-2 :deep(path:nth-child(4)),
.lucide-trash-2 :deep(path:nth-child(5)) {
  transform: translateY(0) translateX(0) rotate(0);
  transition: 0.1s ease;
  transform-origin: 80% 30%;
}

.menu-btn:hover .lucide-trash-2 :deep(path:nth-child(4)),
.menu-btn:hover .lucide-trash-2 :deep(path:nth-child(5)) {
  transform: translateY(-1px) translateX(1px) rotate(10deg);
}

.item-images {
  margin-top:8px;

}

.images-row {
  display: grid;
  grid-template-columns: repeat(v-bind(imagesPerRow), 1fr);
  gap:8px;
  position:relative;
}

.thumb {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius:8px;
  overflow:hidden;
  border:none;
  display:flex;
  align-items:center;
  justify-content:center;
  background: rgba(0,0,0,0.12);
  position:relative;
  -webkit-touch-callout: none; /* Disables iOS system menu */
  -webkit-user-select: none;   /* Safari / Chrome */
  -moz-user-select: none;      /* Firefox */
  -ms-user-select: none;       /* IE/Edge */
  user-select: none;           /* Standard */
}

.thumb img {
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
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
  border-radius: var(--border-4);
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
  border-radius: var(--border-4);
  backdrop-filter:blur(4px);
  -webkit-backdrop-filter:blur(4px);
}

.img-overlay .overlay-content {
  position: relative;
  color: var(--text);
  font-weight: 400;
  font-size: var(--font-size-h1);
  z-index: 11;
  pointer-events: none;
}

.img-clickable {
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.img-clickable img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.empty {
  text-align:center;
  color:var(--sub);
  padding:24px;
  border: none
}

.message {
  font-weight:600;
  white-space: normal;
  overflow-wrap: break-word;
  word-break: break-all;
}

.message.error {
  color: var(--danger);
}

.unpin-trigger {
  background: transparent;
  color: var(--sub);
  padding: 8px;
  border-radius: var(--border-5);
  display: inline-flex;
  margin: -8px;
  margin-right: 4px;
  transition: 0.15s ease;
}

.unpin-trigger:hover {
  background: var(--gg);
  color: var(--text);
}

.pagination-actions {
  margin-top: 4px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.row-two {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  gap: 8px;
  position: relative;
}

.private-entries-container .hw-header {
  padding: 0;
  background: transparent;
}

.admin-creator-info {
  color: var(--sub);
  font-size: var(--font-size-sub);
}

.creator-email {
  opacity: 0.7;
}

/* Anmerkungen */
.editor-note-section {
  margin-top: 8px;
  padding: 10px 12px;
  background: var(--gg);
  border: 1px solid var(--border);
  border-radius: var(--border-4);
}

.editor-note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-note-label {
  font-size: var(--font-size-sub);
  font-weight: 600;
  color: var(--sub);
}

.editor-note-content {
  font-size: var(--font-size-sub);
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--gg);
}

.note-placeholder {
  color: var(--sub);
  font-style: italic;
}

.editor-note-edit textarea {
  margin-bottom: 8px;
}

.editor-note-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 500px ) {
  .row-two {
    flex-direction: row;
    align-items: flex-start;
    margin-top: 0;
    margin-bottom: 0;
    flex-wrap: wrap;
    justify-content: left;
  }
}
</style>