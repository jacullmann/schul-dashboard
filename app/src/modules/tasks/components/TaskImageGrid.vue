<script setup lang="ts">
import { computed } from 'vue';
import { FileText, PieChart, Table } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { useLongPress } from '@/common/composables/useLongPress';
import { useAddedEntrance } from '@/modules/tasks/composables/useAddedEntrance';
import { isPdf, previewUrl, type Attachment } from '@/api/files';

const props = defineProps<{
  images: Attachment[];
  itemId: string;
}>();

const emit = defineEmits<{
  (e: 'open-viewer', index: number): void;
  (e: 'context-menu', event: MouseEvent, img: Attachment): void;
}>();

const { t } = useI18n();

const { isEntering, entranceStyle, handleEntranceEnd } = useAddedEntrance(
  computed(() => props.images.map((img) => img.id)),
);

const DOCUMENT_BADGES = {
  docx: {
    label: 'DOCX',
    icon: FileText,
    background: 'from-blue-400 to-indigo-800',
  },
  pptx: {
    label: 'PPTX',
    icon: PieChart,
    background: 'from-orange-400 to-rose-700',
  },
  xlsx: {
    label: 'XLSX',
    icon: Table,
    background: 'from-lime-400 to-green-800',
  },
} as const;
const PDF_BADGE = { label: 'PDF', icon: FileText } as const;
const FALLBACK_BACKGROUND = 'from-gray-500 to-gray-700';

const documentBadge = (img: Attachment) =>
  DOCUMENT_BADGES[img.format as keyof typeof DOCUMENT_BADGES] ?? null;

const fileBadge = (img: Attachment) =>
  isPdf(img) ? PDF_BADGE : documentBadge(img);

// One hold is tracked for the whole row and resolved to a tile from the event
// target, so the tiles stay plain markup instead of a component each.
const { handlers: longPressHandlers } = useLongPress(
  (event) => {
    const tile = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      '[data-image-index]',
    );

    if (!tile) return;

    const img = props.images[Number(tile.dataset.imageIndex)];

    if (img) emit('context-menu', event, img);
  },
  {
    // Only tiles own a menu; the gaps between them belong to the page.
    within: '[data-image-index]',
    grow: '[data-image-index]',
  },
);
</script>

<template>
  <!-- Columns follow the room the grid gets, not the window, which the
       sidebar shares. -->
  <div class="@container">
    <div
      class="grid grid-cols-2 gap-1 @md:grid-cols-3 @2xl:grid-cols-4"
      :data-task-images="itemId"
      v-on="longPressHandlers"
    >
      <div
        v-for="(img, idx) in images"
        :key="img.id"
        :data-image-index="idx"
        class="long-press-target relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-sm border-none bg-black/[0.12] select-none"
        :class="{ 'animate-enter': isEntering(img.id) }"
        :style="entranceStyle(img.id)"
        @animationend="handleEntranceEnd($event, img.id)"
      >
        <button
          type="button"
          class="img-clickable w-full h-full cursor-pointer bg-transparent block touch-target"
          @click.stop="$emit('open-viewer', idx)"
        >
          <img
            v-if="previewUrl(img)"
            :src="previewUrl(img) ?? undefined"
            class="block h-full w-full object-cover [pointer-events:none]"
            loading="lazy"
            draggable="false"
            :alt="t('common.preview')"
          />
          <span
            v-else
            class="flex flex-col items-center justify-center w-full h-full text-white p-3 text-center select-none bg-gradient-to-br"
            :class="documentBadge(img)?.background ?? FALLBACK_BACKGROUND"
          >
            <component
              :is="fileBadge(img)?.icon ?? FileText"
              :size="32"
              class="mb-1.5 drop-shadow-md opacity-90"
            />
            <span class="text-sm font-bold uppercase">{{ img.format }}</span>
            <span
              class="text-xs text-white opacity-75 max-w-full truncate px-1"
              :title="img.name ?? undefined"
              >{{ img.name || t('tasks.images.document') }}</span
            >
          </span>
        </button>

        <div
          v-if="fileBadge(img) && previewUrl(img)"
          class="absolute top-1 left-1 flex items-center gap-1.5 bg-black/40 border border-white/10 text-white p-1.5 pr-2 rounded-md text-sm/4 font-semibold select-none pointer-events-none backdrop-blur-sm"
        >
          <component :is="fileBadge(img)?.icon" :size="16" class="text-white" />
          <span>{{ fileBadge(img)?.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
