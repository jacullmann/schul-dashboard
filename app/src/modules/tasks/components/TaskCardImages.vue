<script setup lang="ts">
import { FileText, PieChart, Table } from '@lucide/vue';
import { computed } from 'vue';

const props = defineProps<{
  images: any[];
  itemId: string;
  imagesPerRow: number;
  isRevealed: boolean;
  makeThumb: (id: string) => string;
}>();

const emit = defineEmits<{
  (e: 'open-viewer', index: number): void;
  (e: 'context-menu', event: MouseEvent, img: any): void;
  (e: 'reveal'): void;
}>();

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
    return props.makeThumb(img.metadata.thumbnailId);
  }
  return props.makeThumb(img.publicId);
};

const displayedImages = computed(() => {
  if (props.isRevealed) {
    return props.images;
  }
  return props.images.slice(0, props.imagesPerRow);
});
</script>

<template>
  <div class="images-row mt-2 mb-2">
    <div
      v-for="(img, idx) in displayedImages"
      :key="img.publicId"
      class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border-none bg-black/[0.12] select-none"
      @contextmenu.prevent.stop="$emit('context-menu', $event, img)"
    >
      <button
        type="button"
        class="img-clickable w-full h-full cursor-pointer bg-transparent block"
        @click.stop="$emit('open-viewer', idx)"
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
          !isRevealed &&
          idx === imagesPerRow - 1 &&
          images.length > imagesPerRow
        "
        class="img-overlay absolute flex inset-0 items-center justify-center rounded-md cursor-pointer z-10"
        @click.stop.prevent="$emit('reveal')"
        @contextmenu.stop.prevent
      >
        <span
          class="overlay-blur absolute inset-0 bg-[#8886] rounded-md backdrop-blur-sm"
        ></span>
        <span class="text-4xl font-medium text-white z-10"
          >+{{ images.length - (imagesPerRow - 1) }}</span
        >
      </button>
    </div>
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
