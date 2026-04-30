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
  imageMenu,
  closeImageMenu,
  triggerImageUpload,
  triggerImageDrop,
  triggerImageDelete,
  openImageViewer: openImageViewerLocal,
  shareItem,
  highlightedItemId,
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
        class="max-w-36"
      />

      <ArchiveSwitch v-model="showOldEntries" />

      <BaseTooltip content="New Entry" placement="bottom">
        <BaseButton
          variant="action"
          :aria-label="t('school.tasks.itemForm.newEntry')"
          @click="openItemForm()"
          :icon="Plus"
          icon-classes="size-6"
        />
      </BaseTooltip>
    </BaseRow>

    <div class="flex flex-col gap-3 mt-4">
      <ItemSkeleton v-if="loading && initialLoad" :count="5" :image-count="2" />

      <ItemCard
        v-else
        v-for="(item, index) in visibleItems"
        :key="item.id"
        :id="'item-' + item.id"
        class="animate-fade-up"
        :class="{ 'z-50': openMenuId === item.id }"
        :style="{ animationDelay: `${index * 0.075}s`, animationFillMode: 'both' }"
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
            :content="t('school.tasks.items.menu.unpin')"
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
              :icon="Pin"
              :iconClasses="isPinned(item.id) ? 'fill-current' : ''"
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
            user?.role === 'superadmin'
          "
        >
          <div v-if="item.images && item.images.length">
            <div class="images-row mt-2 mb-1">
              <template v-if="!isRevealed(item.id)">
                <div
                  v-for="(img, idx) in item.images.slice(0, imagesPerRow)"
                  :key="img.publicId"
                  class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border-none bg-black/[0.12] select-none"
                  @contextmenu.prevent="
                    handleImageContextMenu($event, item, img)
                  "
                >
                  <button
                    type="button"
                    class="img-clickable w-full h-full cursor-pointer bg-transparent block"
                    @click.stop="openImageViewerForItem(item, idx)"
                  >
                    <img
                      :src="img.thumbUrl || makeThumb(img.url || '')"
                      class="block h-full w-full object-cover [pointer-events:none]"
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
                    class="img-overlay absolute flex inset-0 items-center justify-center rounded-md cursor-pointer z-10"
                    @click.stop.prevent="revealImages(item.id)"
                    @contextmenu.stop.prevent
                  >
                    <span class="overlay-blur absolute inset-0 bg-[#8886] rounded-md backdrop-blur-sm"></span>
                    <span class="text-4xl font-medium text-white z-10"
                      >+{{ item.images.length - (imagesPerRow - 1) }}</span
                    >
                  </button>
                </div>
              </template>

              <template v-else>
                <div
                  v-for="(img, idx) in item.images"
                  :key="img.publicId"
                  class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border-none bg-black/[0.12] select-none"
                  @contextmenu.prevent="
                    handleImageContextMenu($event, item, img)
                  "
                >
                  <button
                    type="button"
                    class="img-clickable w-full h-full cursor-pointer bg-transparent block"
                    @click.stop="openImageViewerForItem(item, idx)"
                  >
                    <img
                      :src="img.thumbUrl || makeThumb(img.url || '')"
                      class="block h-full w-full object-cover [pointer-events:none]"
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
            class="note-section mt-2 pt-2 border-t border-surface-border flex justify-between"
          >
            <div class="w-full">
              <div class="text-on-ghost text-base font-bold mb-1">
                {{ t('school.tasks.notes.note') }}
              </div>

              <div
                v-if="editingNoteForId !== item.id"
                class="text-on-ghost text-base whitespace-pre-wrap break-words"
              >
                <span v-if="item.editorNote">{{ item.editorNote }}</span>
                <span
                  v-else
                  class="note-placeholder text-on-ghost-muted italic"
                  >{{ t('school.tasks.notes.noNotes') }}</span
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
                    {{ t('global.buttons.cancel') }}
                  </BaseButton>
                  <BaseButton
                    @click.stop="saveNote(item.id)"
                    :disabled="savingNote"
                    variant="action"
                    :loading="savingNote"
                  >
                    {{ t('global.buttons.save') }}
                  </BaseButton>
                </BaseRow>
              </div>
            </div>

            <BaseTooltip
              v-if="editingNoteForId !== item.id && canEditNote()"
              :content="t('global.buttons.edit')"
              placement="bottom"
            >
              <BaseButton
                @click.stop="startEditNote(item)"
                variant="ghost"
                :icon="Pencil"
                size="sm"
              />
            </BaseTooltip>
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
          >{{ t('global.buttons.showMore') }}</BaseButton
        >
        <BaseButton v-if="visibleCount > 5" variant="ghost" @click="showLess">{{
          t('global.buttons.showLess')
        }}</BaseButton>
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
.images-row {
  display: grid;
  grid-template-columns: repeat(v-bind(imagesPerRow), 1fr);
  gap: 8px;
  position: relative;
}
</style>
