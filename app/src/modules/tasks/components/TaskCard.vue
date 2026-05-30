<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue';
import { useI18n } from 'vue-i18n';
import type { HwItem } from '@/modules/tasks/composables/useTasks';
import ItemCard from './ItemCard.vue';
import TaskCardDescription from './TaskCardDescription.vue';
import TaskCardImages from './TaskCardImages.vue';
import TaskCardNote from './TaskCardNote.vue';

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
  MessageSquarePlus,
} from '@lucide/vue';

const props = defineProps<{
  item: HwItem;
  index: number;
  user: any;
  tab: string;
  isChecked: boolean;
  isPinned: boolean;
  isExpanded: boolean;
  isRevealed: boolean;
  imagesPerRow: number;
  isMobile: boolean;
  elapsedLoadTime: number;
  highlighted: boolean;
  showOldEntries: boolean;
  isOpenMenu: boolean;
  noteEditContent: string;
  editingNoteForId: string | null;
  savingNote: boolean;
  canEditNote: boolean;
  canEdit: (createdBy: string) => boolean;
  canDelete: (createdBy: string) => boolean;
  canDeleteImage: (itemCreatedBy: string, imgCreatedBy: string) => boolean;
  makeThumb: (id: string) => string;
  getSubjectName: (subject: string) => string;
  getTypeLabel: (type: string) => string;
}>();

const emit = defineEmits<{
  (e: 'toggle-check'): void;
  (e: 'toggle-pin'): void;
  (e: 'toggle-description'): void;
  (e: 'reveal-images'): void;
  (e: 'swipe'): void;
  (e: 'menu-action', action: string): void;
  (e: 'open-menu'): void;
  (e: 'close-menu'): void;
  (e: 'show-info'): void;
  (e: 'image-drop', files: File[]): void;
  (e: 'open-image-viewer', index: number): void;
  (e: 'image-context-menu', event: MouseEvent, img: any): void;
  (e: 'edit-note-start'): void;
  (e: 'edit-note-cancel'): void;
  (e: 'edit-note-save'): void;
  (e: 'edit-note-delete'): void;
  (e: 'update:noteEditContent', val: string): void;
}>();

const { t } = useI18n();

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

function handleCardMenuClick(event: MouseEvent) {
  if (props.isOpenMenu) {
    emit('close-menu');
    menuCoords.value = null;
  } else {
    menuCoords.value = { x: event.clientX, y: event.clientY };
    emit('open-menu');
  }
}

function handleCardContextMenu(event: MouseEvent) {
  menuCoords.value = { x: event.clientX, y: event.clientY };
  emit('open-menu');
}

function handleItemDoubleClick(event: MouseEvent) {
  if (!props.user) return;
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

  emit('toggle-check');
}

watch(
  () => props.isOpenMenu,
  (newVal) => {
    if (!newVal) {
      menuCoords.value = null;
      menuRef.value = null;
    }
  },
);
</script>

