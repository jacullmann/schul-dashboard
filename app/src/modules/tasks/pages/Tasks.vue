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
  MessageSquarePlus,
  FileText,
  PieChart,
  Table,
} from '@lucide/vue';
import { useTasks } from '@/modules/tasks/composables/useTasks';
import { useItemForm } from '@/core/composables/useItemForm';
import { useImageViewer } from '@/core/composables/useImageViewer';
import InfoModal from '@/common/components/InfoModal.vue';
import ItemInfoModal from '@/modules/tasks/components/ItemInfoModal.vue';
import { useI18n } from 'vue-i18n';
import { useWindowSize } from '@vueuse/core';
import { computed, ref, watch, onMounted } from 'vue';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue';
import type { HwItem } from '@/modules/tasks/composables/useTasks';

const showInfoItem = ref<HwItem | null>(null);

const getFileBadge = (img: any) => {
  const format = img.metadata?.format?.toLowerCase();
  if (format === 'pdf' || img.publicId?.toLowerCase().endsWith('.pdf')) {
    return { label: 'PDF', icon: FileText };
  }
  if (format === 'docx' || format === 'doc') {
    return { label: 'DOCX', icon: FileText };
  }
  if (format === 'pptx' || format === 'ppt') {
    return { label: 'PPTX', icon: PieChart };
  }
  if (format === 'xlsx' || format === 'xls') {
    return { label: 'XLSX', icon: Table };
  }
  return null;
};

const isOfficeFileWithoutThumb = (img: any) => {
  const format = img.metadata?.format?.toLowerCase();
  const isOffice = ['docx', 'pptx', 'xlsx', 'doc', 'ppt', 'xls'].includes(
    format,
  );
  return isOffice && !img.metadata?.thumbnailId;
};

const getOfficeBgClass = (img: any) => {
  const format = img.metadata?.format?.toLowerCase();
  if (format === 'docx' || format === 'doc')
    return 'from-blue-400 to-indigo-800';
  if (format === 'pptx' || format === 'ppt')
    return 'from-orange-400 to-rose-700';
  if (format === 'xlsx' || format === 'xls')
    return 'from-lime-400 to-green-800';
  return 'from-gray-500 to-gray-700';
};

const getThumbSrc = (img: any) => {
  if (img.metadata?.thumbnailId) {
    return makeThumb(img.metadata.thumbnailId);
  }
  return makeThumb(img.publicId);
};

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
  toggleMenu,
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

function handleCardMenuClick(item: HwItem, event: MouseEvent) {
  if (openMenuId.value === item.id) {
    openMenuId.value = null;
    menuCoords.value = null;
  } else {
    menuCoords.value = { x: event.clientX, y: event.clientY };
    openMenuId.value = item.id;
  }
}

function handleCardContextMenu(item: HwItem, event: MouseEvent) {
  menuCoords.value = { x: event.clientX, y: event.clientY };
  openMenuId.value = item.id;
}

watch(openMenuId, (newVal) => {
  if (newVal === null) {
    menuCoords.value = null;
    menuRef.value = null;
  }
});

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

