import { useModalStore } from '@/stores/modalStore';
import type { ImageItem } from '@/modules/tasks/types';

export function useImageViewer() {
  const store = useModalStore();

  return {
    isImageViewerOpen: store.imageViewerOpen as Readonly<
      typeof store.imageViewerOpen
    >,
    imageViewerImages: store.imageViewerImages as Readonly<
      typeof store.imageViewerImages
    >,
    imageViewerInitialIndex: store.imageViewerInitialIndex,
    openImageViewer: (
      images: ImageItem[],
      initialIndex?: number,
      origin?: ((index: number) => HTMLElement | null) | null,
    ) => store.openImageViewer(images, initialIndex, origin),
    closeImageViewer: store.closeImageViewer,
  };
}