<template>
  <ItemCard
    :id="'item-' + item.id"
    :is-collapsed="isChecked"
    :highlighted="highlighted"
    :title="item.title"
    :swipeable="true"
    :swipe-action="showOldEntries ? 'keep' : 'archive'"
    @swiped="$emit('swipe')"
    @dblclick="handleItemDoubleClick($event)"
    @contextmenu.prevent.stop="handleCardContextMenu($event)"
    @menu-click="handleCardMenuClick($event)"
    @files-dropped="(files: File[]) => $emit('image-drop', files)"
  >
    <template #checkbox>
      <BaseCheckbox
        v-if="user"
        :checked="isChecked"
        @change="$emit('toggle-check')"
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
          v-if="isPinned"
          variant="ghost"
          size="sm"
          :icon="Pin"
          icon-classes="fill-current"
          @click.stop="$emit('toggle-pin')"
        />
      </BaseTooltip>
    </template>

    <template #menu>
      <Teleport to="body" :disabled="isMobile">
        <BaseMenu
          :open="isOpenMenu"
          @close="$emit('close-menu')"
          :ref="
            (el: any) => {
              if (el && isOpenMenu) menuRef = el.menuEl;
            }
          "
          :class="!isMobile ? 'fixed! z-[10000]! min-w-[180px]' : ''"
          :style="!isMobile ? itemMenuStyles : undefined"
          @click.stop
        >
          <BaseMenuButton
            @click="$emit('menu-action', 'images')"
            :icon="Upload"
          >
            {{ t('tasks.list.items.menu.upload_images') }}
          </BaseMenuButton>

          <BaseMenuButton
            v-if="canEdit(item.createdBy)"
            @click="$emit('menu-action', 'edit')"
            :icon="Pencil"
          >
            {{ t('common.buttons.edit') }}
          </BaseMenuButton>

          <BaseMenuButton
            v-if="canEditNote && !item.editorNote"
            @click="$emit('menu-action', 'addNote')"
            :icon="MessageSquarePlus"
          >
            {{ t('tasks.list.items.menu.add_note') }}
          </BaseMenuButton>

          <BaseMenuDivider />

          <BaseMenuButton
            @click="$emit('menu-action', 'pin')"
            :icon="Pin"
            :iconClasses="isPinned ? 'fill-current' : ''"
          >
            {{
              isPinned
                ? t('tasks.list.items.menu.unpin')
                : t('tasks.list.items.menu.pin')
            }}
          </BaseMenuButton>

          <BaseMenuButton
            @click="$emit('menu-action', 'archive')"
            :icon="showOldEntries ? ArchiveRestore : Archive"
          >
            {{
              showOldEntries
                ? t('tasks.list.items.menu.unarchive')
                : t('tasks.list.items.menu.archive')
            }}
          </BaseMenuButton>

          <BaseMenuDivider />

          <BaseMenuButton @click="$emit('menu-action', 'share')" :icon="Send">
            {{ t('tasks.list.items.menu.share') }}
          </BaseMenuButton>

          <BaseMenuButton
            @click="
              $emit('close-menu');
              $emit('show-info');
            "
            :icon="Info"
          >
            {{ t('tasks.list.items.menu.info') }}
          </BaseMenuButton>

          <BaseMenuDivider />

          <BaseMenuButton
            title="Melden"
            @click="$emit('menu-action', 'report')"
            :icon="Flag"
          >
            {{ t('tasks.list.items.menu.report.name') }}
          </BaseMenuButton>

          <BaseMenuButton
            variant="danger"
            v-if="canDelete(item.createdBy)"
            @click="$emit('menu-action', 'delete')"
            :icon="Trash2"
          >
            {{ t('common.buttons.delete') }}
          </BaseMenuButton>
        </BaseMenu>
      </Teleport>
    </template>

    <template #body v-if="item.description">
      <TaskCardDescription
        :description="item.description"
        :is-expanded="isExpanded"
        @toggle="$emit('toggle-description')"
      />
    </template>

    <template
      #content-after
      v-if="
        (item.images && item.images.length) ||
        item.editorNote ||
        editingNoteForId === item.id
      "
    >
      <TaskCardImages
        v-if="item.images && item.images.length"
        :images="item.images"
        :item-id="item.id"
        :images-per-row="imagesPerRow"
        :is-revealed="isRevealed"
        :make-thumb="makeThumb"
        @open-viewer="$emit('open-image-viewer', $event)"
        @context-menu="(event, img) => $emit('image-context-menu', event, img)"
        @reveal="$emit('reveal-images')"
      />

      <TaskCardNote
        v-if="item.editorNote || editingNoteForId === item.id"
        :note="item.editorNote"
        :editing="editingNoteForId === item.id"
        :saving="savingNote"
        :can-edit="canEditNote"
        :model-value="noteEditContent"
        @update:model-value="$emit('update:noteEditContent', $event)"
        @edit-start="$emit('edit-note-start')"
        @edit-cancel="$emit('edit-note-cancel')"
        @edit-save="$emit('edit-note-save')"
        @delete="$emit('edit-note-delete')"
      />
    </template>
  </ItemCard>
</template>