function handleItemDoubleClick(item: HwItem, event: MouseEvent) {
  if (!user.value) return;
  const target = event.target as HTMLElement;
  const ignoreSelectors = [
    'button',
    'a',
    'input',
    'textarea',
    '.item-menu-trigger',
    '.note-section',
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

      <ItemCard
        v-else
        v-for="(item, index) in visibleItems"
        :key="item.id"
        :id="'item-' + item.id"
        class="animate-fade-up"
        :style="{
          animationDelay: `${(index + 3) * 0.05 - elapsedLoadTime}s`,
          animationFillMode: 'both',
        }"
        :is-collapsed="isChecked(item.id)"
        :highlighted="highlightedItemId === item.id"
        :title="item.title"
        :swipeable="true"
        :swipe-action="showOldEntries ? 'keep' : 'archive'"
        @swiped="handleSwipe(item)"
        @dblclick="handleItemDoubleClick(item, $event)"
        @contextmenu.prevent.stop="handleCardContextMenu(item, $event)"
        @menu-click="handleCardMenuClick(item, $event)"
        @files-dropped="(files: File[]) => triggerImageDrop(item, files)"
      >
        <template #checkbox>
          <BaseCheckbox
            v-if="user"
            :checked="isChecked(item.id)"
            @change="toggleCheck(item)"
          />
        </template>

        <template #badges>
          <div class="text-on-ghost-muted text-base">
            <template v-if="tab === 'all'"
              >{{ getTypeLabel(item.type) }} • </template
            >{{ getSubjectName(item.subject) }} •
            {{ new Date(item.dueDate).toLocaleDateString()
            }}<template
              v-if="
                user?.role === 'superadmin' ||
                user?.tenantRole === 'admin' ||
                user?.tenantRole === 'moderator'
              "
            >
              • {{ item.createdByName || 'Unbekannt' }}</template
            >
          </div>
          <div
            v-if="user?.role === 'superadmin'"
            class="text-on-ghost-subtle text-base"
          >
            ({{ item.createdByEmail }})
          </div>
        </template>

        <template #actions-pre>
          <BaseTooltip
            :content="t('tasks.list.items.menu.unpin')"
            placement="bottom"
          >
            <BaseButton
              v-if="isPinned(item.id)"
              variant="ghost"
              size="sm"
              :icon="Pin"
              icon-classes="fill-current"
              @click.stop="togglePin(item)"
            />
          </BaseTooltip>
        </template>

        <template #menu>
          <Teleport to="body" :disabled="isMobile">
            <BaseMenu
              :open="openMenuId === item.id"
              @close="openMenuId = null"
              :ref="
                (el: any) => {
                  if (el && openMenuId === item.id) menuRef = el.menuEl;
                }
              "
              :class="!isMobile ? 'fixed! z-[10000]! min-w-[180px]' : ''"
              :style="!isMobile ? itemMenuStyles : undefined"
              @click.stop
            >
              <BaseMenuButton
                @click="onMenuAction('images', item)"
                :icon="Upload"
              >
                {{ t('tasks.list.items.menu.upload_images') }}
              </BaseMenuButton>

              <BaseMenuButton
                v-if="canEdit(item.createdBy)"
                @click="onMenuAction('edit', item)"
                :icon="Pencil"
              >
                {{ t('common.buttons.edit') }}
              </BaseMenuButton>

              <BaseMenuButton
                v-if="canEditNote() && !item.editorNote"
                @click="onMenuAction('addNote', item)"
                :icon="MessageSquarePlus"
              >
                {{ t('tasks.list.items.menu.add_note') }}
              </BaseMenuButton>

              <BaseMenuDivider />

              <BaseMenuButton
                @click="onMenuAction('pin', item)"
                :icon="Pin"
                :iconClasses="isPinned(item.id) ? 'fill-current' : ''"
              >
                {{
                  isPinned(item.id)
                    ? t('tasks.list.items.menu.unpin')
                    : t('tasks.list.items.menu.pin')
                }}
              </BaseMenuButton>

              <BaseMenuButton
                @click="onMenuAction('archive', item)"
                :icon="showOldEntries ? ArchiveRestore : Archive"
              >
                {{
                  showOldEntries
                    ? t('tasks.list.items.menu.unarchive')
                    : t('tasks.list.items.menu.archive')
                }}
              </BaseMenuButton>

              <BaseMenuDivider />

              <BaseMenuButton @click="onMenuAction('share', item)" :icon="Send">
                {{ t('tasks.list.items.menu.share') }}
              </BaseMenuButton>

              <BaseMenuButton
                @click="
                  openMenuId = null;
                  showInfoItem = item;
                "
                :icon="Info"
              >
                {{ t('tasks.list.items.menu.info') }}
              </BaseMenuButton>

              <BaseMenuDivider />

              <BaseMenuButton
                title="Melden"
                @click="onMenuAction('report', item)"
                :icon="Flag"
              >
                {{ t('tasks.list.items.menu.report.name') }}
              </BaseMenuButton>

              <BaseMenuButton
                variant="danger"
                v-if="canDelete(item.createdBy)"
                @click="onMenuAction('delete', item)"
                :icon="Trash2"
              >
                {{ t('common.buttons.delete') }}
              </BaseMenuButton>
            </BaseMenu>
          </Teleport>
        </template>

        <template #body v-if="item.description.length">
          <span v-if="!isExpanded(item.id)"
            >{{ item.description.slice(0, 200)
            }}<span v-if="item.description.length > 200">…</span></span
          >
          <span v-else-if="item.description.length">{{
            item.description
          }}</span>
          <button
            v-if="item.description.length > 200"
            type="button"
            class="relative text-base font-bold text-on-ghost-muted hover:text-on-ghost cursor-pointer touch-target ml-2"
            @click="toggleDescription(item.id)"
          >
            {{ isExpanded(item.id) ? 'Weniger anzeigen' : 'mehr' }}
          </button>
        </template>

        <template
          #content-after
          v-if="
            (item.images && item.images.length) ||
            item.editorNote ||
            editingNoteForId === item.id
          "
        >
          <div v-if="item.images && item.images.length">
            <div class="images-row mt-2 mb-2">
              <div
                v-for="(img, idx) in isRevealed(item.id)
                  ? item.images
                  : item.images.slice(0, imagesPerRow)"
                :key="img.publicId"
                class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border-none bg-black/[0.12] select-none"
                @contextmenu.prevent.stop="
                  handleImageContextMenu($event, item, img)
                "
              >
                <button
                  type="button"
                  class="img-clickable w-full h-full cursor-pointer bg-transparent block"
                  @click.stop="openImageViewerForItem(item, idx)"
                >
                  <span
                    v-if="isOfficeFileWithoutThumb(img)"
                    class="flex flex-col items-center justify-center w-full h-full text-white p-3 text-center select-none bg-gradient-to-br"
                    :class="getOfficeBgClass(img)"
                  >
                    <component
                      :is="getFileBadge(img)?.icon"
                      :size="32"
                      class="mb-1.5 drop-shadow-md opacity-90"
                    />
                    <span class="text-sm font-bold uppercase">{{
                      img.metadata?.format
                    }}</span>
                    <span
                      class="text-xs text-white opacity-75 max-w-full truncate px-1"
                      :title="img.metadata?.name"
                      >{{ img.metadata?.name || 'Dokument' }}</span
                    >
                  </span>
                  <img
                    v-else
                    :src="getThumbSrc(img)"
                    class="block h-full w-full object-cover [pointer-events:none]"
                    loading="lazy"
                    draggable="false"
                    alt="Vorschau"
                  />
                </button>

                <div
                  v-if="getFileBadge(img) && !isOfficeFileWithoutThumb(img)"
                  class="absolute top-1 left-1 flex items-center gap-1.5 bg-black/40 border border-white/10 text-white p-1.5 pr-2 rounded-md text-sm/4 font-semibold select-none pointer-events-none backdrop-blur-sm"
                >
                  <component
                    :is="getFileBadge(img)?.icon"
                    :size="16"
                    class="text-white"
                  />
                  <span>{{ getFileBadge(img)?.label }}</span>
                </div>

                <button
                  v-if="
                    !isRevealed(item.id) &&
                    idx === imagesPerRow - 1 &&
                    item.images.length > imagesPerRow
                  "
                  class="img-overlay absolute flex inset-0 items-center justify-center rounded-md cursor-pointer z-10"
                  @click.stop.prevent="revealImages(item.id)"
                  @contextmenu.stop.prevent
                >
                  <span
                    class="overlay-blur absolute inset-0 bg-[#8886] rounded-md backdrop-blur-sm"
                  ></span>
                  <span class="text-4xl font-medium text-white z-10"
                    >+{{ item.images.length - (imagesPerRow - 1) }}</span
                  >
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="item.editorNote || editingNoteForId === item.id"
            class="note-section mt-2 pt-1 border-t border-surface-border flex justify-between gap-3"
          >
            <div class="w-full">
              <div class="text-on-ghost text-base font-bold mb-1">
                {{ t('tasks.list.notes.note') }}
              </div>

              <div
                v-if="editingNoteForId !== item.id"
                class="text-on-ghost text-base whitespace-pre-wrap break-words"
              >
                <span v-if="item.editorNote">{{ item.editorNote }}</span>
                <span
                  v-else
                  class="note-placeholder text-on-ghost-muted italic"
                  >{{ t('tasks.list.notes.no_notes') }}</span
                >
              </div>

              <div v-else>
                <BaseInput
                  id="editor-note-input"
                  as="textarea"
                  v-model="noteEditContent"
                  rows="3"
                  placeholder="Anmerkung eingeben..."
                  maxlength="2000"
                ></BaseInput>
                <BaseRow justify="end" class="mt-2 mb-1">
                  <BaseButton
                    @click.stop="cancelEditNote()"
                    :disabled="savingNote"
                    variant="ghost"
                  >
                    {{ t('common.buttons.cancel') }}
                  </BaseButton>
                  <BaseButton
                    @click.stop="saveNote(item.id)"
                    :disabled="savingNote"
                    variant="action"
                    :loading="savingNote"
                  >
                    {{ t('common.buttons.save') }}
                  </BaseButton>
                </BaseRow>
              </div>
            </div>

            <div
              v-if="editingNoteForId !== item.id && canEditNote()"
              class="flex gap-1 items-start -mr-2"
            >
              <BaseTooltip
                :content="t('common.buttons.edit')"
                placement="bottom"
              >
                <BaseButton
                  @click.stop="startEditNote(item)"
                  variant="ghost"
                  :icon="Pencil"
                  size="sm"
                />
              </BaseTooltip>

              <BaseTooltip
                v-if="item.editorNote"
                :content="t('common.buttons.delete')"
                placement="bottom"
              >
                <BaseButton
                  @click.stop="deleteNote(item.id)"
                  variant="ghost"
                  :icon="Trash2"
                  size="sm"
                  class="text-danger hover:text-danger-hover"
                />
              </BaseTooltip>
            </div>
          </div>
        </template>
      </ItemCard>

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

<style scoped>
.images-row {
  display: grid;
  grid-template-columns: repeat(v-bind(imagesPerRow), 1fr);
  gap: 8px;
  position: relative;
}
</style>
